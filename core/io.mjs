import fs from 'node:fs/promises';
import {createReadStream, createWriteStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {spawn} from 'node:child_process';
import yauzl from 'yauzl';
import {assert, PackageError} from './schema.mjs';

export function safeRelative(name) {
  assert(typeof name === 'string' && name.length > 0 && name.length < 220 && !/[\\:\x00-\x1f<>"|?*]/.test(name) && !name.startsWith('/'), 'UNSAFE_PATH', `Unsupported package path: ${name}`);
  assert(name.split('/').every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)), 'UNSAFE_PATH', `Unsafe package path: ${name}`);
  return name;
}
export async function sha256(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export function run(exe, args, {signal, onLine, limit = 8_000_000} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new PackageError('CANCELLED', 'Task cancelled.'));
    const child = spawn(exe, args, {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '', settled = false;
    const abort = () => child.kill();
    signal?.addEventListener('abort', abort, {once: true});
    child.stdout.on('data', b => {stdout = (stdout + b.toString()).slice(-limit); onLine?.(b.toString());});
    child.stderr.on('data', b => {stderr = (stderr + b.toString()).slice(-limit);});
    const finish = (error, value) => {if (settled) return; settled = true; signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(value);};
    child.on('error', e => finish(e));
    child.on('close', code => {
      if (signal?.aborted) return finish(new PackageError('CANCELLED', 'Task cancelled.'));
      if (code !== 0) return finish(new PackageError('MEDIA_PROCESS_FAILED', `Media processing failed: ${stderr.slice(-1800) || `Exit code ${code}`}`));
      finish(null, {stdout, stderr});
    });
  });
}
export async function extractZip(zipPath, dest, signal) {
  const stat = await fs.stat(zipPath);
  assert(stat.size < 2 * 1024 ** 3, 'ZIP_TOO_LARGE', 'The compressed package must be smaller than 2 GB.');
  await fs.mkdir(dest, {recursive: true});
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, {lazyEntries: true, validateEntrySizes: true, strictFileNames: true}, (err, zip) => {
      if (err) return reject(new PackageError('ZIP_INVALID', `Cannot read ZIP: ${err.message}`));
      const files = [], seen = new Set(); let total = 0, done = false, count = 0;
      const abort = () => fail(new PackageError('CANCELLED', 'Task cancelled.'));
      const fail = e => {if (done) return; done = true; zip.close(); signal?.removeEventListener('abort', abort); reject(e);};
      signal?.addEventListener('abort', abort, {once: true});
      zip.on('error', fail);
      zip.on('entry', async entry => {
        try {
          if (signal?.aborted) throw new PackageError('CANCELLED', 'Task cancelled.');
          const isDir = entry.fileName.endsWith('/');
          const name = safeRelative(isDir ? entry.fileName.slice(0, -1) : entry.fileName);
          assert(!seen.has(name.toLowerCase()), 'ZIP_DUPLICATE', `Duplicate package entry: ${name}`); seen.add(name.toLowerCase());
          assert(++count <= 10000, 'ZIP_LIMIT', 'Too many package entries.');
          assert(((entry.externalFileAttributes >>> 16) & 0xf000) !== 0xa000, 'ZIP_SYMLINK', 'Symbolic links are not allowed in packages.');
          assert(!(entry.generalPurposeBitFlag & 1), 'ZIP_ENCRYPTED', 'Supply an unencrypted ZIP.');
          total += entry.uncompressedSize;
          assert(total <= 8 * 1024 ** 3 && entry.uncompressedSize <= 2 * 1024 ** 3, 'ZIP_LIMIT', 'The extracted size exceeds the v1 limit.');
          const file = path.join(dest, name);
          if (isDir) await fs.mkdir(file, {recursive: true});
          else {
            await fs.mkdir(path.dirname(file), {recursive: true});
            const stream = await new Promise((res, rej) => zip.openReadStream(entry, (e, s) => e ? rej(e) : res(s)));
            await pipeline(stream, createWriteStream(file, {flags: 'wx'}), {signal}); files.push(name);
          }
          if (!done) zip.readEntry();
        } catch (e) {fail(e);}
      });
      zip.on('end', () => {if (!done) {done = true; signal?.removeEventListener('abort', abort); resolve(files);}});
      zip.readEntry();
    });
  });
}
export async function verifyChecksums(root, files) {
  assert(files.includes('checksums.sha256'), 'CHECKSUM_MISSING', 'Missing checksums.sha256.');
  const declared = new Set();
  for (const line of (await fs.readFile(path.join(root, 'checksums.sha256'), 'utf8')).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-fA-F0-9]{64})  (.+)$/.exec(line);
    assert(match, 'CHECKSUM_FORMAT', 'Each checksum line must contain SHA256, two spaces, and a relative path.');
    const name = safeRelative(match[2]);
    assert(name !== 'checksums.sha256' && files.includes(name) && !declared.has(name), 'CHECKSUM_FORMAT', `Invalid checksum reference: ${name}`);
    declared.add(name);
    assert(await sha256(path.join(root, name)) === match[1].toLowerCase(), 'CHECKSUM_MISMATCH', `Checksum mismatch: ${name}`);
  }
  assert(files.every(f => f === 'checksums.sha256' || declared.has(f)), 'CHECKSUM_INCOMPLETE', 'The checksum list does not cover every file.');
}
export async function readJson(file) {
  assert((await fs.stat(file)).size < 5_000_000, 'JSON_TOO_LARGE', 'Configuration file is too large.');
  try { return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '')); }
  catch { throw new PackageError('JSON_INVALID', `Cannot parse JSON: ${path.basename(file)}`); }
}
