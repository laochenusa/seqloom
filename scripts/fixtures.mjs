import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';
import yazl from 'yazl';
import * as fontkit from 'fontkit';
import {APP_ROOT, ffmpeg} from '../core/runtime.mjs';
import {exampleManifest, imageScene} from '../core/example.mjs';
import {run, sha256} from '../core/io.mjs';
const fixtures = path.join(APP_ROOT, 'fixtures');
await fs.mkdir(fixtures,{recursive:true});
export async function zipDirectory(root, target) {
  const entries = [];
  async function walk(dir, prefix='') {for(const item of await fs.readdir(dir,{withFileTypes:true})){const name=prefix+item.name;if(item.isDirectory())await walk(path.join(dir,item.name),name+'/');else if(name!=='checksums.sha256')entries.push(name);}}
  await walk(root);
  await fs.writeFile(path.join(root,'checksums.sha256'),(await Promise.all(entries.sort().map(async name=>`${await sha256(path.join(root,name))}  ${name}`))).join('\n')+'\n');
  entries.push('checksums.sha256');
  const zip = new yazl.ZipFile();for(const name of entries)zip.addFile(path.join(root,name),name);
  const promise=pipeline(zip.outputStream,createWriteStream(target));zip.end();await promise;
}
function wav(duration, marks) {
  const samples = Math.round(duration*48000), data=Buffer.alloc(44+samples*4);
  data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);data.writeUInt32LE(48000,24);data.writeUInt32LE(192000,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*4,40);
  for(let i=0;i<samples;i++){const t=i/48000,mark=marks.find(m=>t>=m&&t<m+.08);const value=mark===undefined?0:Math.round(Math.sin(2*Math.PI*880*(t-mark))*9000);data.writeInt16LE(value,44+i*4);data.writeInt16LE(value,46+i*4);}
  return data;
}
async function make(name, {portrait=false, frames=450, branded=false}={}) {
  const root=path.join(fixtures,name);await fs.mkdir(root,{recursive:true});
  for(const dir of ['assets','audio','fonts','brand'])await fs.mkdir(path.join(root,dir),{recursive:true});
  // Windows system font is used only in local QA fixtures, not distributed with the app.
  await fs.copyFile(process.env.SEQLOOM_TEST_FONT || 'C:/Windows/Fonts/simhei.ttf',path.join(root,'fonts/subtitle.ttf'));
  const m=exampleManifest({portrait,frames,title:name});
  const font=fontkit.openSync(path.join(root,'fonts/subtitle.ttf'));
  m.subtitles.lineHeightPx=Math.max(m.subtitles.lineHeightPx,Math.ceil((font.ascent-font.descent)*m.subtitles.fontSizePx/font.unitsPerEm));
  const w=m.video.width,h=m.video.height;
  for(let i=1;i<=3;i++) {
    const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${['#16365d','#6b2445','#13594a'][i-1]}"/><rect x="80" y="80" width="${w-160}" height="${h-160}" rx="32" fill="none" stroke="#efcc7b" stroke-width="6"/><text x="${w/2}" y="${h*.4}" text-anchor="middle" fill="white" font-family="Arial" font-size="100">SCENE ${i}</text><text x="${w/2}" y="${h*.5}" text-anchor="middle" fill="#efcc7b" font-family="Arial" font-size="44">SEQLOOM / TIMING TEST</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(root,`assets/${i}.png`));
  }
  let scenes=[], cueStart=30;
  if(branded){
    cueStart=120;
    for(const [id,duration,color] of [['intro',3.2,'#182840'],['outro',6,'#204830']]) {
      await run(ffmpeg,['-v','error','-f','lavfi','-i',`color=c=${color}:s=${w}x${h}:r=30:d=${duration}`,'-f','lavfi','-i',`sine=frequency=${id==='intro'?440:660}:sample_rate=48000:duration=${duration}`,'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-shortest','-y',path.join(root,`brand/${id}.mp4`)]);
    }
    const video=(id,start,end)=>({id,path:`brand/${id}.mp4`,type:'video',startFrame:start,endFrame:end,fit:'contain',backgroundColor:'#000000',transitionIn:{type:'cut',durationFrames:0},sourceStartFrame:0,sourceEndFrame:end-start});
    scenes.push(video('intro',0,96));
    const count=27,bodyStart=96,bodyEnd=frames-180;
    for(let i=0;i<count;i++){const s=imageScene(`body-${i}`,bodyStart+Math.floor((bodyEnd-bodyStart)*i/count),bodyStart+Math.floor((bodyEnd-bodyStart)*(i+1)/count),`assets/${i%3+1}.png`);if(i)s.transitionIn={type:'dissolve',durationFrames:8};scenes.push(s);}
    scenes.push(video('outro',frames-180,frames));
  } else {
    const count=portrait?10:3;
    for(let i=0;i<count;i++){const s=imageScene(`scene-${i+1}`,Math.floor(frames*i/count),Math.floor(frames*(i+1)/count),`assets/${i%3+1}.png`);if(i)s.transitionIn={type:'dissolve',durationFrames:8};if(i===1){s.motion.scaleEnd=1.015;s.motion.offsetEndPx=[8,0];}scenes.push(s);}
  }
  // Final audio is authored here, upstream of Seqloom. Embedded clip tones must
  // never leak into the output. Intentional silence covers the rest of the film.
  await fs.writeFile(path.join(root,'audio/final.wav'),wav(frames/30,[1,5,10].filter(v=>v<frames/30)));
  const captions={schemaVersion:'1.0',cues:[{id:'c1',startFrame:cueStart,endFrame:cueStart+60,text:'中文字幕测试 1.25%\n第二行 ABC 123'},{id:'c2',startFrame:cueStart+120,endFrame:cueStart+180,text:'固定时间线，准确生成。'}]};
  for(const [file,data]of Object.entries({'manifest.json':m,'scene-timing.json':{schemaVersion:'1.0',scenes},'captions.json':captions}))await fs.writeFile(path.join(root,file),JSON.stringify(data,null,2));
  await fs.writeFile(path.join(root,'README.md'),'本包为合成技术测试，不代表真实节目或完成语义审核。系统字体仅供本机测试，请勿随软件分发。');
  await zipDirectory(root,path.join(fixtures,`${name}.zip`));
  console.log(`Fixture ready: ${name}`);
}
if(process.argv[1]===new URL(import.meta.url).pathname.replace(/^\/(.:)/,'$1').replaceAll('/',path.sep) || process.argv[1]?.endsWith('fixtures.mjs')) {
  const requested=new Set(process.argv.slice(2));
  for(const [name,options] of [['precision-15s',{}],['shorts-42s',{portrait:true,frames:1260}],['landscape-265s',{frames:7951,branded:true}]]) {
    if(!requested.size || requested.has(name)) await make(name,options);
  }
}
