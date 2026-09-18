import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {APP_ROOT,ffmpeg} from '../core/runtime.mjs';
import {run} from '../core/io.mjs';
const names=process.argv.slice(2);
if(!names.length) names.push('shorts-42s','landscape-265s');
for(const name of names) {
  assert(['shorts-42s','landscape-265s'].includes(name),'Use one of the known synthetic fixtures.');
  const result=JSON.parse(await fs.readFile(path.join(APP_ROOT,'qa',`${name}-result.json`),'utf8'));
  const long=name==='landscape-265s';
  const frames=long?[0,95,96,119,120,179,180,7770,7771,7950]:[0,29,30,89,90,1259];
  const expected=long?{0:[24,40,64],95:[24,40,64],96:[22,54,93],7770:[19,89,74],7771:[32,72,48],7950:[32,72,48]}:{0:[22,54,93],1259:[22,54,93]};
  const dir=path.join(APP_ROOT,'qa',`${name}-decoded`);await fs.mkdir(dir,{recursive:true});
  await run(ffmpeg,['-v','error','-i',result.outputFile,'-vf',`select='${frames.map(n=>`eq(n,${n})`).join('+')}'`,'-vsync','0','-y',path.join(dir,'%03d.png')]);
  const samples={};
  for(let i=0;i<frames.length;i++) {
    const file=path.join(dir,`${String(i+1).padStart(3,'0')}.png`);
    const rgb=[...await sharp(file).extract({left:200,top:200,width:1,height:1}).removeAlpha().raw().toBuffer()];
    const {x:left,y:top,width,height}=result.report.plan.manifest.subtitles.box;
    const caption=await sharp(file).extract({left,top,width,height}).removeAlpha().raw().toBuffer();
    let white=0;for(let p=0;p<caption.length;p+=3)if(caption[p]>210&&caption[p+1]>210&&caption[p+2]>210)white++;
    samples[frames[i]]={rgb,whiteCaptionPixels:white};
    if(expected[frames[i]])assert(rgb.every((value,j)=>Math.abs(value-expected[frames[i]][j])<=12),`Wrong scene at frame ${frames[i]}`);
  }
  const [before,start,endMinusOne,end]=long?[119,120,179,180]:[29,30,89,90];
  assert(samples[before].whiteCaptionPixels<100);
  assert(samples[start].whiteCaptionPixels>1000);
  assert(samples[endMinusOne].whiteCaptionPixels>1000);
  assert(samples[end].whiteCaptionPixels<100);
  const pcm=path.join(dir,'audio.f32');
  await run(ffmpeg,['-v','error','-i',result.outputFile,'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-y',pcm]);
  const data=await fs.readFile(pcm),groups=[];let previous=-1;
  for(let i=0;i<data.length/4;i++)if(Math.abs(data.readFloatLE(i*4))>.05){if(previous<0||i-previous>4800)groups.push(i/48000);previous=i;}
  // Intro/outro source clips contain continuous tones; extra output groups or
  // continuous sound would fail this assertion, detecting embedded-audio leaks.
  assert.equal(groups.length,3);[1,5,10].forEach((t,i)=>assert(Math.abs(t-groups[i])<1/30));
  let leakedSamples=0;
  for(let i=0;i<data.length/4;i++)if(Math.abs(data.readFloatLE(i*4))>.05 && ![1,5,10].some(t=>i/48000>=t-.01&&i/48000<t+.1)) leakedSamples++;
  assert.equal(leakedSamples,0);
  const evidence={fixture:name,status:'passed',frames:result.report.frames,width:result.report.width,height:result.report.height,
    durationSeconds:result.report.durationSeconds,sourceZipSha256:result.report.sourceZipSha256,outputSha256:result.report.outputSha256,
    fullDecodePassed:result.report.fullDecodePassed,timings:result.report.timings,samples,audioMarksSeconds:groups,
    maxAudioMarkErrorSeconds:Math.max(...groups.map((v,i)=>Math.abs(v-[1,5,10][i]))),unexpectedAudioSamples:leakedSamples,
    preassembledOpeningClosingChecked:long};
  await fs.writeFile(path.join(APP_ROOT,'qa',`${name}-check.json`),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
}
