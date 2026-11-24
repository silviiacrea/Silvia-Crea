(()=>{'use strict';
const d=window.SILVIA_DETAIL||{},$=s=>document.querySelector(s),cartKey='silviacrea_cart_v2';
$('#year').textContent=new Date().getFullYear();
function imageUrl(raw,mode='thumb'){
 try{const u=new URL(raw,location.href);if(u.hostname==='worker.silviacrea.es'&&u.pathname.startsWith('/i/')){u.searchParams.set('wm',mode);u.searchParams.set('v','52');return u.href;}}catch{}return raw;
}
const main=$('#detail-image');
if(main){main.src=imageUrl(d.image,'detail');main.addEventListener('error',()=>{main.alt='Imagen no disponible: '+(d.name||'creación');});}
function readCart(){try{const x=JSON.parse(localStorage.getItem(cartKey)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
function writeCart(items){localStorage.setItem(cartKey,JSON.stringify(items));}
function euro(n){return (Number(n)||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});}
function renderCart(){
 const items=readCart(),wrap=$('#cart-items');let units=0,total=0;
 items.forEach(x=>{units+=Number(x.qty)||0;total+=(Number(x.qty)||0)*(Number(x.price)||0);});
 document.querySelectorAll('.cart-count').forEach(x=>x.textContent=units);
 $('#cart-units').textContent=units;$('#cart-total').textContent=euro(total);
 if(!wrap)return;
 wrap.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.className='empty-cart';p.textContent='Todavía no has añadido productos.';wrap.appendChild(p);return;}
 items.forEach((item,i)=>{
  const row=document.createElement('div');row.className='cart-row';
  const title=document.createElement('strong');title.textContent=item.name||'Producto';
  const price=document.createElement('small');price.textContent=euro(item.price)+' / unidad';
  const controls=document.createElement('div');controls.className='cart-row-controls';
  const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Restar');minus.addEventListener('click',()=>changeQty(i,-1));
  const qty=document.createElement('span');qty.textContent=Number(item.qty)||1;
  const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Sumar');plus.addEventListener('click',()=>changeQty(i,1));
  const remove=document.createElement('button');remove.type='button';remove.textContent='Eliminar';remove.addEventListener('click',()=>{const a=readCart();a.splice(i,1);writeCart(a);renderCart();});
  controls.append(minus,qty,plus,remove);row.append(title,document.createElement('br'),price,controls);wrap.appendChild(row);
 });
}
function changeQty(i,delta){const a=readCart();if(!a[i])return;a[i].qty=(Number(a[i].qty)||1)+delta;if(a[i].qty<=0)a.splice(i,1);writeCart(a);renderCart();}
function openCart(){document.querySelector('.cart-drawer')?.classList.add('open');document.querySelector('.drawer-backdrop')?.classList.add('open');document.querySelector('.cart-drawer')?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';renderCart();}
function closeCart(){document.querySelector('.cart-drawer')?.classList.remove('open');document.querySelector('.drawer-backdrop')?.classList.remove('open');document.querySelector('.cart-drawer')?.setAttribute('aria-hidden','true');document.body.style.overflow='';}
document.addEventListener('click',e=>{if(e.target.closest('[data-open-cart]'))openCart();if(e.target.closest('[data-close-cart]'))closeCart();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});
const add=$('#detail-add');
if(add){add.addEventListener('click',()=>{
 const items=readCart(),found=items.find(x=>x.name===d.name);
 if(found)found.qty=(Number(found.qty)||1)+1;else items.push({name:d.name,price:Number(d.price)||0,qty:1,comment:''});
 writeCart(items);renderCart();$('#detail-cart-note').textContent='Añadido a tu carrito ♡';
});}
renderCart();
if(d.album&&d.albumFolder){
 const endpoint='https://worker.silviacrea.es/album?folder='+encodeURIComponent(d.albumFolder)+'&name='+encodeURIComponent(d.album);
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