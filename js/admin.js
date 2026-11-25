(()=>{
const API='https://worker.silviacrea.es', $=id=>document.getElementById(id);
const login=$('login-panel'),control=$('control-panel'),status=$('admin-status'),notice=$('admin-notice');
let noticeTimer=null;
function notify(message){if(!notice)return;notice.textContent=message;notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.hidden=true;notice.textContent='';},6500);}
let token=sessionStorage.getItem('silvia_admin_session')||'';
async function call(path,body={},auth=false,method='POST'){
 const r=await fetch(API+path,{method,cache:'no-store',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 const data=await r.json().catch(()=>({error:'Respuesta no válida del servidor'}));
 if(!r.ok)throw new Error(data.error||'Error HTTP '+r.status);return data;
}
function sessionExpired(e){if(/sesión|autoriz/i.test(e.message)){token='';sessionStorage.removeItem('silvia_admin_session');show();}}
let indexNowCooldownUntil=0,indexNowCooldownTimer=null,indexNowStatusReady=false;
function renderIndexNowCooldown(){
 const button=$('run-indexnow'),note=$('indexnow-note');if(!button||!note)return;
 if(!indexNowStatusReady){button.disabled=true;return;}
 const remaining=Math.max(0,indexNowCooldownUntil-Date.now());
 if(remaining>0){button.disabled=true;const minutes=Math.floor(remaining/60000),seconds=Math.ceil((remaining%60000)/1000);note.textContent='Protección activa: podrás actualizar IndexNow dentro de '+(minutes?minutes+' min':'')+(minutes&&seconds?' y ':'')+(seconds?seconds+' s':'')+'. El límite mínimo entre envíos es de 30 minutos.';}
 else{button.disabled=false;if(note.dataset.cooldown==='1'){note.textContent='Ya puedes solicitar una nueva actualización. Solo se enviarán URL nuevas, modificadas o eliminadas.';note.dataset.cooldown='0';}}
}
async function loadIndexNowStatus(){
 const note=$('indexnow-note'),button=$('run-indexnow');if(!note||!token)return;
 indexNowStatusReady=false;if(button)button.disabled=true;
 try{const d=await call('/admin/indexnow/status',{},true,'GET');indexNowCooldownUntil=Number(d.cooldownUntil||0);note.dataset.cooldown=indexNowCooldownUntil>Date.now()?'1':'0';indexNowStatusReady=true;renderIndexNowCooldown();}
 catch(e){note.textContent='No se pudo consultar el límite de IndexNow: '+e.message;indexNowStatusReady=false;if(button)button.disabled=true;sessionExpired(e);}
}
if(indexNowCooldownTimer)clearInterval(indexNowCooldownTimer);
indexNowCooldownTimer=setInterval(renderIndexNowCooldown,1000);

const REPO='silviiacrea/Silvia-Crea';
const RAW_DATA='https://raw.githubusercontent.com/'+REPO+'/main/datos.json';
const DATA_COMMITS='https://api.github.com/repos/'+REPO+'/commits?path=datos.json&per_page=1&sha=main';
const VERSION_COMMITS='https://api.github.com/repos/'+REPO+'/commits?path=gestion-privada.html&per_page=1&sha=main';
async function freshPublic(url,headers={}){
 const response=await fetch(url+(url.includes('?')?'&':'?')+'_fresh='+Date.now(),{cache:'no-store',headers});
 if(!response.ok)throw new Error('HTTP '+response.status);
 return response;
}
async function checkPublishedVersion(){
 const version=$('version-current'),info=$('version-info'),versionUpdated=$('version-updated'),versionSource=$('version-source');
 const updated=$('data-updated'),source=$('data-source'),checked=$('version-checked');
 if(!version)return;
 version.textContent='Comprobando…';info.textContent='Consultando gestion-privada.html publicada…';
 versionUpdated.textContent='Consultando GitHub…';versionSource.textContent='';
 updated.textContent='Consultando GitHub…';source.textContent='';checked.textContent='';
 const results=await Promise.allSettled([
  (async()=>{const response=await freshPublic('gestion-privada.html');const html=await response.text();
   const doc=new DOMParser().parseFromString(html,'text/html');
   const live=doc.querySelector('meta[name="silvia-build"]')?.content;
   if(!live)throw new Error('No se encontró la marca de versión en gestion-privada.html');
   return live;})(),
  (async()=>{const response=await freshPublic(VERSION_COMMITS,{'Accept':'application/vnd.github+json'});
   const commits=await response.json();
   const date=commits?.[0]?.commit?.committer?.date||commits?.[0]?.commit?.author?.date;
   if(!date)throw new Error('GitHub no facilitó la fecha del último cambio de gestion-privada.html');
   return date;})(),
  (async()=>{const response=await freshPublic(RAW_DATA);const data=await response.json();
   if(!data||typeof data!=='object')throw new Error('datos.json no es válido');
   const commitResponse=await freshPublic(DATA_COMMITS,{'Accept':'application/vnd.github+json'});
   const commits=await commitResponse.json();
   const date=commits?.[0]?.commit?.committer?.date||commits?.[0]?.commit?.author?.date;
   if(!date)throw new Error('GitHub no facilitó la fecha del último commit de datos.json');
   return date;})()
 ]);
 if(results[0].status==='fulfilled'){
  version.textContent='v'+results[0].value;
  info.textContent='Versión leída directamente de gestion-privada.html publicada.';
 }else{
  version.textContent='No disponible';
  info.textContent='No se pudo consultar la versión publicada: '+(results[0].reason?.message||'error desconocido');
 }
 if(results[1].status==='fulfilled'){
  const date=new Date(results[1].value);
  versionUpdated.textContent=Number.isNaN(date.getTime())?'GitHub devolvió una fecha no válida.':
   new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'medium',timeZone:'Europe/Madrid'}).format(date)+' (hora peninsular española).';
  versionSource.textContent='Fuente: último commit de gestion-privada.html en GitHub.';
 }else{
  versionUpdated.textContent='No se pudo obtener una fecha fiable: '+(results[1].reason?.message||'error desconocido');
 }
 if(results[2].status==='fulfilled'){
  const date=new Date(results[2].value);
  updated.textContent=Number.isNaN(date.getTime())?'GitHub devolvió una fecha no válida.':
   new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Madrid'}).format(date)+' (hora peninsular española).';
  source.textContent='Fuente: último commit de datos.json en GitHub.';
 }else{
  updated.textContent='No se pudo obtener una fecha fiable: '+(results[2].reason?.message||'error desconocido');
 }
 checked.textContent='Última comprobación: '+new Date().toLocaleString('es-ES');
}

async function loadOrderStats(){
 const total=$('orders-total'),completed=$('orders-completed'),pending=$('orders-pending'),note=$('orders-note');
 if(!total||!token)return;
 total.textContent=completed.textContent=pending.textContent='…';note.textContent='Consultando la hoja PEDIDOS…';
 try{
  const d=await call('/admin/orders/stats',{},true,'GET');
  total.textContent=String(d.total);completed.textContent=String(d.completed);pending.textContent=String(d.pending);
  note.textContent='Datos leídos directamente de Google Sheets';
 }catch(e){
  total.textContent=completed.textContent=pending.textContent='—';
  note.textContent=e.message;sessionExpired(e);
 }
}
async function loadWorkerHealth(){
 const panel=$('worker-health-state'),label=$('worker-health-current'),note=$('worker-health-note');
 if(!panel||!token)return;
 panel.className='admin-state';label.textContent='Comprobando Worker…';note.textContent='Comprobación del Worker y del binding KV SITE_SETTINGS.';
 try{
  const d=await call('/admin/health',{},true,'GET');
  if(d.status!=='ok'||d.worker!=='normal'||d.kv!=='available')throw new Error(d.error||'La comprobación no ha sido satisfactoria.');
  panel.className='admin-state normal';label.textContent='Worker operativo al 100%';
  note.textContent='';
 }catch(e){
  panel.className='admin-state error';label.textContent='Worker Error: '+(e.message||'No se pudo completar la comprobación.');note.textContent='';
  sessionExpired(e);
 }
}
function show(){login.hidden=!!token;control.hidden=!token;const headerActions=$('admin-header-actions');if(headerActions)headerActions.hidden=!token;if(token){loadMaintenance();checkPublishedVersion();loadOrderStats();loadWorkerHealth();loadIndexNowStatus();}}
function renderState(mode){
 const active=mode==='maintenance',panel=$('maintenance-state');
 panel.className='admin-state '+(active?'maintenance':'normal');
 $('maintenance-current').textContent=active?'MODO MANTENIMIENTO':'WEB NORMAL';
 $('set-normal').disabled=!active;$('set-maintenance').disabled=active;
}
async function loadMaintenance(){
 $('maintenance-current').textContent='Consultando el servidor…';
 try{const d=await call('/admin/maintenance',{},true,'GET');const mode=d.maintenance?.mode;
 if(!['normal','maintenance'].includes(mode))throw new Error('El servidor devolvió un estado desconocido.');
 renderState(mode);
 }catch(e){$('maintenance-state').className='admin-state';$('maintenance-current').textContent='No se pudo verificar el estado';status.textContent='Error al consultar el estado real: '+e.message;sessionExpired(e);}
}
async function setMode(mode,button){
 button.disabled=true;status.textContent='Solicitando el cambio al servidor…';
 try{const d=await call('/admin/maintenance',{mode},true);const confirmed=d.maintenance?.mode;
 if(confirmed!==mode)throw new Error('El servidor no confirmó el modo solicitado.');
 const verify=await call('/admin/maintenance',{},true,'GET');
 if(verify.maintenance?.mode!==mode)throw new Error('La lectura posterior no coincide con el cambio solicitado.');
 renderState(mode);status.textContent=mode==='maintenance'?'Modo mantenimiento activado y verificado en el servidor.':'Web normal restaurada y verificada en el servidor.';
 }catch(e){status.textContent='No se pudo cambiar el modo: '+e.message;await loadMaintenance();sessionExpired(e);}
 finally{button.disabled=false;}
}
show();
$('login-form').addEventListener('submit',async e=>{e.preventDefault();status.textContent='Comprobando acceso…';try{const d=await call('/admin/login',{username:$('admin-user').value,password:$('admin-pass').value});token=d.token;sessionStorage.setItem('silvia_admin_session',token);$('admin-pass').value='';show();notify('Acceso autorizado. Sesión iniciada correctamente.');}catch(err){status.textContent=err.message;}});
$('set-normal').addEventListener('click',e=>setMode('normal',e.currentTarget));
$('set-maintenance').addEventListener('click',e=>setMode('maintenance',e.currentTarget));
$('recheck-version')?.addEventListener('click',checkPublishedVersion);
$('refresh-orders')?.addEventListener('click',loadOrderStats);
$('refresh-worker-health')?.addEventListener('click',loadWorkerHealth);
$('run-generation').addEventListener('click',async()=>{if(!confirm('¿Quieres regenerar y publicar ahora todas las páginas de catálogo, trabajos y el sitemap?'))return;const b=$('run-generation');b.disabled=true;status.textContent='Enviando solicitud a GitHub Actions…';try{const d=await call('/admin/generate',{},true);status.textContent=d.message||'Solicitud aceptada por GitHub.';}catch(e){status.textContent='No se pudo solicitar la actualización SEO: '+e.message;sessionExpired(e);}finally{b.disabled=false;}});
$('run-sitemap')?.addEventListener('click',async()=>{if(!confirm('¿Actualizar el sitemap y regenerar las páginas SEO usando los productos y trabajos actuales de Google Sheets?'))return;const b=$('run-sitemap'),note=$('sitemap-note');b.disabled=true;note.textContent='Solicitando actualización del sitemap…';status.textContent='Enviando actualización SEO a GitHub Actions…';try{const d=await call('/admin/generate',{},true);note.textContent=d.message||'Actualización aceptada. El sitemap se regenerará y publicará automáticamente.';status.textContent=note.textContent;}catch(e){note.textContent='No se pudo solicitar la actualización: '+e.message;status.textContent=note.textContent;sessionExpired(e);}finally{b.disabled=false;}});
$('run-indexnow')?.addEventListener('click',async()=>{if($('run-indexnow').disabled)return;if(!confirm('Se comparará el sitemap con la última referencia guardada. Solo se enviarán URL nuevas, modificadas o eliminadas. Después de un envío aceptado habrá que esperar al menos 30 minutos. ¿Quieres continuar?'))return;const b=$('run-indexnow'),note=$('indexnow-note');b.disabled=true;note.textContent='Comparando el sitemap con el historial guardado…';status.textContent='Comprobando cambios para IndexNow…';try{const d=await call('/admin/indexnow',{},true);note.textContent=d.message||('IndexNow ha aceptado '+d.notified+' URL.');status.textContent=note.textContent;if(d.cooldownUntil)indexNowCooldownUntil=Number(d.cooldownUntil);if(d.baselineCreated||d.noChanges)indexNowCooldownUntil=0;note.dataset.cooldown=indexNowCooldownUntil>Date.now()?'1':'0';}catch(e){note.textContent='No se pudo actualizar IndexNow: '+e.message;status.textContent=note.textContent;await loadIndexNowStatus();sessionExpired(e);}finally{renderIndexNowCooldown();}});

let cleanupPreview=null;
function resetCleanup(){cleanupPreview=null;const result=$('cleanup-result'),button=$('execute-cleanup'),list=$('cleanup-list');if(result)result.hidden=true;if(button){button.hidden=true;button.disabled=true;}if(list)list.replaceChildren();}
$('preview-cleanup')?.addEventListener('click',async()=>{
 const button=$('preview-cleanup'),result=$('cleanup-result'),summary=$('cleanup-summary'),list=$('cleanup-list'),execute=$('execute-cleanup');
 resetCleanup();button.disabled=true;button.textContent='Consultando Google Sheets…';status.textContent='Leyendo las filas activas de Google Sheets y comparándolas con las carpetas de GitHub…';
 try{
  const d=await call('/admin/cleanup/preview',{},true);
  cleanupPreview=d;result.hidden=false;summary.textContent=d.message||'Análisis completado.';
  if(Array.isArray(d.orphans)&&d.orphans.length){
   const counts={};d.orphans.forEach(item=>{counts[item.section]=(counts[item.section]||0)+1;const li=document.createElement('li');li.textContent=item.section+': '+item.slug+'/ ('+item.files+' archivo'+(item.files===1?'':'s')+')';list.appendChild(li);});
   const line=document.createElement('li');line.textContent='Total: '+d.count+' carpeta(s) · '+d.fileCount+' archivo(s).';line.style.fontWeight='700';list.appendChild(line);
   execute.hidden=false;execute.disabled=false;
  }else{
   const li=document.createElement('li');li.textContent='No se ha detectado ninguna carpeta que deba eliminarse.';list.appendChild(li);
  }
  status.textContent=d.message||'Análisis completado.';
 }catch(e){result.hidden=false;summary.textContent='No se pudo completar el análisis: '+e.message;status.textContent=summary.textContent;sessionExpired(e);}
 finally{button.disabled=false;button.textContent='Volver a revisar carpetas';}
});
$('execute-cleanup')?.addEventListener('click',async()=>{
 if(!cleanupPreview||!cleanupPreview.count)return;
 const names=(cleanupPreview.orphans||[]).map(x=>x.folder+'/'+x.slug+'/').join('\n');
 if(!confirm('Se eliminarán '+cleanupPreview.count+' carpeta(s) detectadas en GitHub.\n\n'+names+'\n\nSe volverá a consultar Google Sheets antes de borrar. ¿Quieres continuar?'))return;
 const button=$('execute-cleanup'),previewButton=$('preview-cleanup');button.disabled=true;previewButton.disabled=true;button.textContent='Limpiando GitHub…';status.textContent='Revalidando Google Sheets y preparando un único commit de eliminación en GitHub…';
 try{
  const d=await call('/admin/cleanup/execute',{},true);
  $('cleanup-summary').textContent=d.message||'Limpieza completada.';
  $('cleanup-list').replaceChildren();
  const li=document.createElement('li');li.textContent='Carpetas eliminadas: '+(d.deletedFolders??0)+' · Archivos eliminados: '+(d.deletedFiles??0)+' · URLs retiradas del sitemap: '+(d.sitemapUrlsRemoved??0)+'.';$('cleanup-list').appendChild(li);
  cleanupPreview=null;button.hidden=true;button.disabled=true;status.textContent=d.message||'Limpieza publicada en GitHub.';
 }catch(e){$('cleanup-summary').textContent='No se ha completado la limpieza: '+e.message;status.textContent=$('cleanup-summary').textContent;sessionExpired(e);}
 finally{button.textContent='Eliminar carpetas obsoletas';previewButton.disabled=false;}
});

$('logout').addEventListener('click',()=>{token='';sessionStorage.removeItem('silvia_admin_session');show();status.textContent='Sesión cerrada.';});
})();