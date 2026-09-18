import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import {selectComposition, renderMedia, makeCancelSignal} from '@remotion/renderer';
import {APP_ROOT, browserPath, ffmpeg, binDir} from './runtime.mjs';
import {extractZip, verifyChecksums, run, sha256} from './io.mjs';
import {validatePackage, probe} from './validate.mjs';
import {assert, PackageError} from './schema.mjs';

function cancelled(signal) {if (signal?.aborted) throw new PackageError('CANCELLED', 'Task cancelled.');}
export async function inspect(zipPath, cacheRoot, options = {}) {
  const started = Date.now();
  const taskDir = await fs.mkdtemp(path.join(await fs.mkdir(cacheRoot, {recursive: true}).then(() => cacheRoot), 'task-'));
  const root = path.join(taskDir, 'input');
  options.onProgress?.({stage: 'Reading package', progress: 0});
  const files = await extractZip(zipPath, root, options.signal);
  cancelled(options.signal);
  await verifyChecksums(root, files);
  const plan = await validatePackage(root, files, options);
  const session = {taskDir, root, files, plan, zipPath, sourceHash: await sha256(zipPath), checkSeconds: (Date.now() - started) / 1000};
  await fs.writeFile(path.join(taskDir, 'session.json'), JSON.stringify(session, null, 2));
  return session;
}

async function assetServer(root, files) {
  const allowed = new Set(files);
  const server = http.createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(1));
      if (!allowed.has(name)) {res.writeHead(404); res.end(); return;}
      const file = path.join(root, name), stat = await fs.stat(file);
      const types = {'.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.otf': 'font/otf'};
      const headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': types[path.extname(name).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes'};
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      let start = 0, end = stat.size - 1;
      if (range) {
        start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end;
        if (start > end) {res.writeHead(416); res.end(); return;}
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = end - start + 1;
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(file, {start, end});
      stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
    } catch {res.writeHead(500); res.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url: `http://127.0.0.1:${server.address().port}/`, close: () => {server.closeAllConnections(); server.close();}};
}

export function audioArgs(session, picture, output) {
  const m = session.plan.manifest;
  // The package supplies the complete soundtrack. Never mix embedded clip audio,
  // offset speech, trim, pad, or synthesize intro/outro joins here.
  return ['-v', 'error', '-nostdin', '-i', picture, '-i', path.join(session.root, m.audio.path),
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-n', output];
}

export async function render(session, outputRoot, {signal, onProgress = () => {}} = {}) {
  cancelled(signal);
  const start = Date.now(), m = session.plan.manifest;
  // Recheck the immutable input snapshot before retrying or rendering.
  await verifyChecksums(session.root, session.files);
  await fs.mkdir(outputRoot, {recursive: true});
  const title = m.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').slice(0, 60) || 'video';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(outputRoot, `${title}_${stamp}_${crypto.randomBytes(3).toString('hex')}`);
  await fs.mkdir(outputDir);
  const work = await fs.mkdtemp(path.join(session.taskDir, 'render-'));
  const picture = path.join(work, 'picture.mp4'), pending = path.join(outputDir, '.incomplete.mp4');
  let server, peakRssBytes = process.memoryUsage().rss;
  const monitor = setInterval(() => {peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);}, 1000);
  const timings = {};
  try {
    browserPath();
    assert(await fs.stat(path.join(APP_ROOT, 'composition-bundle/index.html')).catch(() => null), 'RUNTIME_MISSING', 'The composition bundle is missing. Reinstall the complete application.');
    const free = await fs.statfs(outputDir).catch(() => null);
    assert(!free || free.bavail * free.bsize > 512 * 1024 ** 2, 'DISK_SPACE', 'The output disk has less than 512 MB available.');
    server = await assetServer(session.root, session.files);
    const inputProps = {plan: session.plan, assetBase: server.url};
    const serveUrl = path.join(APP_ROOT, 'composition-bundle');
    const common = {serveUrl, browserExecutable: browserPath(), binariesDirectory: binDir, inputProps, logLevel: 'error'};
    onProgress({stage: 'Preparing render', progress: .01});
    const composition = await selectComposition({...common, id: 'PackageVideo'});
    cancelled(signal);
    const cancellation = makeCancelSignal();
    const cancel = () => cancellation.cancel(); signal?.addEventListener('abort', cancel, {once: true});
    const pictureStart = Date.now();
    try {
      await renderMedia({...common, composition, codec: 'h264', crf: 18, x264Preset: 'fast', pixelFormat: 'yuv420p', colorSpace: 'bt709', outputLocation: picture, concurrency: Math.max(1, Math.min(4, Math.floor(os.availableParallelism() / 2))), cancelSignal: cancellation.cancelSignal,
        onProgress: p => onProgress({stage: 'Rendering video and captions', progress: .02 + p.progress * .82, detail: `${p.renderedFrames} / ${m.video.durationFrames} frames`})});
    } finally {signal?.removeEventListener('abort', cancel);}
    timings.pictureSeconds = (Date.now() - pictureStart) / 1000;
    cancelled(signal);
    onProgress({stage: 'Combining audio', progress: .86}); const muxStart = Date.now();
    await run(ffmpeg, audioArgs(session, picture, pending), {signal});
    timings.audioMuxSeconds = (Date.now() - muxStart) / 1000;
    onProgress({stage: 'Checking output', progress: .94}); const checkStart = Date.now();
    const p = await probe(pending, signal, true), v = p.streams.find(s => s.codec_type === 'video'), a = p.streams.find(s => s.codec_type === 'audio');
    await fs.writeFile(path.join(outputDir, 'media-inspection.json'), JSON.stringify(p, null, 2));
    assert(v?.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.width === m.video.width && v.height === m.video.height && v.avg_frame_rate === '30/1' && Number(v.nb_read_frames) === m.video.durationFrames, 'OUTPUT_VIDEO_INVALID', 'Output video specifications or frame count do not match.');
    assert(a?.codec_name === 'aac' && a.sample_rate === '48000' && a.channels === 2 && Math.abs(Number(a.duration) - m.video.durationFrames / 30) <= 1 / 30, 'OUTPUT_AUDIO_INVALID', 'Output audio specifications or duration do not match.');
    await run(ffmpeg, ['-v', 'error', '-xerror', '-i', pending, '-f', 'null', '-'], {signal});
    timings.outputCheckSeconds = (Date.now() - checkStart) / 1000;
    cancelled(signal);
    const outputFile = path.join(outputDir, m.output.fileName);
    const report = {status: 'passed', appVersion: '1.0.0-alpha.1', protocolVersion: '1.0', sourceZipSha256: session.sourceHash, outputSha256: await sha256(pending), frames: Number(v.nb_read_frames), durationSeconds: Number(a.duration), width: v.width, height: v.height,
      timings: {...timings, inputCheckSeconds: session.checkSeconds, totalRenderSeconds: (Date.now() - start) / 1000}, engineProcessPeakRssBytes: peakRssBytes, memoryMeasurementScope: 'Node engine process only; browser/encoder excluded', outputBytes: (await fs.stat(pending)).size, fullDecodePassed: true, humanVisualAudioReview: 'not-performed-by-software', plan: session.plan};
    await fs.writeFile(path.join(outputDir, 'production-record.json'), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(outputDir, 'validation-report.txt'), `Technical checks passed\nResolution: ${v.width}×${v.height}\nFrame rate: 30\nFrame count: ${v.nb_read_frames}\nAudio: AAC / 48kHz / stereo\nFull decode: passed\nRender duration: ${report.timings.totalRenderSeconds.toFixed(1)} seconds\nNote: Facts, asset semantics, transcript accuracy and listening quality are not assessed automatically.\n`, 'utf8');
    cancelled(signal);
    await fs.rename(pending, outputFile);
    onProgress({stage: 'Render complete', progress: 1});
    return {outputDir, outputFile, report};
  } catch (e) {
    const error = signal?.aborted ? new PackageError('CANCELLED', 'Task cancelled.') : e;
    await fs.rm(pending, {force: true}).catch(() => {});
    await fs.writeFile(path.join(outputDir, 'failure-record.json'), JSON.stringify({status: error.code === 'CANCELLED' ? 'cancelled' : 'failed', code: error.code || 'UNEXPECTED', message: error.message}, null, 2)).catch(() => {});
    throw error;
  } finally {clearInterval(monitor); server?.close(); await fs.rm(work, {recursive: true, force: true}).catch(() => {});}
}
