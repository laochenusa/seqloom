import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {APP_ROOT} from '../core/runtime.mjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'seqloom-portable-'));
const output=path.join(APP_ROOT,'qa/portable-check.json');
await fs.mkdir(path.dirname(output),{recursive:true});
try {
  await fs.cp(path.join(APP_ROOT,'dist/Seqloom-win32-x64'),path.join(root,'app'),{recursive:true});
  await fs.copyFile(path.join(APP_ROOT,'fixtures/precision-15s.zip'),path.join(root,'input.zip'));
  await fs.copyFile(path.join(APP_ROOT,'scripts/portable-harness.mjs'),path.join(root,'harness.mjs'));
  const env={...process.env,ELECTRON_RUN_AS_NODE:'1'};
  for(const key of Object.keys(env)) if(['path','node_path','node_options'].includes(key.toLowerCase())) delete env[key];
  env.PATH=`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`;
  await new Promise((resolve,reject)=>{
    const child=spawn(path.join(root,'app/Seqloom.exe'),[path.join(root,'harness.mjs')],{cwd:root,env,windowsHide:true,stdio:'inherit'});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Portable harness exited with ${code}`)));
  });
  await fs.copyFile(path.join(root,'result.json'),output);
  console.log(await fs.readFile(output,'utf8'));
} catch(error) {
  await fs.writeFile(output,JSON.stringify({status:'failed',message:error.message},null,2));throw error;
} finally {
  // Only remove the exact directory returned by mkdtemp inside the OS temp root.
  if(path.dirname(root)!==path.resolve(os.tmpdir()) || !path.basename(root).startsWith('seqloom-portable-')) throw new Error('Unexpected temporary path.');
  await fs.rm(root,{recursive:true,force:true});
}
