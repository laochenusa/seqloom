import fs from 'node:fs/promises';
import path from 'node:path';
import {APP_ROOT} from '../core/runtime.mjs';
import {manifestSchema,timelineSchema,captionsSchema} from '../core/schema.mjs';
import {exampleManifest,imageScene} from '../core/example.mjs';
const m=exampleManifest();m.title='Example video';m.output.fileName='video.mp4';
let doc=await fs.readFile(path.join(APP_ROOT,'docs/requirements-intro.en.txt'),'utf8');
const examples={'manifest.json':m,'scene-timing.json':{schemaVersion:'1.0',scenes:[imageScene('scene-001',0,450,'assets/001.png')]},'captions.json':{schemaVersion:'1.0',cues:[{id:'caption-001',startFrame:0,endFrame:90,text:'Example caption.\nDeliver a complete transcript.'}]}};
for(const [name,value]of Object.entries(examples))doc+=`\n\n### ${name}\n${JSON.stringify(value,null,2)}\n`;
for(const [name,schema]of Object.entries({'manifest':manifestSchema,'scene-timing':timelineSchema,'captions':captionsSchema})){
  await fs.writeFile(path.join(APP_ROOT,'docs',`${name}.schema.json`),JSON.stringify(schema,null,2));
  doc+=`\n\n### ${name}.schema.json\n${JSON.stringify(schema,null,2)}\n`;
}
await fs.writeFile(path.join(APP_ROOT,'docs/package-requirements.txt'),doc);
console.log('English requirements synchronized with validation schemas');
