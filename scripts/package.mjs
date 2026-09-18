import packager from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
import {APP_ROOT} from '../core/runtime.mjs';
const packageJson=JSON.parse(await fs.readFile(path.join(APP_ROOT,'package.json'),'utf8'));
const electronVersion=packageJson.devDependencies.electron;
if(!/^\d+\.\d+\.\d+$/.test(electronVersion)) throw new Error('Pin Electron to an exact version before packaging.');
for(const file of ['runtime/ffmpeg.exe','runtime/chrome/chrome-headless-shell.exe','composition-bundle/index.html']) await fs.access(path.join(APP_ROOT,file));
const outputs=await packager({dir:APP_ROOT,out:path.join(APP_ROOT,'dist'),name:'Seqloom',platform:'win32',arch:'x64',electronVersion,asar:false,prune:true,overwrite:true,
  ignore:[/^\/qa(?:\/|$)/,/^\/fixtures(?:\/|$)/,/^\/dist(?:\/|$)/,/^\/test(?:\/|$)/,/^\/scripts(?:\/|$)/,/^\/composition(?:\/|$)/,/^\/\.git(?:\/|$)/,/^\/\.tools(?:\/|$)/],
  win32metadata:{CompanyName:'Seqloom',FileDescription:'Local video production from validated packages',ProductName:'Seqloom'}
});
// Packager hooks use callbacks. Write this after packaging instead of returning
// an unconsumed Promise from a callback hook, which can stall packaging.
for(const output of outputs) await fs.writeFile(path.join(output,'README.txt'),'Seqloom 1.0 alpha\nRun Seqloom.exe. Keep the entire folder together.\nNo Node.js or Python installation is needed.\nEnglish interface. Import a compliant ZIP and click Render Video.\nPackage Requirements includes a one-click copy button.\nThis build is a local validation release, not a signed installer.\n');
console.log(outputs.join('\n'));
