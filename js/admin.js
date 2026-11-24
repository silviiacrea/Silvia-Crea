(()=>{
const API='https://worker.silviacrea.es', $=id=>document.getElementById(id);
const login=$('login-panel'),control=$('control-panel'),status=$('admin-status');
let token=sessionStorage.getItem('silvia_admin_session')||'';
async function call(path,body={},auth=false,method='POST'){
 const r=await fetch(API+path,{method,cache:'no-store',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 const data=await r.json().catch(()=>({error:'Respuesta no válida del servidor'}));
 if(!r.ok)throw new Error(data.error||'Error HTTP '+r.status);return data;
}
function sessionExpired(e){if(/sesión|autoriz/i.test(e.message)){token='';sessionStorage.removeItem('silvia_admin_session');show();}}

const REPO='silviiacrea/Silvia-Crea';
const RAW_DATA='https://raw.githubusercontent.com/'+REPO+'/main/datos.json';
const DATA_COMMITS='https://api.github.com/repos/'+REPO+'/commits?path=datos.json&per_page=1&sha=main';
async function freshPublic(url,headers={}){
 const response=await fetch(url+(url.includes('?')?'&':'?')+'_fresh='+Date.now(),{cache:'no-store',headers});
 if(!response.ok)throw new Error('HTTP '+response.status);
 return response;
}
async function checkPublishedVersion(){
 const version=$('version-current'),info=$('version-info'),updated=$('data-updated'),source=$('data-source'),checked=$('version-checked');
 if(!version)return;
 version.textContent='Comprobando…';info.textContent='Consultando index.html publicado…';
 updated.textContent='Consultando GitHub…';source.textContent='';checked.textContent='';
 const results=await Promise.allSettled([
  (async()=>{const response=await freshPublic('index.html');const html=await response.text();
   const doc=new DOMParser().parseFromString(html,'text/html');
   const live=doc.querySelector('meta[name="silvia-build"]')?.content;
   if(!live)throw new Error('No se encontró la marca de versión en index.html');
   return live;})(),
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
  info.textContent='Versión leída directamente de la página principal publicada.';
 }else{
  version.textContent='No disponible';
  info.textContent='No se pudo consultar la versión publicada: '+(results[0].reason?.message||'error desconocido');
 }
 if(results[1].status==='fulfilled'){
  const date=new Date(results[1].value);
  updated.textContent=Number.isNaN(date.getTime())?'GitHub devolvió una fecha no válida.':
   new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Madrid'}).format(date)+' (hora peninsular española).';
  source.textContent='Fuente: último commit de datos.json en GitHub.';
 }else{
  updated.textContent='No se pudo obtener una fecha fiable: '+(results[1].reason?.message||'error desconocido');
 }
 checked.textContent='Última comprobación: '+new Date().toLocaleString('es-ES');
}

function show(){login.hidden=!!token;control.hidden=!token;if(token){loadMaintenance();checkPublishedVersion();}}
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
$('login-form').addEventListener('submit',async e=>{e.preventDefault();status.textContent='Comprobando acceso…';try{const d=await call('/admin/login',{username:$('admin-user').value,password:$('admin-pass').value});token=d.token;sessionStorage.setItem('silvia_admin_session',token);$('admin-pass').value='';show();status.textContent='Acceso autorizado.';}catch(err){status.textContent=err.message;}});
$('set-normal').addEventListener('click',e=>setMode('normal',e.currentTarget));
$('set-maintenance').addEventListener('click',e=>setMode('maintenance',e.currentTarget));
$('recheck-version')?.addEventListener('click',checkPublishedVersion);
$('run-generation').addEventListener('click',async()=>{if(!confirm('¿Quieres regenerar y publicar ahora todas las páginas de catálogo, trabajos y el sitemap?'))return;const b=$('run-generation');b.disabled=true;status.textContent='Enviando solicitud a GitHub Actions…';try{const d=await call('/admin/generate',{},true);status.textContent=d.message||'Solicitud aceptada por GitHub.';}catch(e){status.textContent='No se pudo solicitar la actualización SEO: '+e.message;sessionExpired(e);}finally{b.disabled=false;}});
$('logout').addEventListener('click',()=>{token='';sessionStorage.removeItem('silvia_admin_session');show();status.textContent='Sesión cerrada.';});
})();