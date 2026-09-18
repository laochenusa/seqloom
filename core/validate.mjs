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
const unique = (items, field) => assert(new Set(items.map(i => i.id)).size === items.length, 'DUPLICATE_ID', '编号必须唯一', field);
export function validatePlan(m, t, c) {
  validateShape('manifest', m); validateShape('timeline', t); validateShape('captions', c);
  const {width: w, height: h, durationFrames: total} = m.video;
  assert((w === 1920 && h === 1080) || (w === 1080 && h === 1920), 'VIDEO_SIZE', '只支持 1920×1080 或 1080×1920');
  assert(m.output.fileName.toLowerCase().endsWith('.mp4') && !m.output.fileName.includes('/'), 'OUTPUT_NAME', '输出名必须为单个 MP4 文件名'); safeRelative(m.output.fileName);
  safeRelative(m.audio.path);
  unique(t.scenes, 'scenes'); unique(c.cues, 'captions');
  let end = 0;
  t.scenes.forEach((s, index) => {
    safeRelative(s.path);
    assert(s.startFrame === end && s.endFrame > s.startFrame, 'TIMELINE_GAP', `镜头 ${s.id} 不连续或时长无效`, `scenes/${index}`);
    end = s.endFrame;
    assert(s.transitionIn.durationFrames <= s.endFrame - s.startFrame && (index !== 0 || s.transitionIn.type === 'cut'), 'TRANSITION_INVALID', `镜头 ${s.id} 转场无效`);
    if (s.type === 'video') {
      assert(s.sourceEndFrame - s.sourceStartFrame === s.endFrame - s.startFrame, 'SOURCE_RANGE', `镜头 ${s.id} 视频截取长度不一致`);
    }
  });
  assert(end === total, 'TIMELINE_END', '时间线结束帧与总帧数不一致');
  end = 0;
  c.cues.forEach(q => {
    assert(q.text.trim() && !/[\r\t\x00-\x09\x0b-\x1f]/.test(q.text), 'CAPTION_TEXT', `字幕 ${q.id} 含不支持的控制字符`);
    assert(q.text.split('\n').length <= 2 && q.text.split('\n').every(l => l.trim()), 'CAPTION_LINES', `字幕 ${q.id} 需要非空的至多两行`);
    assert(q.startFrame >= end && q.endFrame > q.startFrame && q.endFrame <= total, 'CAPTION_TIME', `字幕 ${q.id} 重叠或超出范围`);
    end = q.endFrame;
  });
  const st = m.subtitles, b = st.box;
  assert(b.x + b.width <= w && b.y + b.height <= h && st.lineHeightPx >= st.fontSizePx, 'CAPTION_BOX', '字幕框超出画面或行高不足');
  const wm = m.branding.watermark;
  if (wm.enabled) assert(wm.startFrame < wm.endFrame && wm.endFrame <= total && wm.x + wm.widthPx <= w, 'WATERMARK_RANGE', '水印范围无效');
  return {manifest: m, scenes: t.scenes, cues: c.cues};
}

export async function validatePackage(root, files, {signal, onProgress = () => {}} = {}) {
  const requireFile = p => {safeRelative(p); assert(files.includes(p), 'FILE_MISSING', `缺少文件：${p}`, p); return path.join(root, p);};
  const m = await readJson(requireFile('manifest.json')); validateShape('manifest', m);
  const t = await readJson(requireFile(m.timelinePath));
  const c = await readJson(requireFile(m.captionsPath));
  const plan = validatePlan(m, t, c);
  const audioPath = requireFile(m.audio.path);
  assert(/\.wav$/i.test(audioPath), 'AUDIO_FORMAT', 'Final audio must be PCM WAV, 48kHz, stereo.');
  const fontPath = requireFile(m.subtitles.fontPath);
  assert(/\.(ttf|otf)$/i.test(fontPath), 'FONT_FORMAT', '请提供 TTF 或 OTF 字体');
  const font = fontkit.openSync(fontPath);
  assert(font.unitsPerEm, 'FONT_FORMAT', '不支持字体集合，请提供单字体文件');
  for (const q of c.cues) {
    const style = m.subtitles, lines = q.text.split('\n'), scale = style.fontSizePx / font.unitsPerEm;
    for (const line of lines) {
      assert([...line].every(ch => font.hasGlyphForCodePoint(ch.codePointAt(0))), 'FONT_GLYPH', `字体缺少字幕 ${q.id} 的字符`);
      const layout = font.layout(line);
      const advance = layout.positions.reduce((sum, p) => sum + p.xAdvance, 0) * scale;
      assert(advance + 2 * style.outlineWidthPx <= style.box.width, 'CAPTION_OVERFLOW', `字幕 ${q.id} 太宽，请上游换行或修改排版`);
      const actualHeight = (font.ascent - font.descent) * scale;
      assert(actualHeight <= style.lineHeightPx, 'CAPTION_LINE_HEIGHT', `字体实际高度超出字幕 ${q.id} 行高`);
    }
    assert(lines.length * style.lineHeightPx + 2 * style.outlineWidthPx <= style.box.height, 'CAPTION_OVERFLOW', `字幕 ${q.id} 太高`);
  }
  const media = new Map();
  const referenced = [...new Set([m.audio.path, ...t.scenes.map(s => s.path), ...(m.branding.watermark.enabled ? [m.branding.watermark.path] : [])])];
  for (let i = 0; i < referenced.length; i++) {
    const name = referenced[i], file = requireFile(name);
    onProgress({stage: '检查素材', progress: i / referenced.length * .9, detail: name});
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
    assert(v && v.width > 0 && v.height > 0 && v.width * v.height <= 40_000_000, 'MEDIA_DIMENSIONS', `素材尺寸无效或过大：${s.path}`);
    if (s.type === 'image') assert(/\.(png|jpe?g)$/i.test(s.path) && ['png', 'mjpeg'].includes(v.codec_name), 'IMAGE_FORMAT', `图片格式不支持：${s.path}`);
    else {
      assert(/\.mp4$/i.test(s.path) && v.codec_name === 'h264' && ['30/1', '60/2'].includes(v.avg_frame_rate) && v.r_frame_rate === v.avg_frame_rate, 'VIDEO_FORMAT', `视频须为 H.264、固定 30fps：${s.path}`);
      assert(Number(v.nb_read_frames) >= s.sourceEndFrame, 'VIDEO_TOO_SHORT', `视频素材不足：${s.path}`);
    }
  }
  const wm = m.branding.watermark;
  if (wm.enabled) {
    const v = media.get(wm.path).streams.find(s => s.codec_type === 'video');
    assert(/\.png$/i.test(wm.path) && v?.codec_name === 'png' && wm.y + wm.widthPx * v.height / v.width <= m.video.height, 'WATERMARK_SIZE', '水印必须为 PNG 且不能超出画面');
  }
  onProgress({stage: '检查通过', progress: 1});
  return {...plan, audioDurationSeconds: duration};
}
