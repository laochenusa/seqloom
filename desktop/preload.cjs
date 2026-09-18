const {contextBridge,ipcRenderer,webUtils} = require('electron');
contextBridge.exposeInMainWorld('maker', {
  settings:()=>ipcRenderer.invoke('settings'), chooseZip:()=>ipcRenderer.invoke('choose-zip'), chooseOutput:()=>ipcRenderer.invoke('choose-output'),
  inspect:p=>ipcRenderer.invoke('inspect',p), render:()=>ipcRenderer.invoke('render'), cancel:()=>ipcRenderer.invoke('cancel'),
  requirements:()=>ipcRenderer.invoke('requirements'), copyRequirements:()=>ipcRenderer.invoke('copy-requirements'),
  copyError:text=>ipcRenderer.invoke('copy-error',text), openOutput:()=>ipcRenderer.invoke('open-output'), playOutput:()=>ipcRenderer.invoke('play-output'),
  filePath:file=>webUtils.getPathForFile(file), onEvent:fn=>ipcRenderer.on('task-event',(_e,event)=>fn(event))
});
