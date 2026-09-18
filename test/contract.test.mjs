import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleManifest,imageScene} from '../core/example.mjs';
import {validatePlan} from '../core/validate.mjs';
import {safeRelative} from '../core/io.mjs';
import {audioArgs} from '../core/engine.mjs';
function sample(){return [exampleManifest(),{schemaVersion:'1.0',scenes:[imageScene('s1',0,150,'assets/1.png'),imageScene('s2',150,450,'assets/2.png')]},{schemaVersion:'1.0',cues:[{id:'c1',startFrame:30,endFrame:90,text:'字幕'}]}];}
test('accept a continuous hard-subtitle plan',()=>assert.equal(validatePlan(...sample()).scenes.length,2));
test('reject gaps without silently moving scenes',()=>{const [m,t,c]=sample();t.scenes[1].startFrame=151;assert.throws(()=>validatePlan(m,t,c),e=>e.code==='TIMELINE_GAP');assert.equal(t.scenes[1].startFrame,151);});
test('reject subtitles beyond the end',()=>{const [m,t,c]=sample();c.cues[0].endFrame=451;assert.throws(()=>validatePlan(m,t,c),e=>e.code==='CAPTION_TIME');});
test('reject unsupported protocol and unknown fields',()=>{const [m,t,c]=sample();m.schemaVersion='2.0';assert.throws(()=>validatePlan(m,t,c),e=>e.code==='SCHEMA_INVALID');m.schemaVersion='1.0';m.prompt='猜测制作';assert.throws(()=>validatePlan(m,t,c),e=>e.code==='SCHEMA_INVALID');});
test('reject captions over two lines',()=>{const [m,t,c]=sample();c.cues[0].text='甲\n乙\n丙';assert.throws(()=>validatePlan(m,t,c),e=>e.code==='CAPTION_LINES');});
test('reject per-clip audio and standalone intro settings',()=>{
  const [m,t,c]=sample();const s=t.scenes[0];delete s.motion;Object.assign(s,{type:'video',sourceStartFrame:0,sourceEndFrame:150,audio:{enabled:true,gain:1}});
  assert.throws(()=>validatePlan(m,t,c),e=>e.code==='SCHEMA_INVALID');
  delete s.audio;assert.equal(validatePlan(m,t,c).scenes[0].type,'video');
  m.branding.introSceneId='s1';assert.throws(()=>validatePlan(m,t,c),e=>e.code==='SCHEMA_INVALID');
});
test('use only the supplied final soundtrack without audio repair or clip mixing',()=>{
  const args=audioArgs({root:'package',plan:validatePlan(...sample())},'picture.mp4','output.mp4');
  assert.equal(args.filter(a=>a==='-i').length,2);
  assert.ok(args.includes('1:a:0'));
  assert.ok(!args.some(a=>/amix|atrim|apad|adelay|volume|filter_complex/.test(a)));
});
test('reject unsafe zip paths and Windows aliases',()=>{for(const p of ['../a','C:/x','/tmp/a','assets\\a','assets/CON.txt','a/../b','a/thing.','x:y','a\u0000b'])assert.throws(()=>safeRelative(p),e=>e.code==='UNSAFE_PATH');assert.equal(safeRelative('素材/01.png'),'素材/01.png');});
