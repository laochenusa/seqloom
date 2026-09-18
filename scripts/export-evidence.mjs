import fs from 'node:fs/promises';
import path from 'node:path';
import {APP_ROOT} from '../core/runtime.mjs';
const read = async name => JSON.parse(await fs.readFile(path.join(APP_ROOT,'qa',name),'utf8'));
const {report} = await read('precision-15s-result.json');
const precision = await read('precision-check.json');
const cancellation = await read('cancel-check.json');
if (report.status !== 'passed' || precision.status !== 'passed' || cancellation.status !== 'passed') throw new Error('Checks must pass before exporting evidence.');
// Deliberate allowlist: no local paths, input media, fonts or user settings.
const evidence = {
  fixture: 'precision-15s', protocol: 'single-final-soundtrack alpha v1',
  sourceZipSha256: report.sourceZipSha256, outputSha256: report.outputSha256,
  width: report.width, height: report.height, frames: report.frames,
  durationSeconds: report.durationSeconds, outputBytes: report.outputBytes,
  fullDecodePassed: report.fullDecodePassed, timings: report.timings,
  precision, cancellation,
};
await fs.mkdir(path.join(APP_ROOT,'docs/evidence'),{recursive:true});
await fs.writeFile(path.join(APP_ROOT,'docs/evidence/local-validation.json'),JSON.stringify(evidence,null,2)+'\n');
console.log('Published path-free local technical evidence.');
