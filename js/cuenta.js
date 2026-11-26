(()=>{
 const API='https://clientes.silviacrea.es/api', $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
 const request=async(path,options={})=>{const r=await fetch(API+path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'No se pudo completar la operación.');return d;};
 const show=(el,msg,error=false)=>{if(!el)return;el.hidden=false;el.textContent=msg;el.classList.toggle('error',error);};
 const page=location.pathname.split('/').pop().replace('.html','');document.querySelectorAll('[data-account-nav]').forEach(a=>{if(a.dataset.accountNav===page)a.setAttribute('aria-current','page');});
 document.querySelectorAll('[data-account-form]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const out=form.querySelector('[data-result]'),data=Object.fromEntries(new FormData(form));show(out,'Procesando…');try{const d=await request(form.dataset.endpoint,{method:'POST',body:JSON.stringify(data)});if(form.dataset.endpoint==='/track'&&d.order){const lines=[`Pedido ${d.order.public_number}`,`Estado: ${d.order.status}`,`Pago: ${d.order.payment_status}`,`Total provisional: ${money(d.order.provisional_total)}`,...(d.order.final_total!=null?[`Total confirmado: ${money(d.order.final_total)}`]:[]),'Historial:',...(d.history||[]).map(h=>`${h.created_at} · ${h.new_status} · ${h.customer_message||''}`)];show(out,lines.join('\n'));}else show(out,d.message||'Operación completada.');if(form.dataset.endpoint==='/login'&&d.ok)location.href='cuenta.html';if(form.dataset.endpoint==='/password/reset'&&d.ok)setTimeout(()=>location.href='login.html',1200);}catch(err){show(out,err.message,true);}}));
 const token=new URLSearchParams(location.search).get('token');
 if(location.pathname.endsWith('restablecer-password.html')){const host=$('.account-card');if(host&&!host.querySelector('[data-account-form]')){host.insertAdjacentHTML('beforeend',`<form class="account-form" data-account-form data-endpoint="/password/reset"><input type="hidden" name="token" value="${esc(token||'')}"><label>Nueva contraseña (mínimo 12 caracteres)<input type="password" name="password" minlength="12" required autocomplete="new-password"></label><button>Guardar contraseña</button><p class="account-result" data-result hidden></p></form>`);const f=host.querySelector('[data-account-form]');f.addEventListener('submit',async e=>{e.preventDefault();const out=f.querySelector('[data-result]');show(out,'Procesando…');try{const d=await request('/password/reset',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(f)))});show(out,d.message||'Contraseña actualizada.');setTimeout(()=>location.href='login.html',1200);}catch(err){show(out,err.message,true);}});}}
 if(location.pathname.endsWith('verificar-email.html')){const host=$('.account-card');if(host){host.insertAdjacentHTML('beforeend','<p class="account-result" data-verify-result>Verificando correo…</p>');request('/verify-email',{method:'POST',body:JSON.stringify({token})}).then(d=>show($('[data-verify-result]'),d.message)).catch(e=>show($('[data-verify-result]'),e.message,true));}}
 if(location.pathname.endsWith('cuenta.html')){
  request('/me').then(d=>{
   const host=$('.account-card');if(!host)return;
   const addresses=d.addresses||[];
   host.innerHTML=`<p class="eyebrow">Silvia Crea · Tu espacio</p><h1>Mi cuenta</h1><p>Bienvenida/o, ${esc(d.customer.full_name)}</p>
    <div class="account-profile-grid">
     <section class="account-section"><h2>Datos personales</h2><p class="account-readonly"><strong>Nombre y apellidos</strong><br>${esc(d.customer.full_name)}</p><p class="account-readonly"><strong>Correo actual</strong><br>${esc(d.customer.email)}</p>
      <form class="account-form" id="profile-form"><label>Teléfono (máximo 9 números)<input name="phone" value="${esc(d.customer.phone||'')}" autocomplete="tel" inputmode="numeric" pattern="[0-9]{0,9}" maxlength="9"></label><button>Guardar teléfono</button><p class="account-result" data-result hidden></p></form>
      <form class="account-form" id="email-form"><h3>Cambiar correo electrónico</h3><label>Nuevo correo<input name="email" type="email" required autocomplete="email"></label><label>Contraseña actual<input name="password" type="password" required autocomplete="current-password"></label><button>Solicitar cambio de correo</button><p class="account-result" data-result hidden></p></form></section>
     <section class="account-section"><h2>Mis direcciones</h2><div id="addresses">${addresses.map(a=>`<article class="account-readonly" data-address-card="${esc(a.id)}"><strong>${esc(a.label||'Dirección')}${a.isDefault?' · Predeterminada':''}</strong><br>${esc(a.address)}<br>${esc(a.postalCode)} ${esc(a.city)}${a.province?', '+esc(a.province):''}<br>${esc(a.country||'')}<p><button type="button" data-edit-address="${esc(a.id)}">Editar dirección</button> <button type="button" data-delete-address="${esc(a.id)}">Eliminar</button></p></article>`).join('')||'<p>Aún no has guardado direcciones.</p>'}</div>
      <details><summary>Añadir una dirección</summary><form class="account-form" id="address-form"><label>Etiqueta<input name="label" placeholder="Casa"></label><label>Dirección<input name="address" required></label><label>Código postal<input name="postalCode" required></label><label>Localidad<input name="city" required></label><label>Provincia<input name="province"></label><label>País<input name="country" value="España"></label><label><input type="checkbox" name="isDefault" value="true"> Dirección predeterminada</label><button>Añadir dirección</button><p class="account-result" data-result hidden></p></form></details></section>
    </div><p><a class="account-link" href="privacidad.html">Privacidad y datos personales</a></p><button id="logout">Cerrar sesión</button>`;
   $('#profile-form').addEventListener('submit',async e=>{
    e.preventDefault();const f=e.currentTarget,o=f.querySelector('[data-result]');
    try{const phone=f.elements.phone.value.replace(/\D/g,'');if(phone.length>9)throw Error('El teléfono no puede tener más de 9 números.');const r=await request('/me',{method:'PATCH',body:JSON.stringify({phone})});show(o,r.message);}
    catch(err){show(o,err.message,true);}
   });
   $('#email-form').addEventListener('submit',async e=>{
    e.preventDefault();const f=e.currentTarget,o=f.querySelector('[data-result]');
    try{const r=await request('/me/email',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(f)))});show(o,r.message||'Revisa el nuevo correo para verificar el cambio.');f.reset();}
    catch(err){show(o,err.message,true);}
   });
   $('#address-form').addEventListener('submit',async e=>{
    e.preventDefault();const f=e.currentTarget,o=f.querySelector('[data-result]'),data=Object.fromEntries(new FormData(f));data.isDefault=!!f.querySelector('[name=isDefault]').checked;
    try{await request('/addresses',{method:'POST',body:JSON.stringify(data)});location.reload();}
    catch(err){show(o,err.message,true);}
   });
   $('#addresses')?.addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit-address]'),del=e.target.closest('[data-delete-address]');
    if(del){if(!confirm('¿Eliminar esta dirección?'))return;try{await request('/addresses/'+encodeURIComponent(del.dataset.deleteAddress),{method:'DELETE'});location.reload();}catch(err){alert(err.message);}return;}
    if(edit){
     const a=addresses.find(x=>x.id===edit.dataset.editAddress);if(!a)return;
     const panel=document.createElement('form');panel.className='account-form';
     panel.innerHTML=`<label>Etiqueta<input name="label" value="${esc(a.label||'')}"></label><label>Dirección<input name="address" required value="${esc(a.address)}"></label><label>Código postal<input name="postalCode" required value="${esc(a.postalCode)}"></label><label>Localidad<input name="city" required value="${esc(a.city)}"></label><label>Provincia<input name="province" value="${esc(a.province||'')}"></label><label>País<input name="country" value="${esc(a.country||'España')}"></label><label><input type="checkbox" name="isDefault" ${a.isDefault?'checked':''}> Dirección predeterminada</label><button>Guardar cambios</button><p class="account-result" data-result hidden></p>`;
     edit.closest('[data-address-card]').appendChild(panel);edit.disabled=true;
     panel.addEventListener('submit',async ev=>{
      ev.preventDefault();const data=Object.fromEntries(new FormData(panel));data.isDefault=panel.elements.isDefault.checked;
      try{await request('/addresses/'+encodeURIComponent(a.id),{method:'PATCH',body:JSON.stringify(data)});location.reload();}
      catch(err){show(panel.querySelector('[data-result]'),err.message,true);}
     });
    }
   });
   $('#logout').addEventListener('click',async()=>{await request('/logout',{method:'POST',body:'{}'});location.href='login.html';});
  }).catch(()=>{
   const host=$('.account-card');
   if(host)host.innerHTML='<h1>Mi cuenta</h1><p>Inicia sesión para consultar y gestionar tus datos.</p><p><a href="login.html">Iniciar sesión</a> · <a href="registro.html">Crear cuenta</a></p>';
  });
 }
 if(location.pathname.endsWith('pedidos.html')){request('/orders').then(d=>{const host=$('.account-card');host.insertAdjacentHTML('beforeend',`<div id="customer-orders">${(d.items||[]).map(o=>`<article class="account-order"><strong>${esc(o.orderNumber)}</strong><p>${esc(o.status)} · ${money(o.total)}</p><small>${esc(o.createdAt)}</small><p><button type="button" data-order-detail="${esc(o.orderNumber)}">Ver detalle e historial</button></p></article>`).join('')||'<p>No tienes pedidos asociados todavía.</p>'}</div>`);$('#customer-orders').addEventListener('click',async ev=>{const b=ev.target.closest('[data-order-detail]');if(!b)return;const card=b.closest('.account-order');let out=card.querySelector('[data-order-history]');if(!out){out=document.createElement('pre');out.dataset.orderHistory='';out.style.whiteSpace='pre-wrap';card.appendChild(out);}out.textContent='Cargando…';try{const detail=await request('/orders/'+encodeURIComponent(b.dataset.orderDetail));out.textContent=JSON.stringify({pedido:detail.order.public_number,estado:detail.order.status,pago:detail.order.payment_status,productos:JSON.parse(detail.order.items_json||'[]'),direccion:JSON.parse(detail.order.address_json||'{}'),historial:detail.history||[]},null,2);}catch(err){out.textContent=err.message;}});}).catch(()=>{});}
 if(location.pathname.endsWith('incidencias.html')){
  const host=$('.account-issues-card');
  if(host){
   const labels={open:'Abierta',in_progress:'En curso',resolved:'Resuelta',closed:'Cerrada'};
   const lists={active:$('#issues-active-list'),open:$('#issues-open-list'),archived:$('#issues-archived-list')};
   const empty=(node,msg)=>{node.replaceChildren();const p=document.createElement('p');p.className='issues-empty';p.textContent=msg;node.appendChild(p);};
   async function loadIssues(){
    try{
     const d=await request('/issues'),groups={active:[],open:[],archived:[]};
     (d.items||[]).forEach(i=>{if(i.status==='in_progress')groups.active.push(i);else if(i.status==='closed'||i.status==='resolved')groups.archived.push(i);else groups.open.push(i);});
     Object.entries(groups).forEach(([key,arr])=>{const node=lists[key];node.replaceChildren();if(!arr.length){empty(node,key==='archived'?'Todavía no tienes incidencias archivadas.':key==='active'?'No tienes incidencias en curso.':'No tienes incidencias pendientes.');return;}arr.forEach(issue=>node.appendChild(renderIssue(issue)));});
    }catch(err){Object.values(lists).forEach(node=>empty(node,err.message));const auth=$('#issues-auth-message');if(auth&&/sesión|autorizado/i.test(err.message)){auth.hidden=false;auth.textContent='Inicia sesión para abrir incidencias y consultar tus conversaciones.';}}
   }
   function renderIssue(issue){
    const card=document.createElement('article');card.className='issue-entry';const head=document.createElement('div');head.className='issue-entry-head';
    const title=document.createElement('strong');title.textContent=`${issue.orderNumber||'Consulta general'} · ${issue.kind||'Incidencia'}`;
    const badge=document.createElement('span');badge.className='issue-status';badge.textContent=labels[issue.status]||'Pendiente';head.append(title,badge);
    const date=document.createElement('small');date.textContent=issue.createdAt?`Creada: ${issue.createdAt}`:'';
    const desc=document.createElement('p');desc.textContent=issue.description||'';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='account-link';toggle.textContent='Ver conversación';
    const thread=document.createElement('div');thread.hidden=true;
    toggle.addEventListener('click',async()=>{thread.hidden=!thread.hidden;if(thread.hidden)return;thread.replaceChildren();const loading=document.createElement('p');loading.textContent='Cargando conversación…';thread.appendChild(loading);
     try{const data=await request(`/issues/${encodeURIComponent(issue.id)}/messages`);thread.replaceChildren();const messages=document.createElement('div');messages.className='issue-thread';
      (data.items||[]).forEach(m=>{const item=document.createElement('article');item.className='issue-chat-message'+(m.sender_type==='admin'?' is-admin':'');const name=document.createElement('strong');name.textContent=m.senderName||(m.sender_type==='admin'?'Administración':'Tú');const body=document.createElement('p');body.textContent=m.body||'';const time=document.createElement('small');time.textContent=m.createdAt||'';item.append(name,body,time);messages.appendChild(item);});
      if(!messages.children.length)empty(messages,'Todavía no hay mensajes.');
      thread.appendChild(messages);
      if(issue.status==='closed'||issue.status==='resolved'){const archived=document.createElement('p');archived.className='issues-empty';archived.textContent='Esta incidencia está archivada. Si necesitas más ayuda, puedes abrir una nueva incidencia.';thread.appendChild(archived);}
      else{
       const form=document.createElement('form');form.className='issue-reply account-form';const label=document.createElement('label');label.textContent='Tu mensaje';const area=document.createElement('textarea');area.name='body';area.required=true;area.maxLength=3000;const send=document.createElement('button');send.type='submit';send.textContent='Enviar mensaje';const feedback=document.createElement('p');feedback.className='account-result';feedback.hidden=true;label.appendChild(area);form.append(label,send,feedback);
       form.addEventListener('submit',async ev=>{ev.preventDefault();send.disabled=true;try{await request(`/issues/${encodeURIComponent(issue.id)}/messages`,{method:'POST',body:JSON.stringify({body:area.value})});area.value='';feedback.hidden=false;feedback.textContent='Mensaje enviado.';const refreshed=await request(`/issues/${encodeURIComponent(issue.id)}/messages`);messages.replaceChildren();(refreshed.items||[]).forEach(m=>{const item=document.createElement('article');item.className='issue-chat-message'+(m.sender_type==='admin'?' is-admin':'');const n=document.createElement('strong');n.textContent=m.senderName||(m.sender_type==='admin'?'Administración':'Tú');const b=document.createElement('p');b.textContent=m.body||'';const t=document.createElement('small');t.textContent=m.createdAt||'';item.append(n,b,t);messages.appendChild(item);});}catch(err){feedback.hidden=false;feedback.textContent=err.message;feedback.style.color='#a33';}finally{send.disabled=false;}});
       thread.appendChild(form);
      }
     }catch(err){thread.textContent=err.message;}
    });
    card.append(head,date,desc,toggle,thread);return card;
   }
   const form=$('#issue-form');
   if(form){request('/orders').then(d=>{const select=$('#issue-order');(d.items||[]).forEach(o=>{const op=document.createElement('option');op.value=o.orderNumber;op.textContent=o.orderNumber+' · '+o.status;select.appendChild(op);});}).catch(()=>{});
    form.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,out=f.querySelector('[data-result]'),send=f.querySelector('button[type="submit"]');send.disabled=true;try{await request('/issues',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(f)))});show(out,'Incidencia registrada. Tu mensaje inicial ya está en la conversación.');f.reset();await loadIssues();}catch(err){show(out,err.message,true);}finally{send.disabled=false;}});
   }
   loadIssues();
  }
 }
})();
