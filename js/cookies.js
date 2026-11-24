/* Silvia Crea · Gestión de cookies y almacenamiento local · v70.0
   Las categorías opcionales se guardan como preferencias, pero no se cargan
   herramientas analíticas ni publicitarias en esta versión. */
(() => {
  'use strict';
  const KEY = 'silvia_cookie_consent_v1';
  const POLICY = '/politica-cookies.html';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.version === 1 ? v : null; } catch (_) { return null; } };
  const save = (analytics, marketing) => {
    const value = {version:1, necessary:true, analytics:!!analytics, marketing:!!marketing, updatedAt:new Date().toISOString()};
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) {}
    document.dispatchEvent(new CustomEvent('silvia:cookie-consent-changed', {detail:value}));
    return value;
  };
  let panel = null;
  const styles = `
  .sc-cookie-backdrop{position:fixed;inset:0;background:rgba(37,35,46,.38);z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:18px;box-sizing:border-box}
  .sc-cookie-panel{width:min(100%,850px);max-height:min(88vh,760px);overflow:auto;background:#fffdfd;color:#403747;border:1px solid #eaddea;border-radius:22px;box-shadow:0 18px 70px rgba(35,25,45,.24);padding:24px;font:14px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;text-align:left}
  .sc-cookie-panel h2{font:600 24px/1.2 Georgia,serif;color:#604b70;margin:0 0 10px}
  .sc-cookie-panel p{margin:8px 0 14px}
  .sc-cookie-panel a{color:#76518a;text-decoration:underline}
  .sc-cookie-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
  .sc-cookie-actions button{flex:1 1 170px;min-height:46px;border:1px solid #9279a5;border-radius:12px;padding:10px 14px;background:#fff;color:#59446b;font-weight:700;font-size:14px;cursor:pointer}
  .sc-cookie-actions button.sc-cookie-primary{background:#fff;color:#59446b;border-color:#9279a5}
  .sc-cookie-actions button:hover{filter:brightness(.97)}
  .sc-cookie-actions button:focus-visible,.sc-cookie-panel a:focus-visible,.sc-cookie-close:focus-visible{outline:3px solid #c39bd4;outline-offset:3px}
  .sc-cookie-close{float:right;border:0;background:transparent;color:#59446b;font-size:25px;line-height:1;cursor:pointer;padding:3px 8px}
  .sc-cookie-options{display:grid;gap:10px;margin:16px 0}
  .sc-cookie-option{border:1px solid #eaddea;border-radius:12px;padding:12px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
  .sc-cookie-option strong{display:block;color:#59446b}.sc-cookie-option small{display:block;color:#6c6470;margin-top:3px}
  .sc-cookie-option input{width:20px;height:20px;accent-color:#765b8c;flex:none;margin-top:3px}
  .sc-cookie-footnote{font-size:12px;color:#6c6470}
  @media(max-width:600px){.sc-cookie-backdrop{padding:9px}.sc-cookie-panel{padding:18px;border-radius:18px;max-height:92vh}.sc-cookie-panel h2{font-size:21px}.sc-cookie-actions{display:grid;grid-template-columns:1fr}.sc-cookie-actions button{width:100%}}
  `;
  function ensureStyles(){if(document.getElementById('sc-cookie-styles'))return;const st=document.createElement('style');st.id='sc-cookie-styles';st.textContent=styles;document.head.appendChild(st);}
  function close(){if(panel){panel.remove();panel=null;}document.body.style.removeProperty('overflow');}
  function render(settings=false){
    close(); ensureStyles();
    const current=read()||{analytics:false,marketing:false};
    panel=document.createElement('div');panel.className='sc-cookie-backdrop';panel.id='sc-cookie-backdrop';
    panel.innerHTML=`<section class="sc-cookie-panel" role="dialog" aria-modal="true" aria-labelledby="sc-cookie-title"><button class="sc-cookie-close" type="button" aria-label="Cerrar aviso" data-sc-close>×</button><h2 id="sc-cookie-title">${settings?'Preferencias de cookies':'Tu privacidad importa'}</h2><p>Silvia Crea utiliza almacenamiento técnico necesario para recordar el carrito, facilitar el funcionamiento de la web y guardar tus preferencias. Actualmente no utiliza cookies de analítica ni de publicidad. Puedes aceptar, rechazar las categorías opcionales o configurar tus preferencias.</p><p>Consulta la <a href="${POLICY}">Política de cookies</a> para conocer los detalles y cómo cambiar tu elección más adelante desde el pie de página.</p>${settings?`<div class="sc-cookie-options"><label class="sc-cookie-option"><span><strong>Necesarias</strong><small>Imprescindibles para las funciones solicitadas. Siempre activas.</small></span><input type="checkbox" checked disabled aria-label="Cookies necesarias siempre activas"></label><label class="sc-cookie-option"><span><strong>Analítica</strong><small>No hay herramientas analíticas activas en esta versión. Si se incorporan, solo se ejecutarán con tu autorización.</small></span><input id="sc-cookie-analytics" type="checkbox" ${current.analytics?'checked':''}></label><label class="sc-cookie-option"><span><strong>Publicidad y marketing</strong><small>No hay píxeles publicitarios ni cookies de marketing activos en esta versión.</small></span><input id="sc-cookie-marketing" type="checkbox" ${current.marketing?'checked':''}></label></div>`:''}<p class="sc-cookie-footnote">Tu elección se guarda en este navegador. Puedes modificarla o retirarla en cualquier momento desde «Configurar cookies» en el pie de página.</p><div class="sc-cookie-actions"><button type="button" class="sc-cookie-primary" data-sc-accept>${settings?'Guardar preferencias':'Aceptar todas'}</button><button type="button" data-sc-reject>${settings?'Rechazar opcionales':'Rechazar opcionales'}</button>${settings?'':'<button type="button" data-sc-settings>Configurar</button>'}</div></section>`;
    document.body.appendChild(panel);document.body.style.overflow='hidden';
    const focus=panel.querySelector('[data-sc-accept]');focus?.focus();
    panel.addEventListener('click',e=>{if(e.target===panel) return;});
    panel.querySelector('[data-sc-close]')?.addEventListener('click',()=>{if(read())close();});
    panel.querySelector('[data-sc-accept]')?.addEventListener('click',()=>{
      const a=settings?!!panel.querySelector('#sc-cookie-analytics')?.checked:true;
      const m=settings?!!panel.querySelector('#sc-cookie-marketing')?.checked:true;
      save(a,m);close();
    });
    panel.querySelector('[data-sc-reject]')?.addEventListener('click',()=>{save(false,false);close();});
    panel.querySelector('[data-sc-settings]')?.addEventListener('click',()=>render(true));
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&read())close();});
  }
  function openSettings(){render(true);}
  window.SilviaCookies={getConsent:read,hasConsent:(category)=>category==='necessary'?true:!!read()?.[category],openSettings};
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-cookie-settings]');if(trigger){e.preventDefault();openSettings();}});
  const init=()=>{if(!read())render(false);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
