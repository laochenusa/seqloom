const $=id=>document.getElementById(id), api=window.maker;
let busy=false, started=0, taskPhase='', lastError='';
function setBusy(value){busy=value;$('choose').disabled=value;$('chooseOutput').disabled=value;$('cancel').hidden=!value;$('render').disabled=value;}
function fail(e){lastError=typeof e==='string'?e:e.message;$('errorText').textContent=lastError;$('errorBox').hidden=false;}
async function inspect(p){if(!p||busy)return;$('source').textContent=p;$('summary').hidden=true;$('errorBox').hidden=true;$('play').hidden=true;$('open').hidden=true;$('progress').value=0;taskPhase='inspect';started=Date.now();setBusy(true);$('stage').textContent='Reading package';try{await api.inspect(p);}catch(e){setBusy(false);$('render').disabled=true;fail(e);}}
api.settings().then(s=>{$('outputPath').textContent=s.outputRoot;$('version').textContent=s.version;});
$('choose').onclick=async()=>inspect(await api.chooseZip());
$('chooseOutput').onclick=async()=>{$('outputPath').textContent=await api.chooseOutput();};
$('render').onclick=async()=>{taskPhase='render';started=Date.now();$('errorBox').hidden=true;$('play').hidden=true;$('open').hidden=true;$('progress').value=0;setBusy(true);try{await api.render();}catch(e){setBusy(false);fail(e);}};
$('cancel').onclick=()=>{api.cancel();$('stage').textContent='Cancelling';$('cancel').disabled=true;};
$('open').onclick=()=>api.openOutput();$('play').onclick=()=>api.playOutput();
$('copyError').onclick=async()=>{await api.copyError(lastError);$('copyError').textContent='Copied';};
$('requirements').onclick=async()=>{try{$('requirementsText').value=await api.requirements();$('copyStatus').textContent='';$('requirementsDialog').showModal();}catch(e){fail(e);}};
$('closeRequirements').onclick=()=>$('requirementsDialog').close();
$('copyRequirements').onclick=async()=>{try{await api.copyRequirements();$('copyStatus').textContent='Copied. Paste into your upstream AI or production workflow.';}catch(e){$('copyStatus').textContent='Copy failed. Select the text and copy it manually.';}};
for(const event of ['dragover','drop'])document.addEventListener(event,e=>e.preventDefault());
$('drop').addEventListener('dragover',()=>$('drop').classList.add('dragging'));
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('dragging'));
$('drop').addEventListener('drop',e=>{$('drop').classList.remove('dragging');if(!busy&&e.dataTransfer.files.length===1)inspect(api.filePath(e.dataTransfer.files[0]));});
$('drop').onkeydown=e=>{if(e.target===$('drop')&&['Enter',' '].includes(e.key)&&!busy){e.preventDefault();$('choose').click();}};
api.onEvent(e=>{
  if(e.type==='progress'){$('stage').textContent=({'检查素材':'Checking media','检查通过':'Checks passed'})[e.stage]||e.stage;$('progress').value=e.progress;$('detail').textContent=e.detail||'';}
  if(e.type==='ready'){setBusy(false);$('cancel').disabled=false;$('summary').hidden=false;$('project').textContent=e.manifest.title;const v=e.manifest.video;$('facts').textContent=`${v.width} × ${v.height}  ·  30fps  ·  ${(v.durationFrames/30).toFixed(2)} s  ·  ${e.sceneCount} scenes  ·  ${e.cueCount} captions`;$('stage').textContent='Package ready';$('detail').textContent='Ready to export one MP4 with burned-in captions.';$('progress').value=1;}
  if(e.type==='complete'){setBusy(false);$('cancel').disabled=false;$('stage').textContent='Render complete';$('detail').textContent=`Checks passed · Render time: ${e.seconds.toFixed(1)} s`;$('play').hidden=false;$('open').hidden=false;$('progress').value=1;}
  if(e.type==='failure'){setBusy(false);$('cancel').disabled=false;$('render').disabled=!e.canRetry;$('render').textContent=e.canRetry?'Render Again':'Render Video';$('stage').textContent=e.code==='CANCELLED'?'Cancelled':'Could not complete';$('detail').textContent=e.code==='CANCELLED'?'Your original package is unchanged.':'Review the details below, then try again.';fail(`${e.code||'ERROR'}${e.field?' · '+e.field:''}\n${window.errorDescriptions[e.code]||e.message}`);lastError+=`\nDiagnostic: ${e.message}`;}
});
setInterval(()=>{if(busy)$('elapsed').textContent=`Elapsed ${Math.floor((Date.now()-started)/1000)} s`;},1000);
