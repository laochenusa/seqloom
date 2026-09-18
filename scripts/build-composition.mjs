import {bundle} from '@remotion/bundler';
import path from 'node:path';
import {APP_ROOT} from '../core/runtime.mjs';
await bundle({entryPoint: path.join(APP_ROOT, 'composition/index.jsx'), outDir: path.join(APP_ROOT, 'composition-bundle'), publicDir: null, webpackCache: false});
console.log('Composition ready');
