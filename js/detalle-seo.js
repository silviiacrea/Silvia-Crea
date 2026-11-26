(()=>{'use strict';
const d=window.SILVIA_DETAIL||{},cfg=window.SILVIA_CONFIG||{},$=s=>document.querySelector(s),cartKey='silviacrea_cart_v2';
$('#year').textContent=new Date().getFullYear();
function imageUrl(raw,mode='thumb'){
 try{const u=new URL(raw,location.href);if(u.hostname==='worker.silviacrea.es'&&u.pathname.startsWith('/i/')){u.searchParams.set('wm',mode);u.searchParams.set('v','53');return u.href;}}catch{}return raw;
}
const main=$('#detail-image');
if(main){main.src=imageUrl(d.image,'detail');main.addEventListener('error',()=>{main.alt='Imagen no disponible: '+(d.name||'creación');});}
function readCart(){try{const x=JSON.parse(localStorage.getItem(cartKey)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
function writeCart(items){localStorage.setItem(cartKey,JSON.stringify(items));}
function euro(n){return (Number(n)||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});}
function showAlert(title,message){
 const old=$('.modal-backdrop.order-result');old?.remove();
 const layer=document.createElement('div');layer.className='modal-backdrop open order-result';layer.style.zIndex='220';
 const box=document.createElement('div');box.className='confirm-modal';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
 const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=message;
 const actions=document.createElement('div');actions.className='confirm-btns';const ok=document.createElement('button');ok.className='btn';ok.type='button';ok.textContent='Aceptar';ok.addEventListener('click',()=>layer.remove());actions.append(ok);box.append(h,p,actions);layer.append(box);document.body.append(layer);
}
function renderCart(){
 const items=readCart(),wrap=$('#cart-items');let units=0,total=0;
 items.forEach(x=>{units+=Number(x.qty)||0;total+=(Number(x.qty)||0)*(Number(x.price)||0);});
 document.querySelectorAll('.cart-count').forEach(x=>x.textContent=units);
 $('#cart-units').textContent=units;$('#cart-total').textContent=euro(total);
 if(wrap){
  wrap.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='empty-cart';p.textContent='Todavía no has añadido productos.';wrap.append(p);}
  items.forEach((item,i)=>{
   const row=document.createElement('div');row.className='cart-row';
   const title=document.createElement('strong');title.textContent=item.name||'Producto';
   const price=document.createElement('small');price.textContent=euro(item.price)+' / unidad';
   const controls=document.createElement('div');controls.className='cart-row-controls';
   const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Restar');minus.addEventListener('click',()=>changeQty(i,-1));
   const qty=document.createElement('span');qty.textContent=Number(item.qty)||1;
   const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Sumar');plus.addEventListener('click',()=>changeQty(i,1));
   const remove=document.createElement('button');remove.type='button';remove.textContent='Eliminar';remove.addEventListener('click',()=>{const a=readCart();a.splice(i,1);writeCart(a);renderCart();});
   controls.append(minus,qty,plus,remove);
   const comment=document.createElement('textarea');comment.rows=2;comment.placeholder='Personalización o comentario…';comment.value=item.comment||'';comment.setAttribute('aria-label','Personalización de '+(item.name||'producto'));
   comment.addEventListener('input',()=>{const a=readCart();if(a[i]){a[i].comment=comment.value;writeCart(a);}});
   row.append(title,document.createElement('br'),price,controls,comment);wrap.append(row);
  });
 }
 const empty=$('#empty-cart-btn');if(empty)empty.disabled=!items.length;
 const cont=$('#continue-order');if(cont)cont.disabled=!items.length;
}
function changeQty(i,delta){const a=readCart();if(!a[i])return;a[i].qty=(Number(a[i].qty)||1)+delta;if(a[i].qty<=0)a.splice(i,1);writeCart(a);renderCart();}
function openCart(){const drawer=$('.cart-drawer');drawer?.classList.add('open');$('.drawer-backdrop')?.classList.add('open');drawer?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';renderCart();}
function closeCart(){const drawer=$('.cart-drawer');drawer?.classList.remove('open');$('.drawer-backdrop')?.classList.remove('open');drawer?.setAttribute('aria-hidden','true');document.body.style.overflow='';}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-open-cart]'))openCart();
 if(e.target.closest('[data-close-cart]'))closeCart();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});
$('#empty-cart-btn')?.addEventListener('click',()=>{
 if(!readCart().length)return;
 const layer=document.createElement('div');layer.className='modal-backdrop open';layer.style.zIndex='210';
 layer.innerHTML=`<div class="confirm-modal" role="dialog" aria-modal="true"><h3>¿Vaciar carrito?</h3><p>Se eliminarán todos los productos que has añadido.</p><div class="confirm-btns"><button type="button" class="btn" data-cancel-empty>Cancelar</button><button type="button" class="btn" data-confirm-empty>Sí, vaciar</button></div></div>`;
 document.body.append(layer);
 layer.querySelector('[data-cancel-empty]').addEventListener('click',()=>layer.remove());
 layer.querySelector('[data-confirm-empty]').addEventListener('click',()=>{writeCart([]);renderCart();layer.remove();});
});
const checkout=$('#checkout-view')||document.createElement('section');
checkout.id='checkout-view';checkout.style.display='none';checkout.style.flex='1';checkout.style.overflow='auto';
checkout.innerHTML=`<div style="margin-bottom:15px"><button type="button" class="text-button" id="back-to-cart">← Volver al carrito</button></div>
<form id="order-form" class="form-card" style="padding:20px;background:var(--pink-soft);border-color:#f0d5e1">
<label>Nombre *<input id="customer-name" required autocomplete="name"></label>
<label>Correo electrónico *<input id="customer-email" type="email" required autocomplete="email"></label>
<label>Teléfono *<input id="customer-phone" required inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="tel"></label>
<label>Dirección de envío *<textarea id="customer-address" rows="2" required autocomplete="street-address"></textarea></label>
<label>Comentario general<textarea id="customer-comment" rows="3"></textarea></label>
<p class="small-note">El importe mostrado es estimado y no incluye los gastos de envío. En esta etapa no se realizará ningún cargo; Silvia contactará contigo para confirmar los detalles y el importe definitivo.</p>
<button class="btn btn-primary full-width" id="submit-order" type="submit">Enviar solicitud de pedido</button><p id="order-status" role="status"></p>
</form>`;
$('.cart-drawer')?.append(checkout);
function showCheckout(){
 if(!readCart().length)return;
 $('#cart-items').style.display='none';$('.cart-summary').style.display='none';$('#checkout-view').style.display='block';
 $('.drawer-head h2').textContent='Datos de tu solicitud';$('.drawer-head .eyebrow').textContent='Un último paso';
}
function backToCart(){
 $('#checkout-view').style.display='none';$('#cart-items').style.display='';$('.cart-summary').style.display='block';
 $('.drawer-head h2').textContent='Mi carrito';$('.drawer-head .eyebrow').textContent='Tus favoritos';
}
$('#continue-order')?.addEventListener('click',showCheckout);
$('#back-to-cart')?.addEventListener('click',backToCart);
$('#customer-phone')?.addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,9);});
async function sendOrder(e){
 e.preventDefault();const items=readCart();if(!items.length)return;
 const name=$('#customer-name').value.trim(),email=$('#customer-email').value.trim(),phone=$('#customer-phone').value.trim(),address=$('#customer-address').value.trim(),comment=$('#customer-comment').value.trim();
 if(!name||!email||!phone||!address){showAlert('Datos incompletos','Completa los campos obligatorios.');return;}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length!==9){showAlert('Revisa tus datos','Comprueba el correo y el teléfono de nueve dígitos.');return;}
 const total=items.reduce((n,x)=>n+(Number(x.price)||0)*(Number(x.qty)||0),0);
 const products=items.map(x=>`- ${x.qty}x ${x.name} | Personalización: ${x.comment||'Sin detalles'}`).join('\n');
 const payload={action:'order',Cliente:name,Email:email,Telefono:phone,Direccion:address,Productos:products,Total:`${total.toFixed(2).replace('.',',')} €`,Comentario:comment};
 const button=$('#submit-order');button.disabled=true;button.textContent='Enviando solicitud…';
 try{
  if(!cfg.appsScriptUrl)throw new Error('La conexión de pedidos no está configurada.');
  const response=await fetch(cfg.appsScriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
  if(!response.ok)throw new Error('El servidor no ha aceptado la solicitud (HTTP '+response.status+').');
  const result=await response.json();if(result.status!=='success'||!result.order)throw new Error(result.message||'No se ha podido confirmar el registro del pedido.');
  writeCart([]);renderCart();backToCart();closeCart();$('#order-form').reset();
  showAlert('¡Solicitud enviada!','Tu solicitud se ha registrado correctamente. Silvia se pondrá en contacto contigo para confirmar los detalles y la forma de pago.');
 }catch(err){showAlert('Hubo un problema','No hemos podido verificar el registro de tu solicitud. El carrito se conserva. Puedes intentarlo de nuevo más tarde o escribir a '+(cfg.email||'contacto@silviacrea.es')+'. Detalle: '+err.message);}
 finally{button.disabled=false;button.textContent='Enviar solicitud de pedido';}
}
$('#order-form')?.addEventListener('submit',sendOrder);
const add=$('#detail-add');
if(add){add.addEventListener('click',()=>{
 const items=readCart(),found=items.find(x=>x.name===d.name);
 if(found)found.qty=(Number(found.qty)||1)+1;else items.push({name:d.name,price:Number(d.price)||0,qty:1,comment:''});
 writeCart(items);renderCart();$('#detail-cart-note').textContent='Añadido a tu carrito ♡';
});}
renderCart();
if(d.album&&d.albumFolder){
 const endpoint=(cfg.albumApiUrl||'https://worker.silviacrea.es/album')+'?folder='+encodeURIComponent(d.albumFolder)+'&name='+encodeURIComponent(d.album);
 fetch(endpoint).then(r=>r.ok?r.json():[]).then(payload=>{
  const arr=Array.isArray(payload)?payload:(payload.images||payload.photos||payload.files||[]);
  if(!arr.length)return;const section=$('#detail-album'),wrap=$('#detail-thumbnails');section.hidden=false;
  arr.forEach((entry,i)=>{const raw=typeof entry==='string'?entry:(entry.url||entry.src||entry.path||'');if(!raw)return;
   const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Ver imagen '+(i+1));
   const im=document.createElement('img');im.loading='lazy';im.alt=(d.name||'Imagen')+' – fotografía '+(i+1);im.src=imageUrl(raw,'thumb');b.appendChild(im);
   b.addEventListener('click',()=>{main.src=imageUrl(raw,'detail');wrap.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-current'));b.setAttribute('aria-current','true');});wrap.appendChild(b);
  });
 }).catch(()=>{});
}
})();