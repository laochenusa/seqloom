import fs from 'node:fs/promises';
import path from 'node:path';
import * as fontkit from 'fontkit';
import {assert, validateShape} from './schema.mjs';
import {safeRelative, readJson, run} from './io.mjs';
import {ffprobe, ffmpeg} from './runtime.mjs';

export async function probe(file, signal, countFrames = false) {
  const {stdout} = await run(ffprobe, ['-v', 'error', ...(countFrames ? ['-count_frames'] : []), '-show_streams', '-show_format', '-of', 'json', file], {signal});
  return JSON.parse(stdout);
}
const unique = (items, field) => assert(new Set(items.map(i => i.id)).size === items.length, 'DUPLICATE_ID', 'IDs must be unique.', field);
export function validatePlan(m, t, c) {
  validateShape('manifest', m); validateShape('timeline', t); validateShape('captions', c);
  const {width: w, height: h, durationFrames: total} = m.video;
  assert((w === 1920 && h === 1080) || (w === 1080 && h === 1920), 'VIDEO_SIZE', 'Use 1920x1080 or 1080x1920.');
  assert(m.output.fileName.toLowerCase().endsWith('.mp4') && !m.output.fileName.includes('/'), 'OUTPUT_NAME', 'The output name must be a single MP4 file name.'); safeRelative(m.output.fileName);
  safeRelative(m.audio.path);
  unique(t.scenes, 'scenes'); unique(c.cues, 'captions');
  let end = 0;
  t.scenes.forEach((s, index) => {
    safeRelative(s.path);
    assert(s.startFrame === end && s.endFrame > s.startFrame, 'TIMELINE_GAP', `Scene ${s.id} is not continuous or has an invalid duration.`, `scenes/${index}`);
    end = s.endFrame;
    assert(s.transitionIn.durationFrames <= s.endFrame - s.startFrame && (index !== 0 || s.transitionIn.type === 'cut'), 'TRANSITION_INVALID', `Scene ${s.id} has an invalid transition.`);
    if (s.type === 'video') {
      assert(s.sourceEndFrame - s.sourceStartFrame === s.endFrame - s.startFrame, 'SOURCE_RANGE', `Scene ${s.id} has a mismatched source duration.`);
    }
  });
  assert(end === total, 'TIMELINE_END', 'The timeline end does not match the total frame count.');
  end = 0;
  c.cues.forEach(q => {
    assert(q.text.trim() && !/[\r\t\x00-\x09\x0b-\x1f]/.test(q.text), 'CAPTION_TEXT', `Caption ${q.id} contains empty text or unsupported control characters.`);
    assert(q.text.split('\n').length <= 2 && q.text.split('\n').every(l => l.trim()), 'CAPTION_LINES', `Caption ${q.id} must have one or two non-empty lines.`);
    assert(q.startFrame >= end && q.endFrame > q.startFrame && q.endFrame <= total, 'CAPTION_TIME', `Caption ${q.id} overlaps or is outside the timeline.`);
    end = q.endFrame;
  });
  const st = m.subtitles, b = st.box;
  assert(b.x + b.width <= w && b.y + b.height <= h && st.lineHeightPx >= st.fontSizePx, 'CAPTION_BOX', 'The caption box is outside the frame or its line height is insufficient.');
  const wm = m.branding.watermark;
  if (wm.enabled) assert(wm.startFrame < wm.endFrame && wm.endFrame <= total && wm.x + wm.widthPx <= w, 'WATERMARK_RANGE', 'The watermark range is invalid.');
  return {manifest: m, scenes: t.scenes, cues: c.cues};
}

export async function validatePackage(root, files, {signal, onProgress = () => {}} = {}) {
  const requireFile = p => {safeRelative(p); assert(files.includes(p), 'FILE_MISSING', `Missing file: ${p}`, p); return path.join(root, p);};
  const m = await readJson(requireFile('manifest.json')); validateShape('manifest', m);
  const t = await readJson(requireFile(m.timelinePath));
  const c = await readJson(requireFile(m.captionsPath));
  const plan = validatePlan(m, t, c);
  const audioPath = requireFile(m.audio.path);
  assert(/\.wav$/i.test(audioPath), 'AUDIO_FORMAT', 'Final audio must be PCM WAV, 48kHz, stereo.');
  const fontPath = requireFile(m.subtitles.fontPath);
  assert(/\.(ttf|otf)$/i.test(fontPath), 'FONT_FORMAT', 'Supply a TTF or OTF font.');
  const font = fontkit.openSync(fontPath);
  assert(font.unitsPerEm, 'FONT_FORMAT', 'Font collections are unsupported; supply a single font file.');
  for (const q of c.cues) {
    const style = m.subtitles, lines = q.text.split('\n'), scale = style.fontSizePx / font.unitsPerEm;
    for (const line of lines) {
      assert([...line].every(ch => font.hasGlyphForCodePoint(ch.codePointAt(0))), 'FONT_GLYPH', `The font is missing characters in caption ${q.id}.`);
      const layout = font.layout(line);
      const advance = layout.positions.reduce((sum, p) => sum + p.xAdvance, 0) * scale;
      assert(advance + 2 * style.outlineWidthPx <= style.box.width, 'CAPTION_OVERFLOW', `Caption ${q.id} is too wide; wrap or adjust its layout upstream.`);
      const actualHeight = (font.ascent - font.descent) * scale;
      assert(actualHeight <= style.lineHeightPx, 'CAPTION_LINE_HEIGHT', `The font height exceeds the line height for caption ${q.id}.`);
    }
    assert(lines.length * style.lineHeightPx + 2 * style.outlineWidthPx <= style.box.height, 'CAPTION_OVERFLOW', `Caption ${q.id} is too tall.`);
  }
  const media = new Map();
  const referenced = [...new Set([m.audio.path, ...t.scenes.map(s => s.path), ...(m.branding.watermark.enabled ? [m.branding.watermark.path] : [])])];
  for (let i = 0; i < referenced.length; i++) {
    const name = referenced[i], file = requireFile(name);
    onProgress({stage: 'Checking media', progress: i / referenced.length * .9, detail: name});
    const p = await probe(file, signal, /\.mp4$/i.test(name));
    await run(ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'], {signal});
    media.set(name, p);
  }
  const audio = media.get(m.audio.path).streams.find(s => s.codec_type === 'audio');
  assert(audio && Number(audio.sample_rate) === 48000 && audio.channels === 2 && audio.codec_name.startsWith('pcm_'), 'AUDIO_FORMAT', 'Final audio must be PCM WAV, 48kHz, stereo.');
  const duration = Number(audio.duration ?? media.get(m.audio.path).format.duration);
  assert(Number.isFinite(duration) && Math.round(duration * 48000) === m.video.durationFrames * 1600, 'AUDIO_DURATION', 'Final audio must cover the complete timeline exactly (1600 samples per frame). Prepare all joins and silence upstream.');
  for (const s of t.scenes) {
    const streams = media.get(s.path).streams, v = streams.find(v => v.codec_type === 'video');
    assert(v && v.width > 0 && v.height > 0 && v.width * v.height <= 40_000_000, 'MEDIA_DIMENSIONS', `Invalid or excessive media dimensions: ${s.path}`);
    if (s.type === 'image') assert(/\.(png|jpe?g)$/i.test(s.path) && ['png', 'mjpeg'].includes(v.codec_name), 'IMAGE_FORMAT', `Unsupported image format: ${s.path}`);
    else {
      assert(/\.mp4$/i.test(s.path) && v.codec_name === 'h264' && ['30/1', '60/2'].includes(v.avg_frame_rate) && v.r_frame_rate === v.avg_frame_rate, 'VIDEO_FORMAT', `Video must be H.264 with a constant 30fps: ${s.path}`);
      assert(Number(v.nb_read_frames) >= s.sourceEndFrame, 'VIDEO_TOO_SHORT', `Source video is too short: ${s.path}`);
    }
  }
  const wm = m.branding.watermark;
  if (wm.enabled) {
    const v = media.get(wm.path).streams.find(s => s.codec_type === 'video');
    assert(/\.png$/i.test(wm.path) && v?.codec_name === 'png' && wm.y + wm.widthPx * v.height / v.width <= m.video.height, 'WATERMARK_SIZE', 'The watermark must be a PNG and fit inside the frame.');
  }
  onProgress({stage: 'Checks passed', progress: 1});
  return {...plan, audioDurationSeconds: duration};
}
