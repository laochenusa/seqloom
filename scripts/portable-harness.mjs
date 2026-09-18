// Runs in the packaged Electron executable, outside the source checkout.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd();
const {inspect,render}=await import(pathToFileURL(path.join(root,'app/resources/app/core/engine.mjs')).href);
assert(process.versions.electron,'Use the packaged Electron runtime.');
const session=await inspect(path.join(root,'input.zip'),path.join(root,'tasks'));
const aborter=new AbortController();let enteredRender=false;
await assert.rejects(render(session,path.join(root,'cancelled'),{signal:aborter.signal,onProgress:p=>{if(p.progress>=.02){enteredRender=true;aborter.abort();}}}),e=>e.code==='CANCELLED');
assert(enteredRender);
for(const dir of await fs.readdir(path.join(root,'cancelled'))) {
  const files=await fs.readdir(path.join(root,'cancelled',dir));
  assert(!files.some(file=>file.endsWith('.mp4')),'Cancelled output must not retain an MP4.');
}
const result=await render(session,path.join(root,'outputs'));
assert.equal(result.report.frames,450);
assert.equal(result.report.fullDecodePassed,true);
assert.equal((await fs.readFile(path.join(result.outputDir,'validation-report.txt'),'utf8')).startsWith('Technical checks passed'),true);
await fs.writeFile(path.join(root,'result.json'),JSON.stringify({
  status:'passed',platform:process.platform,arch:process.arch,electron:process.versions.electron,
  execution:'Packaged Electron in Node mode; isolated temporary directory and system-only PATH',
  nativeDesktopUiTested:false,networkIsolationTested:false,
  cancellationPassed:true,retryPassed:true,frames:result.report.frames,
  fullDecodePassed:result.report.fullDecodePassed,outputSha256:result.report.outputSha256,
  timings:result.report.timings,
},null,2));
