const {app, BrowserWindow, ipcMain, dialog, shell, clipboard} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const {fork, spawn} = require('node:child_process');
app.setName('Seqloom');
if (process.env.SEQLOOM_USER_DATA) app.setPath('userData', process.env.SEQLOOM_USER_DATA);
let window, worker, busy = false, ready = false, outputRoot, lastOutput, lastFile, closing = false;
const root = path.join(__dirname, '..');
function emit(event) {if (window && !window.isDestroyed()) window.webContents.send('task-event', event);}
function ensureWorker() {
  if (worker) return;
  worker = fork(path.join(root, 'core/worker.mjs'), [], {cwd: root, env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, windowsHide: true, stdio: ['ignore','pipe','pipe','ipc']});
  worker.on('message', event => {
    if (event.type === 'ready') {busy = false; ready = true;}
    if (event.type === 'complete') {busy = false; lastOutput = event.outputDir; lastFile = event.outputFile;}
    if (event.type === 'failure') busy = false;
    emit(event);
  });
  worker.on('exit', () => {worker = null; ready = false; if (busy && !closing) emit({type:'failure', code:'WORKER_EXIT', message:'The rendering process stopped unexpectedly. Import the package again to retry.',canRetry:false}); busy = false;});
  worker.on('error', e => {busy = false; emit({type:'failure',message:e.message,canRetry:false});});
  worker.stdout.on('data', () => {});
  worker.stderr.on('data', () => {});
}
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
app.whenReady().then(async () => {
  try {outputRoot = JSON.parse(await fs.readFile(settingsPath(), 'utf8')).outputRoot;} catch {}
  outputRoot ||= path.join(app.getPath('videos'), 'Seqloom Exports');
  ipcMain.handle('requirements', () => fs.readFile(path.join(root,'docs/package-requirements.txt'),'utf8'));
  ipcMain.handle('copy-requirements', async () => {clipboard.writeText(await fs.readFile(path.join(root,'docs/package-requirements.txt'),'utf8')); return true;});
  ipcMain.handle('settings', () => ({outputRoot, version: app.getVersion()}));
  ipcMain.handle('choose-output', async () => {
    if (busy) return outputRoot;
    const result = await dialog.showOpenDialog(window,{properties:['openDirectory','createDirectory'],defaultPath:outputRoot});
    if (!result.canceled) {outputRoot = result.filePaths[0]; await fs.writeFile(settingsPath(),JSON.stringify({outputRoot}));}
    return outputRoot;
  });
  ipcMain.handle('choose-zip', async () => {
    if (busy) return null;
    const result = await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'ZIP package',extensions:['zip']}]});
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('inspect', (_event, zipPath) => {
    if (busy) throw new Error('Please wait for the current task to finish.');
    if (typeof zipPath !== 'string' || !path.isAbsolute(zipPath) || !/\.zip$/i.test(zipPath)) throw new Error('Choose a ZIP package.');
    ensureWorker(); busy = true; ready = false; lastOutput = null; lastFile = null;
    worker.send({command:'inspect',zipPath,cacheRoot:path.join(app.getPath('userData'),'tasks')});
  });
  ipcMain.handle('render', () => {if(busy || !ready) throw new Error('Import a valid package first.'); ensureWorker();busy = true;lastOutput = null; lastFile = null;worker.send({command:'render',outputRoot});});
  ipcMain.handle('cancel', () => {worker?.send({command:'cancel'});});
  ipcMain.handle('open-output', () => lastOutput ? shell.openPath(lastOutput) : null);
  ipcMain.handle('play-output', () => lastFile ? shell.openPath(lastFile) : null);
  ipcMain.handle('copy-error', (_event,text) => {if(typeof text==='string' && text.length<20000) clipboard.writeText(text);});
  window = new BrowserWindow({width:1040,height:810,minWidth:820,minHeight:720,backgroundColor:'#101827',title:'Seqloom',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate', e => e.preventDefault());
  window.on('close', event => {
    if (busy && !closing) {
      const choice = dialog.showMessageBoxSync(window,{type:'question',buttons:['Keep Rendering','Cancel and Exit'],defaultId:0,cancelId:0,message:'A task is still running. Cancel it and exit?'});
      if(choice===0) {event.preventDefault();return;}
    }
    closing = true;
  });
  await window.loadFile(path.join(__dirname,'index.html'));
});
app.on('window-all-closed', () => {
  closing = true;
  if (worker?.pid) spawn('taskkill',['/pid',String(worker.pid),'/t','/f'],{windowsHide:true});
  app.quit();
});
