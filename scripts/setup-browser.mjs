import fs from 'node:fs/promises';
import path from 'node:path';
import {ensureBrowser} from '@remotion/renderer';
import {APP_ROOT} from '../core/runtime.mjs';
if(process.platform!=='win32'||process.arch!=='x64') throw new Error('This runtime setup targets Windows x64.');
const target=path.join(APP_ROOT,'runtime/chrome');
if(await fs.stat(path.join(target,'chrome-headless-shell.exe')).catch(()=>null)) {
  console.log('Existing bundled browser found.');
} else {
  const browser=await ensureBrowser({chromeMode:'headless-shell',logLevel:'info'});
  if(!('path' in browser)) throw new Error('Browser installation did not return an executable.');
  await fs.cp(path.dirname(browser.path),target,{recursive:true});
  console.log('Installed the browser selected by the pinned Remotion renderer.');
}
