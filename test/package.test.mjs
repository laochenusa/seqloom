import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import yazl from 'yazl';
import {APP_ROOT} from '../core/runtime.mjs';
import {inspect} from '../core/engine.mjs';
import {zipDirectory} from '../scripts/fixtures.mjs';
const root=path.join(APP_ROOT,'qa/negative-tests');await fs.mkdir(root,{recursive:true});
test('reject a corrupted ZIP before attempting render',async()=>{const file=path.join(root,'broken.zip');await fs.writeFile(file,'not a zip');await assert.rejects(inspect(file,path.join(root,'cache')),e=>e.code==='ZIP_INVALID');});
test('reject missing captions, corrupted media, long captions and missing glyphs',async()=>{
  for(const kind of ['missing','checksum','overflow','glyph']){
    const dir=await fs.mkdtemp(path.join(root,kind));await fs.cp(path.join(APP_ROOT,'fixtures/precision-15s'),dir,{recursive:true});
    if(kind==='missing')await fs.unlink(path.join(dir,'captions.json'));
    if(kind==='checksum'){
      // First generate a valid archive, then change a byte of a file in the ZIP via a second zip writer.
      await fs.writeFile(path.join(dir,'assets/1.png'),Buffer.from('broken image'));
    }
    if(kind==='overflow'||kind==='glyph'){
      const file=path.join(dir,'captions.json'),c=JSON.parse(await fs.readFile(file,'utf8'));c.cues[0].text=kind==='overflow'?'非常长的字幕'.repeat(20):'\u{1fae8}';await fs.writeFile(file,JSON.stringify(c));
    }
    const zip=dir+'.zip';await zipDirectory(dir,zip);
    const expected={missing:'FILE_MISSING',checksum:'MEDIA_PROCESS_FAILED',overflow:'CAPTION_OVERFLOW',glyph:'FONT_GLYPH'}[kind];
    await assert.rejects(inspect(zip,path.join(root,'cache')),e=>e.code===expected,kind);
  }
});
test('reject a stale checksum without processing the changed file',async()=>{
  const dir=await fs.mkdtemp(path.join(root,'stale-'));
  await fs.cp(path.join(APP_ROOT,'fixtures/precision-15s'),dir,{recursive:true});
  await fs.appendFile(path.join(dir,'README.md'),' changed after hashing');
  const zip=new yazl.ZipFile();
  async function walk(base,prefix=''){for(const e of await fs.readdir(base,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())await walk(path.join(base,e.name),name+'/');else zip.addFile(path.join(base,e.name),name);}}
  await walk(dir);const file=dir+'.zip';const saved=pipeline(zip.outputStream,createWriteStream(file));zip.end();await saved;
  await assert.rejects(inspect(file,path.join(root,'cache')),e=>e.code==='CHECKSUM_MISMATCH');
});

test('reject a final soundtrack shorter or longer than the complete timeline',async()=>{
  for(const delta of [-1,1]){
    const dir=await fs.mkdtemp(path.join(root,'duration-'));
    await fs.cp(path.join(APP_ROOT,'fixtures/precision-15s'),dir,{recursive:true});
    const file=path.join(dir,'audio/final.wav'),original=await fs.readFile(file);
    const changed=Buffer.alloc(original.length+delta*6400);original.copy(changed);
    changed.writeUInt32LE(changed.length-8,4);changed.writeUInt32LE(changed.length-44,40);
    await fs.writeFile(file,changed);const zip=dir+'.zip';await zipDirectory(dir,zip);
    await assert.rejects(inspect(zip,path.join(root,'cache')),e=>e.code==='AUDIO_DURATION');
  }
});
test('cancel a render preparation without reporting success',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(inspect(path.join(APP_ROOT,'fixtures/precision-15s.zip'),path.join(root,'cache'),{signal:controller.signal}),e=>e.code==='CANCELLED');
});
