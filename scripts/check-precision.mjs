import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {APP_ROOT,ffmpeg} from '../core/runtime.mjs';
import {run} from '../core/io.mjs';
const result=JSON.parse(await fs.readFile(path.join(APP_ROOT,'qa/precision-15s-result.json'),'utf8'));
const out=path.join(APP_ROOT,'qa/precision-frames');await fs.mkdir(out,{recursive:true});
const frames=[29,30,89,90,149,150,157,158,299,300,307,308,449];
await run(ffmpeg,['-v','error','-i',result.outputFile,'-vf',`select='${frames.map(n=>`eq(n,${n})`).join('+')}'`,'-vsync','0','-y',path.join(out,'%03d.png')]);
const samples={};
for(let i=0;i<frames.length;i++){
  const file=path.join(out,`${String(i+1).padStart(3,'0')}.png`);
  const pixel=await sharp(file).extract({left:200,top:200,width:1,height:1}).removeAlpha().raw().toBuffer();
  const caption=await sharp(file).extract({left:160,top:800,width:1600,height:180}).removeAlpha().raw().toBuffer();
  let white=0;for(let p=0;p<caption.length;p+=3)if(caption[p]>210&&caption[p+1]>210&&caption[p+2]>210)white++;
  samples[frames[i]]={rgb:[...pixel],whiteCaptionPixels:white};
}
assert(samples[29].whiteCaptionPixels<100,'caption before start');assert(samples[30].whiteCaptionPixels>1000,'caption at start');assert(samples[89].whiteCaptionPixels>1000,'caption before end');assert(samples[90].whiteCaptionPixels<100,'caption after end');
const colors=[[22,54,93],[107,36,69],[19,89,74]];
function near(actual,expected){assert(actual.every((c,i)=>Math.abs(c-expected[i])<10),`RGB ${actual} differs from ${expected}`);}
near(samples[149].rgb,colors[0]);near(samples[157].rgb,colors[1]);near(samples[299].rgb,colors[1]);near(samples[307].rgb,colors[2]);near(samples[449].rgb,colors[2]);
near(samples[150].rgb,colors[0].map((v,i)=>v*.875+colors[1][i]*.125));near(samples[300].rgb,colors[1].map((v,i)=>v*.875+colors[2][i]*.125));
const pcm=path.join(out,'audio.f32');await run(ffmpeg,['-v','error','-i',result.outputFile,'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-y',pcm]);
const data=await fs.readFile(pcm),groups=[];let previous=-1;
for(let i=0;i<data.length/4;i++)if(Math.abs(data.readFloatLE(i*4))>.05){if(previous<0||i-previous>4800)groups.push(i/48000);previous=i;}
assert.equal(groups.length,3);[1,5,10].forEach((t,i)=>assert(Math.abs(t-groups[i])<1/30));
const report={status:'passed',testedFrames:frames,samples,audioMarksSeconds:groups,maxAudioMarkErrorSeconds:Math.max(...groups.map((t,i)=>Math.abs(t-[1,5,10][i]))),description:'Decoded final MP4: caption frame boundaries, dissolve boundary colors, three known audio markers.'};
await fs.writeFile(path.join(APP_ROOT,'qa/precision-check.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
