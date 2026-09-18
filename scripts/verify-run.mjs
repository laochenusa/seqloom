import path from 'node:path';
import fs from 'node:fs/promises';
import {APP_ROOT} from '../core/runtime.mjs';
import {inspect,render} from '../core/engine.mjs';
const names=process.argv.slice(2);if(!names.length)names.push('precision-15s');
for(const name of names){
  let stage='', bucket=-1;
  const onProgress=p=>{const b=Math.floor(p.progress*10);if(p.stage!==stage||b!==bucket){console.log(`${name}: ${p.stage} ${Math.round(p.progress*100)}%`);stage=p.stage;bucket=b;}};
  const session=await inspect(path.join(APP_ROOT,'fixtures',`${name}.zip`),path.join(APP_ROOT,'qa/tasks'),{onProgress});
  const result=await render(session,path.join(APP_ROOT,'qa/outputs'),{onProgress});
  await fs.writeFile(path.join(APP_ROOT,'qa',`${name}-result.json`),JSON.stringify(result,null,2));
  console.log(JSON.stringify({name,output:result.outputFile,timings:result.report.timings}));
}
