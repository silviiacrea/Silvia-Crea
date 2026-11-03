(() => {
// --- SISTEMA DE MEMORIA AVANZADO PARA GOOGLE SITES ---
const pageMap = {'home': 'index.html', 'shop': 'tienda.html', 'gallery': 'galeria.html', 'about': 'sobre-mi.html', 'orders': 'encargos.html', 'contact': 'contacto.html'};
const actualPage = document.body.dataset.page;
const currentHtml = pageMap[actualPage] || 'index.html';
const savedHtml = sessionStorage.getItem('silviacrea_current_page');

let isBackForward = false;
if (window.performance) {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0 && navEntries[0].type === "back_forward") isBackForward = true;
    else if (performance.navigation && performance.navigation.type === 2) isBackForward = true;
}

if (isBackForward) {
    sessionStorage.setItem('silviacrea_current_page', currentHtml);
} else if (savedHtml && savedHtml !== currentHtml && currentHtml === 'index.html') {
    window.location.replace(savedHtml);
    return; 
} else {
    sessionStorage.setItem('silviacrea_current_page', currentHtml);
}
// -----------------------------------------------------

const cfg = window.SILVIA_CONFIG || {};   
const $ = (s, root=document) => root.querySelector(s); const $$ = (s, root=document) => [...root.querySelectorAll(s)];   
const CART_KEY = "silviacrea_cart_v2";   
let products = [], specialties = [], gallery = [], cart = loadCart(), modalProduct = null, toastTimer;   

function csvUrl(sheet){return `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;}   
function parseCSV(text){   
const rows=[]; let row=[], cell="", quoted=false;   
for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];   
if(c==='"'&&quoted&&n==='"'){cell+='"';i++;}   
else if(c==='"'){quoted=!quoted;}   
else if(c===','&&!quoted){row.push(cell);cell="";}   
else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell="";}   
else cell+=c;   
}   
row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);   
return rows;   
}   
async function getSheet(name){   
const res=await fetch(csvUrl(name)); if(!res.ok) throw new Error("No se pudo leer "+name);   
const rows=parseCSV(await res.text()); return rows.slice(1);   
}   
const val=(r,i)=>String(r[i]??"").trim();   
const yes=v=>["si","sí","true","1","yes","verdadero","x","destacado"].includes(String(v).trim().toLowerCase());   
const money=v=>Number(String(v??"0").replace(/[€\s]/g,"").replace(/\./g,"").replace(",", "."))||0;   
const euro=v=>Number(v).toLocaleString("es-ES",{style:"currency",currency:"EUR"});   
const safeImg=(url)=>/^https?:\/\//i.test(url||"")?url:"";   
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));   
function loadCart(){try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]").filter(x=>x&&x.name&&Number(x.price)>=0&&Number(x.qty)>0);}catch{return[];}}   
function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify(cart));}catch{}}   
function showToast(msg){const el=$("#toast");if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2400);} function updateCart(){ $$(".cart-count").forEach(el=>el.textContent=cart.reduce((n,x)=>n+x.qty,0));   
const items=$("#cart-items"); if(!items)return;   
if(!cart.length){items.innerHTML='<p class="empty-cart">Todavía no has añadido productos.</p>';}   
else items.innerHTML=cart.map((x,i)=>`<div class="cart-row"><div class="cart-row-top"><div><strong>${esc(x.name)}</strong><br><small>${euro(x.price)} / unidad</small></div><b>${euro(x.price*x.qty)}</b></div><div class="cart-row-controls"><button data-qty="-1" data-index="${i}" aria-label="Restar">−</button><span>${x.qty}</span><button data-qty="1" data-index="${i}" aria-label="Sumar">+</button><button data-remove="${i}">Eliminar</button></div><textarea data-comment="${i}" rows="2" placeholder="Personalización o comentario…">${esc(x.comment||"")}</textarea></div>`).join("");   
const units=cart.reduce((n,x)=>n+x.qty,0), total=cart.reduce((n,x)=>n+x.qty*x.price,0);   
$("#cart-units").textContent=units; $("#cart-total").textContent=euro(total);   
saveCart();  
 const emptyBtn = $("#empty-cart-btn");  
 if(emptyBtn) emptyBtn.style.display = cart.length ? "block" : "none";  
 }   
function openCart(){ $(".cart-drawer")?.classList.add("open");$(".drawer-backdrop")?.classList.add("open");$(".cart-drawer")?.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";}   
function closeCart(){ $(".cart-drawer")?.classList.remove("open");$(".drawer-backdrop")?.classList.remove("open");$(".cart-drawer")?.setAttribute("aria-hidden","true");document.body.style.overflow="";}   
function addProduct(p){if(!p||p.stock<=0){showToast("Este producto no está disponible ahora mismo.");return;}const unitPrice=p.offer&&p.offerPrice!==undefined?p.offerPrice:p.price;const found=cart.find(x=>x.name===p.name);if(found){if(found.qty<p.stock)found.qty++;else showToast("Has alcanzado el stock disponible.");}else cart.push({name:p.name,price:unitPrice,qty:1,comment:""});updateCart();showToast("Añadido a tu carrito ♡");}   

function openProduct(p,isProduct=false,idx=0){   
  modalProduct=isProduct?p:null;   
  $("#modal-title").textContent=p.name||p.title||"";   
  $("#modal-description").textContent=p.detail||p.description||p.desc||"";   
  const priceEl=$("#modal-price");   
  if(isProduct){   
  priceEl.innerHTML=p.offer&&p.offerPrice!==undefined?`<div class="old-price-box"><del>${euro(p.price)}</del></div><div class="current-price-box"><strong>${euro(p.offerPrice)}</strong></div>`: `<div class="old-price-box"></div><div class="current-price-box"><strong>${euro(p.price)}</strong></div>`;   
  priceEl.style.display="flex";   
  $("#modal-add").style.display=p.stock>0?"inline-flex":"none";   
  }else{priceEl.textContent="";priceEl.style.display="none";$("#modal-add").style.display="none";}   
  
  const im=$("#modal-image"), ph=$("#modal-placeholder"), src=safeImg(p.largeImage||p.image);
  if(src){im.src=src;im.alt=p.name||p.title||"";im.style.display="block";if(ph)ph.style.display="none";}
  else{im.src="";im.style.display="none";if(ph)ph.style.display="flex";}
  
  const m=$(".product-modal");
  if(m){m.classList.remove("theme-pink","theme-lilac");m.classList.add(idx%2===0?"theme-pink":"theme-lilac");}

  $("#product-modal")?.classList.add("open");$("#product-modal")?.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";   
} 

function closeProduct(){$("#product-modal")?.classList.remove("open");$("#product-modal")?.setAttribute("aria-hidden","true");document.body.style.overflow="";}   

function prepareSlider(el,count){   
if(!el)return;   
el.classList.remove("has-slider","is-centered");   
el.classList.add(count>3?"has-slider":"is-centered");   
el.setAttribute("aria-label",count>3?"Carrusel de elementos; desplázate horizontalmente para ver más":"Elementos destacados");   
  
// --- ARRASTRAR CON MARIPOSA (LÓGICA SEPARADA DE CLIC) ---
if (count > 3) {
    let isDown = false;
    let startX;
    let scrollLeft;
    let hasMoved = false;

    el.addEventListener('mousedown', (e) => {
        isDown = true;
        hasMoved = false;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
    });

    el.addEventListener('mousemove', (e) => {
        if(!isDown) return;
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX);
        if (Math.abs(walk) > 5) {
            hasMoved = true;
            el.classList.add('dragging');
            el.scrollLeft = scrollLeft - (walk * 0.8);
        }
    });

    const stopDragging = () => {
        isDown = false;
        el.classList.remove('dragging');
    };

    el.addEventListener('mouseup', stopDragging);
    el.addEventListener('mouseleave', stopDragging);
    
    // Si se arrastró más de 5px, bloqueamos el clic para que no abra la tarjeta
    el.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
        }
    }, true);
}
// --------------------------------------------------

if(count>3 && !el.parentElement.classList.contains("slider-wrapper")){  
 const wrapper = document.createElement("div");  
 wrapper.className = "slider-wrapper";  
 el.parentNode.insertBefore(wrapper, el);  
 wrapper.appendChild(el);  
   
const btnLeft = document.createElement("button");  
 btnLeft.className = "slider-btn slider-btn-left";  
 btnLeft.innerHTML = "❮";  
 btnLeft.setAttribute("aria-label", "Anterior");  
   
const btnRight = document.createElement("button");  
 btnRight.className = "slider-btn slider-btn-right";  
 btnRight.innerHTML = "❯";  
 btnRight.setAttribute("aria-label", "Siguiente");  
   
wrapper.appendChild(btnLeft);  
 wrapper.appendChild(btnRight);  
   
btnLeft.addEventListener("click", () => {  
 const card = el.querySelector(".item-card");  
 if(card) el.scrollBy({left: -(card.offsetWidth + 24), behavior: "smooth"});  
 });  
 btnRight.addEventListener("click", () => {  
 const card = el.querySelector(".item-card");  
 if(card) el.scrollBy({left: (card.offsetWidth + 24), behavior: "smooth"});  
 });  
 }  
 }   

function card(p,kind,index){   
const image=safeImg(p.image), desc=p.description||p.desc||"";   
const isProduct=kind==="product";   
let metaHtml="";   
if(isProduct){   
  const hasOffer = p.offer&&p.offerPrice!==undefined;
  const lowStock = p.stock>0&&p.stock<=5;
  const isOut = p.stock<=0;
  
  metaHtml = `<div class="item-meta">
      <div class="price-wrapper">
          <div class="old-price-box">${(hasOffer && !isOut) ? `<del>${euro(p.price)}</del>` : ''}</div>
          <div class="current-price-box">${isOut ? '<span class="stock-out">Agotado</span>' : `<strong>${euro(hasOffer?p.offerPrice:p.price)}</strong>`}</div>
      </div>
      <div class="stock-box">${(lowStock && !isOut) ? '<span class="low-stock">Pocas unidades</span>' : ''}</div>
  </div>`;
}   
const featured=p.featured?'<span class="featured-label">Destacado</span>':'';   
const offer=isProduct&&p.offer?'<span class="offer-label">Oferta</span>':'';   
const classes=["item-card",kind==="gallery"?"gallery-card":"",p.featured?"is-featured":"",isProduct&&p.offer?"is-offer":""].filter(Boolean).join(" ");   
  
return `<article class="${classes}" data-card-kind="${kind}" data-index="${index}" tabindex="0" role="group" aria-label="${esc(p.name||p.title)}. Pulsa para ver el detalle">   
${featured}${offer}   
${image?`<div class="image-wrapper"><img class="item-image" src="${esc(image)}" alt="${esc(p.name||p.title)}" loading="lazy" draggable="false"></div>`:`<div class="image-wrapper"><div class="item-image placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" width="42" height="42" stroke="#b69bd2" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div></div>`}   
<div class="item-content"><h3>${esc(p.name||p.title)}</h3><p>${esc(desc)}</p>   
${metaHtml}
<div class="item-actions"><button class="mini-btn detail-button" type="button" data-detail-card="${kind}" data-index="${index}">Ver detalle</button>${isProduct?`<button class="mini-btn add-button" type="button" data-add="${index}" ${p.stock<=0?"disabled":""}>Añadir carrito</button>`:''}</div>   
</div></article>`;   
}   
async function loadProducts(){   
const rows=await getSheet("CATALOGO");   
products=rows.filter(r=>val(r,0)).map(r=>({name:val(r,0),description:val(r,1),price:money(val(r,2)),image:val(r,3),stock:val(r,4)===""?99:Math.max(0,parseInt(val(r,4),10)||0),detail:val(r,5),largeImage:val(r,6),featured:yes(val(r,7)),offer:yes(val(r,8)),offerPrice:val(r,9)===""?undefined:money(val(r,9))}));   
products.sort((a,b) => (a.featured === b.featured ? 0 : a.featured ? -1 : 1));  
 const grid=$("#products-grid");if(grid){grid.innerHTML=products.length?products.map((p,i)=>card(p,"product",i)).join(""):'<p class="loading-note">Todavía no hay productos disponibles.</p>';prepareSlider(grid,products.length);}   
}   
async function loadSpecialties(){   
const rows=await getSheet("ESPECIALIDADES");   
specialties=rows.filter(r=>val(r,0)).map(r=>({name:val(r,0),description:val(r,1),image:val(r,2),detail:val(r,3),largeImage:val(r,4),featured:yes(val(r,5))}));   
specialties.sort((a,b) => (a.featured === b.featured ? 0 : a.featured ? -1 : 1));  
 const grid=$("#specialties-grid");if(grid){grid.innerHTML=specialties.length?specialties.map((p,i)=>card(p,"specialty",i)).join(""):'<p class="loading-note">Próximamente descubrirás aquí mis especialidades.</p>';prepareSlider(grid,specialties.length);}   
}   
async function loadGallery(){   
const rows=await getSheet("TRABAJOS");   
gallery=rows.filter(r=>val(r,0)).map(r=>({name:val(r,0),image:val(r,1),description:val(r,2),detail:val(r,3),largeImage:val(r,4)}));   
const grid=$("#gallery-grid");if(grid){grid.innerHTML=gallery.length?gallery.map((p,i)=>card(p,"gallery",i)).join(""):'<p class="loading-note">Todavía no hay trabajos publicados.</p>';prepareSlider(grid,gallery.length);}   
}   
function showLoadError(id){const el=$(id);if(el)el.innerHTML='<p class="loading-note">No se ha podido cargar el contenido. Inténtalo de nuevo más tarde.</p>';}   
function initMenu(){  
 const btn=$(".menu-toggle"),nav=$(".main-nav");  
 btn?.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));});  
   
 const cartTrigger = $(".cart-trigger");  
 if(cartTrigger) {  
    // Nuevo icono de Carrito Cozy en tonos lila y rosa pastel
    const cozyCart = `<svg class="cart-svg-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#765b89" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h3l2.25 10.5a2.5 2.5 0 0 0 2.5 2h7.5a2.5 2.5 0 0 0 2.5 -2l1.5 -7.5h-14" fill="#fbecf3"/><circle cx="10" cy="19.5" r="2" fill="#b99acb" stroke="#765b89"/><circle cx="17" cy="19.5" r="2" fill="#b99acb" stroke="#765b89"/></svg>`;
    if(cartTrigger.innerHTML.includes("♡")) cartTrigger.innerHTML = cartTrigger.innerHTML.replace("♡", cozyCart);
    if(cartTrigger.innerHTML.includes("✿")) cartTrigger.innerHTML = cartTrigger.innerHTML.replace("✿", cozyCart);
    if(cartTrigger.innerHTML.includes("svg")) {
        // Si ya tenía un svg previo, lo actualizamos limpiamente
        const textPart = cartTrigger.querySelector("span")?.outerHTML || '<span style="display:inline">Carrito</span>';
        const countPart = cartTrigger.querySelector("b")?.outerHTML || cartTrigger.querySelector(".cart-count")?.outerHTML || '<b>0</b>';
        cartTrigger.innerHTML = `${cozyCart} ${textPart} ${countPart}`;
    }
 }  
   
 const drawerHead = $(".drawer-head");  
 if(drawerHead && !$("#empty-cart-btn")) {  
 const emptyBtn = document.createElement("button");  
 emptyBtn.id = "empty-cart-btn";  
 emptyBtn.className = "text-button empty-btn-style";  
 emptyBtn.innerHTML = "Vaciar";  
 emptyBtn.type = "button";  
 drawerHead.insertBefore(emptyBtn, drawerHead.querySelector(".icon-button"));  
   
emptyBtn.addEventListener("click", () => {  
 if(cart.length > 0) {  
 const backdrop = document.createElement("div");  
 backdrop.className = "modal-backdrop open";  
 backdrop.style.zIndex = "200";  
 backdrop.innerHTML = `<div class="confirm-modal" role="dialog" aria-modal="true" style="background:var(--blue-pastel-soft); border-color:#c3d7f0;">  
 <h3>¿Vaciar carrito?</h3>  
 <p>Se eliminarán todos los productos que has añadido.</p>  
 <div class="confirm-btns">  
 <button class="btn" id="btn-cancel-empty" style="background:var(--pink-soft); color:var(--lilac-dark); border:1px solid #f0d5e1;">Cancelar</button>  
 <button class="btn" id="btn-confirm-empty" style="background:var(--lilac-card); color:var(--pink-dark); border:1px solid #dfceeb;">Sí, vaciar</button>  
 </div>  
 </div>`;  
 document.body.appendChild(backdrop);  
   
document.getElementById("btn-cancel-empty").onclick = () => backdrop.remove();  
 document.getElementById("btn-confirm-empty").onclick = () => {  
 cart = [];  
 updateCart();  
 backdrop.remove();  
 };  
 }  
 });  
 }  
 }   
async function sendContact(e){   
e.preventDefault();const form=e.currentTarget,status=$("#contact-status"),button=form.querySelector("button[type=submit]");   
const data=new FormData(form),name=String(data.get("name")||"").trim(),email=String(data.get("email")||"").trim(),message=String(data.get("message")||"").trim();   
button.disabled=true;button.textContent="Preparando correo…";   
const subject=encodeURIComponent("Consulta desde la web de Silvia Crea");   
const body=encodeURIComponent(`Nombre: ${name}\nCorreo: ${email}\n\n${message}`);   
window.location.href=`mailto:${cfg.email}?subject=${subject}&body=${body}`;   
status.textContent="Se ha abierto tu aplicación de correo para que puedas enviar el mensaje.";   
button.disabled=false;button.textContent="Enviar consulta";   
}

function showCustomAlert(title, message) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop open";
    backdrop.style.zIndex = "200";
    backdrop.innerHTML = `<div class="confirm-modal" role="dialog" aria-modal="true" style="background:var(--blue-pastel-soft); border-color:#c3d7f0;">
        <h3 style="color:var(--lilac-dark); font-size: 24px;">${title}</h3>
        <p style="color:var(--muted);">${message}</p>
        <div class="confirm-btns">
            <button class="btn btn-primary" onclick="this.closest('.modal-backdrop').remove()">Aceptar</button>
        </div>
    </div>`;
    document.body.appendChild(backdrop);
}

async function sendOrder(){   
if(!cart.length){showToast("Tu carrito está vacío.");return;}   
const name=$("#customer-name")?.value.trim(),email=$("#customer-email")?.value.trim(),phone=$("#customer-phone")?.value.trim(),address=$("#customer-address")?.value.trim(),comment=$("#customer-comment")?.value.trim();   
if(!name||!email||!phone||!address){showToast("Completa los datos obligatorios.");return;}   
  
const emailRegex