import packager from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
import {APP_ROOT} from '../core/runtime.mjs';
const outputs=await packager({dir:APP_ROOT,out:path.join(APP_ROOT,'dist'),name:'Seqloom',platform:'win32',arch:'x64',electronVersion:'40.10.6',asar:false,prune:true,overwrite:true,
  ignore:[/^\/qa(?:\/|$)/,/^\/fixtures(?:\/|$)/,/^\/dist(?:\/|$)/,/^\/test(?:\/|$)/,/^\/scripts(?:\/|$)/,/^\/composition(?:\/|$)/,/^\/\.git(?:\/|$)/,/^\/\.tools(?:\/|$)/],
  win32metadata:{CompanyName:'Seqloom',FileDescription:'Local video production from validated packages',ProductName:'Seqloom'},
  afterCopy:[async(buildPath)=>{await fs.writeFile(path.join(buildPath,'README.txt'),'Seqloom 1.0 alpha\nRun Seqloom.exe. No Node.js or Python installation is needed.\nEnglish interface. Import a compliant ZIP and click Render Video.\nPackage Requirements includes a one-click copy button.\nThis build is a local validation release, not a signed installer.\n');}]
});
console.log(outputs.join('\n'));
