import {inspect, render} from './engine.mjs';
let session, controller, busy = false;
process.on('message', async message => {
  if (message.command === 'cancel') {controller?.abort(); return;}
  if (busy) return;
  busy = true; controller = new AbortController();
  const options = {signal: controller.signal, onProgress: p => process.send?.({type: 'progress', ...p})};
  try {
    if (message.command === 'inspect') {
      session = null;
      session = await inspect(message.zipPath, message.cacheRoot, options);
      process.send?.({type: 'ready', manifest: session.plan.manifest, sceneCount: session.plan.scenes.length, cueCount: session.plan.cues.length});
    } else if (message.command === 'render') {
      if (!session) throw new Error('Import and validate a package first.');
      const result = await render(session, message.outputRoot, options);
      process.send?.({type: 'complete', outputDir: result.outputDir, outputFile: result.outputFile, seconds: result.report.timings.totalRenderSeconds});
    }
  } catch (e) {process.send?.({type: 'failure', code: controller.signal.aborted ? 'CANCELLED' : e.code || 'UNEXPECTED', message: controller.signal.aborted ? 'Task cancelled.' : e.message, field: e.field || '', canRetry: Boolean(session)});}
  finally {busy = false;}
});
