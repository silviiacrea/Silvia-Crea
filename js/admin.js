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
function show(){login.hidden=!!token;control.hidden=!token;if(token)loadMaintenance();}
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
$('run-generation').addEventListener('click',async()=>{if(!confirm('¿Quieres regenerar y publicar ahora todas las páginas de catálogo, trabajos y el sitemap?'))return;const b=$('run-generation');b.disabled=true;status.textContent='Enviando solicitud a GitHub Actions…';try{const d=await call('/admin/generate',{},true);status.textContent=d.message||'Solicitud aceptada por GitHub.';}catch(e){status.textContent='No se pudo solicitar la actualización SEO: '+e.message;sessionExpired(e);}finally{b.disabled=false;}});
$('logout').addEventListener('click',()=>{token='';sessionStorage.removeItem('silvia_admin_session');show();status.textContent='Sesión cerrada.';});
})();