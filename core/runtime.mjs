import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const binDir = path.join(APP_ROOT, 'node_modules', '@remotion', 'compositor-win32-x64-msvc');
export const ffmpeg = path.join(APP_ROOT, 'runtime', 'ffmpeg.exe');
export const ffprobe = path.join(binDir, 'ffprobe.exe');
export function browserPath() {
  const result = path.join(APP_ROOT, 'runtime', 'chrome', 'chrome-headless-shell.exe');
  if (!fs.existsSync(result)) throw new Error('The local rendering runtime is missing. Use the complete Seqloom distribution.');
  return result;
}
