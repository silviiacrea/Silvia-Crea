(() => {  
// Mapa de páginas estáticas; no se fuerza la navegación según la última página visitada.
const pageMap = {'home':'index.html','shop':'tienda.html','gallery':'galeria.html','about':'sobre-mi.html','orders':'encargos.html','contact':'contacto.html','category':'categoria.html'};
const actualPage = document.body.dataset.page;
const currentHtml = pageMap[actualPage] || 'index.html';

// CALCULADOR EXACTO DE COORDENADAS DE LA PANTALLA
// Este bloque evalúa dónde pincha exactamente el usuario y se lo manda al CSS
// para que dibuje el modal en el centro visual exacto en ese mismo instante.
function updateViewVars(e) {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const pageY = e.touches ? e.touches[0].pageY : e.pageY;
    if (clientY === undefined || pageY === undefined) return;
    
    // Distancia desde el tope absoluto de la web hasta lo que está viendo el usuario
    const scrollTop = Math.max(0, pageY - clientY);
    // Altura real visible de su pantalla
    const vHeight = window.visualViewport ? window.visualViewport.height : Math.min(window.innerHeight, window.screen.height);
    
    // Transmitir al CSS para centrar dinámicamente
    document.documentElement.style.setProperty('--center-y', `${scrollTop + (vHeight / 2)}px`);
    document.documentElement.style.setProperty('--scroll-y', `${scrollTop}px`);
    document.documentElement.style.setProperty('--view-h', `${vHeight}px`);
}
document.addEventListener("click",ev=>{const contactButton=ev.target.closest("[data-open-order-contact]");if(contactButton&&document.body.dataset.page==="orders"){ev.preventDefault();ev.stopImmediatePropagation();openOrderContact();}},true);
document.addEventListener("click", updateViewVars, true);
document.addEventListener("touchstart", updateViewVars, {passive: true, capture: true});
// La ficha queda fija a la pantalla; los gestos sobre el área exterior desplazan el documento de fondo.
let modalBackgroundTouchY=0;
let productModalCloseTimer=null;
document.addEventListener("wheel",ev=>{if(ev.target.closest?.("#product-modal.open")&&!ev.target.closest(".product-modal")){window.scrollBy({top:ev.deltaY,left:ev.deltaX,behavior:"auto"});ev.preventDefault();}}, {passive:false,capture:true});
document.addEventListener("touchstart",ev=>{if(ev.target.closest?.("#product-modal.open")&&!ev.target.closest(".product-modal"))modalBackgroundTouchY=ev.touches[0]?.clientY||0;},{passive:true,capture:true});
document.addEventListener("touchmove",ev=>{if(ev.target.closest?.("#product-modal.open")&&!ev.target.closest(".product-modal")){const y=ev.touches[0]?.clientY||modalBackgroundTouchY;window.scrollBy({top:modalBackgroundTouchY-y,behavior:"auto"});modalBackgroundTouchY=y;ev.preventDefault();}},{passive:false,capture:true});
// -----------------------------------------------------  
  
const cfg = window.SILVIA_CONFIG || {};
function updateSilviaVisualViewport(){
 const vv=window.visualViewport;
 const top=vv?vv.offsetTop:0,left=vv?vv.offsetLeft:0,width=vv?vv.width:window.innerWidth,height=vv?vv.height:window.innerHeight;
 const root=document.documentElement;
 root.style.setProperty("--silvia-vv-top",`${Math.max(0,top)}px`);
 root.style.setProperty("--silvia-vv-left",`${Math.max(0,left)}px`);
 root.style.setProperty("--silvia-vv-width",`${width}px`);
 root.style.setProperty("--silvia-vv-height",`${height}px`);
}
updateSilviaVisualViewport();
window.addEventListener("resize",updateSilviaVisualViewport,{passive:true});
window.addEventListener("scroll",updateSilviaVisualViewport,{passive:true});
if(window.visualViewport){window.visualViewport.addEventListener("resize",updateSilviaVisualViewport,{passive:true});window.visualViewport.addEventListener("scroll",updateSilviaVisualViewport,{passive:true});}
window.addEventListener("DOMContentLoaded",()=>{
 const fs=document.getElementById("fs-modal");if(fs&&fs.parentElement!==document.documentElement)document.documentElement.appendChild(fs);
 const pm=document.getElementById("product-modal");if(pm&&pm.parentElement!==document.documentElement)document.documentElement.appendChild(pm);
 updateSilviaVisualViewport();
},{once:true});   
const $ = (s, root=document) => root.querySelector(s); const $$ = (s, root=document) => [...root.querySelectorAll(s)];   
const CART_KEY = "silviacrea_cart_v2";   
let products = [], specialties = [], gallery = [], cart = loadCart(), modalProduct = null, toastTimer, modalPhotos = [], modalPhotoIndex = 0;
function encodePathUrl64(path){
  const bytes=new TextEncoder().encode(String(path));let binary="";bytes.forEach(b=>binary+=String.fromCharCode(b));
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function workerImage(url){
  if(!url)return "";const raw=String(url).trim();if(!raw)return "";
  try{
    const u=new URL(raw,location.href),base=(cfg.workerBaseUrl||"https://worker.silviacrea.es").replace(/\/$/,""),workerHost=new URL(base).hostname;
    if(u.hostname.endsWith("backblazeb2.com")){
      if(!u.pathname.startsWith("/file/silviacreacatalogo/"))return "";
      const path=decodeURIComponent(u.pathname.slice("/file/silviacreacatalogo/".length));return base+"/i/"+encodePathUrl64(path)+"?wm=card";
    }
    if(u.hostname===workerHost){
      const match=u.pathname.match(/^\/file\/silviacreacatalogo\/(.+)$/);
      if(match){const path=decodeURIComponent(match[1]);return base+"/i/"+encodePathUrl64(path)+"?wm="+(u.searchParams.get("wm")||"card");}
      if(u.pathname.startsWith("/i/")){if(!u.searchParams.has("wm"))u.searchParams.set("wm","card");return u.href;}
      if(u.pathname==="/logo.png")return u.href;
    }
    if(u.origin===location.origin&&!/^https?:\/\//i.test(raw))return raw;
    return ""; // external images are blocked unless routed through the Cloudflare Worker
  }catch{return "";}
}
const MAINTENANCE_CHECK_INTERVAL=15000;
let maintenancePollTimer=null, maintenanceStatusFailures=0, pageContentLoaded=false, maintenanceCurrentState=null;
let siteDataPromise=null;
function normalizeSiteData(raw){
 if(raw&&raw.data&&typeof raw.data==="object")raw=raw.data;
 if(raw&&raw.website&&typeof raw.website==="object")raw=raw.website;
 return raw;
}
function validSiteData(data){
 data=normalizeSiteData(data);
 return !!(data&&(Array.isArray(data.catalogo)||Array.isArray(data.trabajos)||Array.isArray(data.especialidades)));
}
function getDataSources(){
 const sources=[];
 // datos.json is stored beside the HTML files in the GitHub Pages root.
 // Fetch it from the website's own origin first to avoid cross-origin/CORS failures.
 try{sources.push(new URL("/datos.json",location.origin).href);}catch{}
 if(cfg.dataJsonUrl)sources.push(cfg.dataJsonUrl);
 if(cfg.workerBaseUrl)sources.push(cfg.workerBaseUrl.replace(/\/$/,"")+"/datos.json");
 if(cfg.appsScriptUrl){sources.push(cfg.appsScriptUrl);try{const u=new URL(cfg.appsScriptUrl);u.searchParams.set("action","data");sources.push(u.href);}catch{}}
 return [...new Set(sources.filter(Boolean))];
}
async function fetchJsonNoCache(url){
 const u=url+(url.includes("?")?"&":"?")+"scv="+Date.now()+"_"+Math.random().toString(36).slice(2);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  // No custom request headers and no forced CORS mode. Same-origin datos.json
  // is the primary source, with cross-origin fallbacks only if needed.
  const response=await fetch(u,{cache:"no-store",signal:controller.signal});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const text=await response.text();let data;
  try{data=JSON.parse(text);}catch{throw new Error("La respuesta no es JSON válido");}
  return normalizeSiteData(data);
 }finally{clearTimeout(timer);}
}
const SITE_DATA_CACHE_KEY="silvia-crea-site-data-v29";
const SITE_DATA_CACHE_TTL=90*1000;
function readCachedSiteData(){
 try{const saved=JSON.parse(localStorage.getItem(SITE_DATA_CACHE_KEY)||"null");
  if(saved&&validSiteData(saved.data)&&Date.now()-saved.savedAt<SITE_DATA_CACHE_TTL)return saved.data;
 }catch{}
 return null;
}
function saveCachedSiteData(data){
 try{localStorage.setItem(SITE_DATA_CACHE_KEY,JSON.stringify({savedAt:Date.now(),data}));}catch{}
}
async function fetchFreshSiteData(){
 const cached=readCachedSiteData();
 if(cached){applyShopAccessImage(cached.imagenTiendaInicio||cached.shopImage||"");return cached;}
 const failures=[];
 for(const source of getDataSources()){
  try{
   const data=await fetchJsonNoCache(source);
   if(!validSiteData(data))throw new Error("JSON recibido, pero faltan las listas catalogo/trabajos/especialidades");
   saveCachedSiteData(data);
   applyShopAccessImage(data.imagenTiendaInicio||data.shopImage||"");
   return data;
  }catch(err){failures.push(new URL(source).hostname+": "+(err.message||"error"));}
 }
 // Si no hay red, permite mostrar el último catálogo guardado durante un máximo de 24 h.
 try{const saved=JSON.parse(localStorage.getItem(SITE_DATA_CACHE_KEY)||"null");if(saved&&validSiteData(saved.data)&&Date.now()-saved.savedAt<24*60*60*1000){applyShopAccessImage(saved.data.imagenTiendaInicio||saved.data.shopImage||"");return saved.data;}}catch{}
 throw new Error("No se pudo obtener datos.json. "+failures.join(" | "));
}
async function fetchMaintenanceStatus(){
 try{const data=await fetchFreshSiteData();return data.maintenance&&typeof data.maintenance.mode==="string"?data.maintenance:{mode:"normal"};}
 catch(err){console.warn("No se pudo comprobar el estado de la web:",err);return null;}
}
function startMaintenancePolling(){
 if(maintenancePollTimer)return;
 maintenancePollTimer=setInterval(async()=>{
  const state=await fetchMaintenanceStatus();
  if(state){maintenanceStatusFailures=0;applyMaintenanceState(state);}
  else maintenanceStatusFailures++;
 },MAINTENANCE_CHECK_INTERVAL);
}
async function getSiteData(){
 if(siteDataPromise)return siteDataPromise;
 siteDataPromise=fetchFreshSiteData().catch(err=>{siteDataPromise=null;throw err;});
 return siteDataPromise;
}
async function getSheet(name){
 const data=await getSiteData();
 const key={CATALOGO:"catalogo",TRABAJOS:"trabajos",ESPECIALIDADES:"especialidades"}[name];
 return key&&Array.isArray(data[key])?data[key]:[];
}
function applyShopAccessImage(url){
  const frame=$(".shop-access-frame"),img=$("#shop-access-image"),placeholder=$("#shop-access-placeholder");
  if(!frame||!img||!placeholder)return;
  const source=workerImage(url);
  if(source){img.onerror=()=>{img.style.display="none";placeholder.style.display="grid";};img.src=source;img.style.display="block";placeholder.style.display="none";}
  else{img.onerror=null;img.removeAttribute("src");img.style.display="none";placeholder.style.display="grid";}
}
const val=(r,i)=>String(r[i]??"").trim();   
const yes=v=>["si","sí","true","1","yes","verdadero","x","destacado"].includes(String(v).trim().toLowerCase());   
const money=v=>Number(String(v??"0").replace(/[€\s]/g,"").replace(/\./g,"").replace(",", "."))||0;   
const euro=v=>Number(v).toLocaleString("es-ES",{style:"currency",currency:"EUR"});   
const safeImg=(url)=>/^https?:\/\//i.test(url||"")?url:"";
const cleanCategory=value=>{const c=String(value??"").trim();return !c||c.toLowerCase()==="vacio"?"":c;};
const categoryParams=()=>{const q=new URLSearchParams(location.search);return {type:q.get("tipo")==="trabajos"?"gallery":"product",name:q.get("categoria")||""};};
function sizeCategoryTiles(root){
 const tilesRoot=root?.querySelector(".category-tiles")||root;
 const tiles=[...(tilesRoot?.querySelectorAll(".category-tile")||[])];if(!tiles.length)return;
 const maxText=Math.max(...tiles.map(tile=>{const span=tile.querySelector("span");if(!span)return 0;const oldWidth=span.style.width,oldMax=span.style.maxWidth;span.style.width="max-content";span.style.maxWidth="none";const measured=Math.ceil(span.scrollWidth);span.style.width=oldWidth;span.style.maxWidth=oldMax;return measured;}));
 const tileWidth=Math.min(Math.max(maxText+20,112),220);
 tilesRoot.style.setProperty("--category-tile-width",tileWidth+"px");
 tilesRoot.style.setProperty("--category-tile-count",String(tiles.length));
 // Ajusta el número de columnas al ancho real disponible y reparte las filas
 // de forma equilibrada: 10 elementos en un espacio para 7 => 5 + 5.
 const styles=getComputedStyle(tilesRoot);
 const gap=parseFloat(styles.columnGap)||10;
 const width=tilesRoot.clientWidth;
 const maxColumns=Math.max(1,Math.floor((width+gap)/(tileWidth+gap)));
 const rows=Math.ceil(tiles.length/maxColumns);
 const columns=Math.max(1,Math.ceil(tiles.length/rows));
 tilesRoot.style.setProperty("--category-columns",String(columns));
 tilesRoot.style.setProperty("--category-gap",gap+"px");
 tilesRoot.style.gridTemplateColumns=`repeat(${columns},minmax(0,1fr))`;
 const remainder=tiles.length%columns;
 tiles.forEach((tile,index)=>{
   tile.style.gridColumnStart="";
   const row=Math.floor(index/columns),column=index%columns;
   const shade=((row+column)%2===0)?1:2;
   tile.classList.toggle("category-color-1",shade===1);
   tile.classList.toggle("category-color-2",shade===2);
   if(remainder && index>=tiles.length-remainder){
     const offset=Math.floor((columns-remainder)/2);
     if(index===tiles.length-remainder) tile.style.gridColumnStart=String(offset+1);
   }
 });
}
let categoryResizeFrame=0;
window.addEventListener("resize",()=>{
 if(categoryResizeFrame)cancelAnimationFrame(categoryResizeFrame);
 categoryResizeFrame=requestAnimationFrame(()=>{
   categoryResizeFrame=0;
   document.querySelectorAll(".category-section-block").forEach(section=>sizeCategoryTiles(section));
 });
},{passive:true});

function categoryCards(items,type){
  const map=new Map();
  items.forEach(item=>{const name=cleanCategory(item.category);if(name&&!map.has(name))map.set(name,true);});
  return [...map.keys()].sort((a,b)=>a.localeCompare(b,"es")).map((name,i)=>{
    const href="categoria.html?tipo="+(type==="gallery"?"trabajos":"tienda")+"&categoria="+encodeURIComponent(name);
    const row=Math.floor(i/6),column=i%6;
    const shade=((row+column)%2===0)?1:2; // fila 1: oscuro/claro; fila 2: claro/oscuro
    return `<a class="category-tile category-color-${shade}" href="${href}"><span>${esc(name)}</span></a>`;
  }).join("");
}
function renderCategoryLanding(){
  const target=$("#category-grid"); if(!target) return;
  const params=categoryParams();
  const title=$("#category-title");
  if(title) title.textContent=params.name || "Categoría";
  const primary=$("#category-back-primary"), secondary=$("#category-back-secondary");
  if(params.type==="gallery"){
    if(primary){primary.href="galeria.html";primary.textContent="Volver a la galería";}
    if(secondary){secondary.href="tienda.html";secondary.textContent="Ver tienda";}
  }else{
    if(primary){primary.href="tienda.html";primary.textContent="Volver a la tienda";}
    if(secondary){secondary.href="galeria.html";secondary.textContent="Ver trabajos";}
  }
  const list=params.type==="gallery"?gallery:products;
  const selected=params.name?list.filter(item=>cleanCategory(item.category)===params.name):[];
  target.innerHTML=selected.length?selected.map(item=>card(item,params.type,list.indexOf(item))).join(""):'<p class="loading-note">No se ha seleccionado una categoría válida o todavía no tiene elementos.</p>';
  balanceGrid(target,selected.length);positionCardWatermarks(target);
}
   
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
  
function workerModeUrl(src,mode){if(!src)return "";try{const u=new URL(workerImage(src),location.href);if(u.hostname==="worker.silviacrea.es"&&u.pathname.startsWith("/i/")){u.searchParams.set("wm",mode);return u.href;}if(u.hostname==="worker.silviacrea.es"&&u.pathname.includes("/file/silviacreacatalogo/")){return workerImage(u.href).replace(/wm=[^&]*/,"wm="+mode);} }catch{}return workerImage(src);}
function imageIdentity(src){try{const u=new URL(src,location.href);u.search="";return u.href.toLowerCase();}catch{return String(src).split("?")[0].toLowerCase();}}
async function loadAlbumPhotos(item){
  if(!item || !item.album) return [];
  const group=item.albumFolder || item.albumType || "catalogo";
  const album=String(item.album).trim();
  if(!album) return [];
  const endpoint=(cfg.albumApiUrl||((cfg.workerBaseUrl||"https://worker.silviacrea.es").replace(/\/$/,"")+"/album"))+
    "?folder="+encodeURIComponent(group)+"&name="+encodeURIComponent(album);
  try{
    const response=await fetch(endpoint,{cache:"default"});
    if(!response.ok){console.warn("Album Worker respondió",response.status,endpoint);return [];}
    const data=await response.json();
    const photos=Array.isArray(data)?data:(data.images||data.photos||[]);
    return photos.map(x=>typeof x==="string"?x:(x.url||x.src||x.downloadUrl||"")).filter(safeImg).map(x=>workerModeUrl(x,"thumb"));
  }catch(err){console.warn("No se pudo cargar el álbum",item.album,err);return [];}
}
function setModalPhoto(index){
  if(!modalPhotos.length)return;
  modalPhotoIndex=(index+modalPhotos.length)%modalPhotos.length;
  const source=modalPhotos[modalPhotoIndex];
  const main=$("#modal-image");main.src=workerModeUrl(source,"modal");main.style.display="block";$("#modal-placeholder").style.display="none";
  const thumbs=$("#modal-album");if(thumbs)thumbs.querySelectorAll(".album-thumb").forEach((b,i)=>b.classList.toggle("active",i===modalPhotoIndex));
  ["modal-prev","modal-next"].forEach(id=>{const b=$("#"+id);if(b)b.style.display=modalPhotos.length>1?"flex":"none";});
}
function setupModalAlbum(photos,mainSrc){
  const wrap=$("#modal-img-wrapper");if(!wrap)return;
  let stage=$("#modal-photo-stage");if(!stage){stage=document.createElement("div");stage.id="modal-photo-stage";stage.className="modal-photo-stage";wrap.insertAdjacentElement("beforebegin",stage);stage.appendChild(wrap);}
  let prev=$("#modal-prev"),next=$("#modal-next");if(!prev){prev=document.createElement("button");prev.type="button";prev.id="modal-prev";prev.className="modal-stage-arrow";prev.setAttribute("aria-label","Fotografía anterior");prev.textContent="‹";prev.addEventListener("click",()=>setModalPhoto(modalPhotoIndex-1));stage.insertBefore(prev,wrap);}
  if(!next){next=document.createElement("button");next.type="button";next.id="modal-next";next.className="modal-stage-arrow";next.setAttribute("aria-label","Fotografía siguiente");next.textContent="›";next.addEventListener("click",()=>setModalPhoto(modalPhotoIndex+1));stage.appendChild(next);}
  let gallery=$("#modal-album");if(!gallery){gallery=document.createElement("div");gallery.id="modal-album";gallery.className="modal-album";stage.insertAdjacentElement("afterend",gallery);}
  const all=[mainSrc,...photos].filter(safeImg),seen=new Set();modalPhotos=all.filter(src=>{const key=imageIdentity(src);if(seen.has(key))return false;seen.add(key);return true;});modalPhotoIndex=0;
  gallery.innerHTML="";gallery.classList.add("album-loading");gallery.style.display=modalPhotos.length>1?"flex":"none";gallery.style.justifyContent=modalPhotos.length<=5?"center":"flex-start";$("#product-modal")?.classList.toggle("has-album",modalPhotos.length>1);
  const thumbImages=[];
  modalPhotos.forEach((src,i)=>{const b=document.createElement("button");b.type="button";b.className="album-thumb"+(i===0?" active":"");b.setAttribute("aria-label","Ver foto "+(i+1));const img=document.createElement("img");img.src=workerModeUrl(src,"thumb");img.alt="Foto "+(i+1);img.loading="eager";img.decoding="async";thumbImages.push(img);b.appendChild(img);img.addEventListener("load",()=>{img.classList.add("is-loaded");if(thumbImages.every(x=>x.complete))gallery.classList.remove("album-loading");},{once:true});img.addEventListener("error",()=>{img.classList.add("is-loaded");if(thumbImages.every(x=>x.complete))gallery.classList.remove("album-loading");},{once:true});if(img.complete&&img.naturalWidth>0)img.classList.add("is-loaded");b.addEventListener("click",()=>setModalPhoto(i));gallery.appendChild(b);});
  if(modalPhotos.length)setModalPhoto(0);else gallery.classList.remove("album-loading");
  if(thumbImages.every(x=>x.complete))requestAnimationFrame(()=>gallery.classList.remove("album-loading"));
}

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
 if(src){im.src=workerModeUrl(src,"modal");im.alt=p.name||p.title||"";im.style.display="block";if(ph)ph.style.display="none";}  
 else{im.src="";im.style.display="none";if(ph)ph.style.display="flex";}  
   
const m=$(".product-modal");  
 if(m){m.classList.remove("theme-pink","theme-lilac");m.classList.add(idx%2===0?"theme-pink":"theme-lilac");}  
  
 setupModalAlbum([],src);
 if(p.album){
   loadAlbumPhotos(p).then(photos=>{
     if(modalProduct===p || $("#modal-title").textContent===(p.name||p.title||"")) setupModalAlbum(photos,src);
   });
 }
 const productOverlay=$("#product-modal");if(productOverlay&&productOverlay.parentElement!==document.documentElement)document.documentElement.appendChild(productOverlay);if(productModalCloseTimer){clearTimeout(productModalCloseTimer);productModalCloseTimer=null;}productOverlay?.classList.remove("is-closing");updateSilviaVisualViewport();
 productOverlay?.classList.add("open");productOverlay?.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";document.documentElement.style.overflow="hidden";   
}   
  
function closeProduct(){const overlay=$("#product-modal");if(!overlay||!overlay.classList.contains("open"))return;overlay.classList.add("is-closing");overlay.setAttribute("aria-hidden","true");if(productModalCloseTimer)clearTimeout(productModalCloseTimer);productModalCloseTimer=setTimeout(()=>{overlay.classList.remove("open","is-closing","has-album");productModalCloseTimer=null;if(!$("#fs-modal")?.classList.contains("open")){document.body.style.overflow="";document.documentElement.style.overflow="";}},190);}   
  
function prepareSlider(el,count){
 if(!el)return;
 let wrapper=el.closest(".home-slider-wrapper");
 if(!wrapper){wrapper=document.createElement("div");wrapper.className="slider-wrapper home-slider-wrapper";el.parentNode.insertBefore(wrapper,el);wrapper.appendChild(el);}
 let left=wrapper.querySelector(".slider-btn-left"),right=wrapper.querySelector(".slider-btn-right");
 if(!left){left=document.createElement("button");left.type="button";left.className="slider-btn slider-btn-left";left.textContent="‹";left.setAttribute("aria-label","Anterior");wrapper.appendChild(left);}
 if(!right){right=document.createElement("button");right.type="button";right.className="slider-btn slider-btn-right";right.textContent="›";right.setAttribute("aria-label","Siguiente");wrapper.appendChild(right);}
 const visible=()=>{const w=el.clientWidth||window.innerWidth;return w<=520?1:w<=760?2:w<=1020?3:4;};
 let lastVisible=visible();
 const update=()=>{
  const v=visible(),wasActive=el.classList.contains("has-slider"),max=Math.max(0,el.scrollWidth-el.clientWidth),pos=el.scrollLeft;
  const active=count>v&&count>2;
  el.classList.toggle("has-slider",active);el.classList.toggle("is-centered",!active);
  el.setAttribute("aria-label",active?"Carrusel de especialidades":"Especialidades");
  left.hidden=!active||pos<=2;right.hidden=!active||pos>=max-2;
  if(v!==lastVisible){el.scrollTo({left:0,behavior:"auto"});lastVisible=v;requestAnimationFrame(update);}else if(wasActive!==active){requestAnimationFrame(update);}
 };
 const scroll=direction=>{const cards=[...el.querySelectorAll(":scope > .item-card")];if(!cards.length)return;const first=cards[0],second=cards[1];const step=second?Math.abs(second.getBoundingClientRect().left-first.getBoundingClientRect().left):first.getBoundingClientRect().width;const max=Math.max(0,el.scrollWidth-el.clientWidth);if(window.matchMedia("(max-width:700px)").matches){const current=cards.reduce((best,c)=>Math.abs((c.offsetLeft+c.offsetWidth/2)-(el.scrollLeft+el.clientWidth/2))<Math.abs((best.offsetLeft+best.offsetWidth/2)-(el.scrollLeft+el.clientWidth/2))?c:best,cards[0]);const index=cards.indexOf(current),target=cards[Math.max(0,Math.min(cards.length-1,index+direction))];el.scrollTo({left:Math.max(0,Math.min(max,target.offsetLeft-(el.clientWidth-target.offsetWidth)/2)),behavior:"smooth"});return;}el.scrollTo({left:Math.max(0,Math.min(max,el.scrollLeft+direction*step)),behavior:"smooth"});};
 left.onclick=()=>scroll(-1);right.onclick=()=>scroll(1);
 // En escritorio se puede arrastrar el carrusel manteniendo pulsado el botón izquierdo.
 if(!el.dataset.sliderDrag){
  let dragging=false,startX=0,startScroll=0,moved=false,suppressClick=false;
  const onPointerDown=ev=>{
   if(ev.pointerType!=="mouse"||ev.button!==0||ev.target.closest("button,a,input,textarea,select"))return;
   dragging=true;moved=false;startX=ev.clientX;startScroll=el.scrollLeft;
   el.classList.add("is-dragging");
  };
  const onPointerMove=ev=>{
   if(!dragging)return;
   const delta=ev.clientX-startX;
   if(Math.abs(delta)>5)moved=true;
   if(moved){el.scrollLeft=startScroll-delta;ev.preventDefault();}
  };
  const onPointerUp=()=>{
   if(!dragging)return;
   dragging=false;el.classList.remove("is-dragging");
   if(moved){suppressClick=true;window.setTimeout(()=>{suppressClick=false;},350);}
  };
  // No capturamos el puntero ni cancelamos pointerdown: un clic normal conserva
  // como destino la tarjeta y abre su superposicion; solo el arrastre se suprime.
  el.addEventListener("pointerdown",onPointerDown);
  window.addEventListener("pointermove",onPointerMove,{passive:false});
  window.addEventListener("pointerup",onPointerUp);
  window.addEventListener("pointercancel",onPointerUp);
  el.addEventListener("click",ev=>{if(suppressClick){ev.preventDefault();ev.stopImmediatePropagation();suppressClick=false;}},true);
  el.dataset.sliderDrag="1";
 }
 if(!el.dataset.sliderResize){window.addEventListener("resize",update,{passive:true});el.addEventListener("scroll",update,{passive:true});if("ResizeObserver" in window){const ro=new ResizeObserver(update);ro.observe(el);el._sliderRO=ro;}el.dataset.sliderResize="1";}
 requestAnimationFrame(update);
}
function balanceGrid(el,count){
 if(!el)return;
 el.classList.remove("grid-balanced-2","grid-balanced-3","grid-count-2");
 if(count===2)el.classList.add("grid-count-2");
 else if(count===4)el.classList.add("grid-balanced-2");
 else if(count===5||count===7)el.classList.add("grid-balanced-3");
}
function positionCardWatermarks(root=document){root.querySelectorAll(".item-card").forEach(cardEl=>{const logo=cardEl.querySelector(".card-logo-watermark"),copy=cardEl.querySelector(".item-content");if(!logo||!copy)return;const sync=()=>{const h=copy.getBoundingClientRect().height;cardEl.style.setProperty("--card-copy-height",Math.ceil(h)+"px");logo.style.bottom=Math.ceil(h)+"px";};sync();if(!logo.dataset.measure){logo.dataset.measure="1";if("ResizeObserver" in window){const ro=new ResizeObserver(sync);ro.observe(copy);logo._cardRO=ro;}window.addEventListener("resize",sync,{passive:true});}});}
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
${image?`<div class="image-wrapper"><img class="item-image" src="${esc(workerModeUrl(image,isProduct?"card":kind==="specialty"?"specialty":"gallery"))}" alt="${esc(p.name||p.title)}" loading="lazy" decoding="async" fetchpriority="low" draggable="false"></div>`:`<div class="image-wrapper"><div class="item-image placeholder" aria-hidden="true"><img src="assets/camara.svg" alt=""></div></div>`}   
<img class="card-logo-watermark" src="assets/logo%20web.png" alt="" aria-hidden="true" loading="lazy">
<div class="item-content"><h3>${esc(p.name||p.title)}</h3><p>${esc(desc)}</p>   
${metaHtml}  
<div class="item-actions"><button class="mini-btn detail-button" type="button" data-detail-card="${kind}" data-index="${index}">Ver detalles</button>${isProduct?`<button class="mini-btn add-button" type="button" data-add="${index}" ${p.stock<=0?"disabled":""}>Añadir carrito</button>`:''}</div>   
</div></article>`;   
}   
async function loadProducts(){
const rows=await getSheet("CATALOGO");
products=rows.filter(r=>r.nombre).map(r=>({name:r.nombre,description:r.descripcion||"",price:money(r.precio),image:workerImage(r.imagen),stock:r.stock===""||r.stock==null?99:Math.max(0,parseInt(r.stock,10)||0),detail:r.descripcionCompleta||"",largeImage:workerImage(r.imagenGrande),featured:yes(r.destacado),offer:yes(r.oferta),offerPrice:r.precioOferta===""||r.precioOferta==null?undefined:money(r.precioOferta),category:cleanCategory(r.categoria),album:r.album||"",albumFolder:"catalogo"}));
products.sort((a,b)=>(a.featured===b.featured?0:a.featured?-1:1));
const grid=$("#products-grid");
if(grid){
 const tiles=categoryCards(products,"product");
 const old=grid.parentElement.querySelector(".category-section-block");
 if(old) old.remove();
 if(tiles){const wrap=document.createElement("section");wrap.className="category-section-block";wrap.innerHTML=`<h2 class="category-section-title">Categorías</h2><p class="category-section-description">Descubre las creaciones por temática y encuentra ese detalle especial que estás buscando.</p><div class="category-tiles" aria-label="Categorías de la tienda">${tiles}</div>`;grid.parentElement.insertBefore(wrap,grid);sizeCategoryTiles(wrap);}
 if(!grid.parentElement.querySelector(".products-section-title")){const h=document.createElement("h2");h.className="category-section-title products-section-title";h.textContent="Productos";grid.parentElement.insertBefore(h,grid);const d=document.createElement("p");d.className="category-section-description products-section-description";d.textContent="Todas las piezas disponibles, elaboradas con cariño y pensadas para regalar o disfrutar.";grid.parentElement.insertBefore(d,grid);}
 grid.innerHTML=products.length?products.map((p,i)=>card(p,"product",i)).join(""):'<p class="loading-note">Próximamente habrá nuevas creaciones.</p>';
 balanceGrid(grid,products.length);positionCardWatermarks(grid);
}
if($("#category-grid")&&categoryParams().type==="product") renderCategoryLanding();
}   
async function loadSpecialties(){   
const rows=await getSheet("ESPECIALIDADES");   
specialties=rows.filter(r=>r.nombre).map(r=>({name:r.nombre,description:r.descripcion||"",image:workerImage(r.imagen),detail:r.descripcionCompleta||"",largeImage:workerImage(r.imagenGrande),featured:!!r.destacado,album:r.album||"",albumFolder:"especialidades"}));   
specialties.sort((a,b) => (a.featured === b.featured ? 0 : a.featured ? -1 : 1));   
const grid=$("#specialties-grid");if(grid){grid.innerHTML=specialties.length?specialties.map((p,i)=>card(p,"specialty",i)).join(""):'<p class="loading-note">Próximamente descubrirás aquí mis especialidades.</p>';prepareSlider(grid,specialties.length);positionCardWatermarks(grid);}   
}   
async function loadGallery(){
const rows=await getSheet("TRABAJOS");
gallery=rows.filter(r=>r.nombre).map(r=>({name:r.nombre,image:workerImage(r.imagen),description:r.descripcion||"",detail:r.descripcionCompleta||"",largeImage:workerImage(r.imagenGrande),category:cleanCategory(r.categoria),album:r.album||"",albumFolder:"trabajos"}));
const grid=$("#gallery-grid");
if(grid){
 const tiles=categoryCards(gallery,"gallery");
 const old=grid.parentElement.querySelector(".category-section-block");
 if(old) old.remove();
 if(tiles){const wrap=document.createElement("section");wrap.className="category-section-block";wrap.innerHTML=`<h2 class="category-section-title">Categorías</h2><p class="category-section-description">Explora los trabajos por tipo de creación y déjate inspirar por cada proyecto.</p><div class="category-tiles" aria-label="Categorías de trabajos">${tiles}</div>`;grid.parentElement.insertBefore(wrap,grid);sizeCategoryTiles(wrap);}
 if(!grid.parentElement.querySelector(".products-section-title")){const h=document.createElement("h2");h.className="category-section-title products-section-title";h.textContent="Trabajos";grid.parentElement.insertBefore(h,grid);const d=document.createElement("p");d.className="category-section-description products-section-description";d.textContent="Una selección de proyectos y creaciones que reflejan el cariño por cada detalle.";grid.parentElement.insertBefore(d,grid);}
 grid.innerHTML=gallery.length?gallery.map((p,i)=>card(p,"gallery",i)).join(""):'<p class="loading-note">Próximamente descubrirás aquí mis trabajos.</p>';
 balanceGrid(grid,gallery.length);positionCardWatermarks(grid);
}
if($("#category-grid")&&categoryParams().type==="gallery") renderCategoryLanding();
}   
function showLoadError(id,err){
 const el=$(id);if(!el)return;
 const detail=String(err&&err.message||err||"Error desconocido").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
 el.innerHTML='<p class="loading-note">No se ha podido cargar el contenido. Comprueba la conexión e inténtalo de nuevo.<br><small>'+detail+'</small></p><button type="button" class="btn btn-soft" data-retry-content>Reintentar</button>';
 el.querySelector("[data-retry-content]")?.addEventListener("click",async()=>{
  el.innerHTML='<p class="loading-note">Cargando…</p>';siteDataPromise=null;
  try{if(id==="#products-grid")await loadProducts();else if(id==="#specialties-grid")await loadSpecialties();else if(id==="#gallery-grid")await loadGallery();else if(id==="#category-grid"){await Promise.all([loadProducts(),loadGallery()]);}}
  catch(retryErr){showLoadError(id,retryErr);}
 });
}   
function initMenu(){   
const btn=$(".menu-toggle"),nav=$(".main-nav");   
btn?.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));});   
  
const cartTrigger = $(".cart-trigger");   
if(cartTrigger && cartTrigger.innerHTML.includes("♡")) {   
cartTrigger.innerHTML = cartTrigger.innerHTML.replace("♡", "✿");   
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
backdrop.innerHTML = `<div class="confirm-modal" role="dialog" aria-modal="true" style="background:var(--blue-pastel-soft); border: 1px solid #c3d7f0;">   
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
  e.preventDefault();
  const form=e.currentTarget,status=$("#contact-status"),button=form.querySelector("button[type=submit]");
  const data=new FormData(form);
  const payload={action:"contact",Nombre:String(data.get("name")||"").trim(),Email:String(data.get("email")||"").trim(),Mensaje:String(data.get("message")||"").trim()};
  if(!payload.Nombre||!payload.Email||!payload.Mensaje){status.textContent="Completa todos los campos.";return;}
  button.disabled=true;button.textContent="Enviando consulta…";status.textContent="";
  try{
    const response=await fetch(cfg.appsScriptUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});
    const result=await response.json();
    if(!response.ok||result.status!=="success") throw new Error(result.message||"No se pudo enviar el mensaje.");
    form.reset();status.textContent="¡Gracias! Tu mensaje se ha enviado correctamente. Te llegará una copia por correo.";
  }catch(err){status.textContent="No se ha podido enviar el mensaje. Inténtalo de nuevo más tarde o escribe a "+cfg.email+".";}
  finally{button.disabled=false;button.textContent="Enviar consulta";}
}
function openOrderContact(){
 let layer=$("#order-contact-overlay");
 if(!layer){
  layer=document.createElement("div");layer.id="order-contact-overlay";layer.className="order-contact-overlay";layer.setAttribute("aria-hidden","true");
  layer.innerHTML=`<section class="order-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="order-contact-title"><button type="button" class="icon-button order-contact-close" data-close-order-contact aria-label="Cerrar">×</button><span class="eyebrow">Hablemos</span><h2 id="order-contact-title">Contacta con Silvia</h2><p>Cuéntame qué tienes en mente y te responderé lo antes posible.</p><form id="order-contact-form" class="form-card"><label>Tu nombre<input name="name" required autocomplete="name" placeholder="¿Cómo te llamas?"></label><label>Tu correo electrónico<input name="email" type="email" required autocomplete="email" placeholder="tu@correo.com"></label><label>Tu mensaje<textarea name="message" rows="5" required placeholder="Cuéntame en qué puedo ayudarte…"></textarea></label><button class="btn btn-primary" type="submit">Enviar consulta</button><p id="contact-status" class="form-status" role="status"></p></form></section>`;
  document.body.appendChild(layer);
  layer.querySelector("[data-close-order-contact]").addEventListener("click",closeOrderContact);
  layer.addEventListener("click",ev=>{if(ev.target===layer)closeOrderContact();});
  layer.querySelector("form").addEventListener("submit",sendContact);
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&layer.classList.contains("open"))closeOrderContact();});
 }
 layer.classList.add("open");layer.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
 requestAnimationFrame(()=>layer.querySelector("input")?.focus());
}
function closeOrderContact(){const layer=$("#order-contact-overlay");if(!layer)return;layer.classList.remove("open");layer.setAttribute("aria-hidden","true");document.body.style.overflow="";}

function showCustomAlert(title, message) {  
 const backdrop = document.createElement("div");  
 backdrop.className = "modal-backdrop open";  
 backdrop.style.zIndex = "200";  
 backdrop.innerHTML = `<div class="confirm-modal" role="dialog" aria-modal="true" style="background:var(--lilac-card); border: 1px solid #dfceeb;">  
 <h3 style="color:var(--lilac-dark); font-size: 24px;">${title}</h3>  
 <p style="color:var(--muted);">${message}</p>  
 <div class="confirm-btns">  
 <button class="btn" onclick="this.closest('.modal-backdrop').remove()" style="background:var(--pink-soft); color:var(--lilac-dark); border:1px solid #f0d5e1;">Aceptar</button>  
 </div>  
 </div>`;  
 document.body.appendChild(backdrop);  
}  
  
async function sendOrder(){   
if(!cart.length){showToast("Tu carrito está vacío.");return;}   
const name=$("#customer-name")?.value.trim(),email=$("#customer-email")?.value.trim(),phone=$("#customer-phone")?.value.trim(),address=$("#customer-address")?.value.trim(),comment=$("#customer-comment")?.value.trim();   
if(!name||!email||!phone||!address){showToast("Completa los datos obligatorios.");return;}   
  
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   
if(!emailRegex.test(email)){showToast("Por favor, introduce un correo electrónico válido.");return;}   
const cleanPhone = phone.replace(/\D/g,"");   
if(cleanPhone.length !== 9){showToast("El número de teléfono debe tener exactamente 9 dígitos.");return;}   
  
const total=cart.reduce((n,x)=>n+x.price*x.qty,0);   
const productsText=cart.map(x=>`- ${x.qty}x ${x.name} | Personalización: ${x.comment||"Sin detalles"}`).join("\n");   
const payload={action:"order",Cliente:name,Email:email,Telefono:phone.replace(/\D/g,""),Direccion:address,Productos:productsText,Total:`${total.toFixed(2).replace(".",",")} €`,Comentario:comment};   
const btn=$("#submit-order");btn.disabled=true;btn.textContent="Enviando solicitud…";   
try{   
if(!cfg.appsScriptUrl)throw new Error("La conexión de pedidos no está configurada.");   
const response=await fetch(cfg.appsScriptUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});   
if(!response.ok)throw new Error("El servidor no ha aceptado la solicitud.");   
const result=await response.json();   
if(result.status!=="success")throw new Error(result.message||"No se ha podido registrar el pedido.");   
cart=[];updateCart();closeCart();$("#order-form")?.reset();$("#back-to-cart")?.click();   
showCustomAlert("¡Solicitud enviada!", "Tu solicitud se ha registrado correctamente. Silvia se pondrá en contacto contigo para confirmar los detalles y el pago por Bizum.");   
}catch(err){   
showCustomAlert("Hubo un problema", "No hemos podido verificar el registro de tu solicitud. No se ha vaciado tu carrito. Puedes intentarlo de nuevo más tarde o escribir a "+cfg.email+". Detalle: "+err.message);   
}finally{btn.disabled=false;btn.textContent="Enviar solicitud de pedido";}   
}   
  
// Efectos decorativos recuperados con un presupuesto global de partículas.
// Solo se animan transform y opacity: sin blur, filtros dinámicos ni bucles JS.
const decorParticles = (() => {
  const active = {petal:0, crayon:0, yarn:0, heart:0};
  const limits = {petal:18, crayon:12, yarn:5, heart:8};
  const maxTotal = 26;
  const colors = {
    petal:['#fdfbf7','#f2d5df','#d4c5e8','#e2d4f5','#fcf4d4'],
    crayon:['#c8bccf','#dcbac5','#bcccda','#bed1c7','#e3cbbd','#dfc4cd','#e6dec4','#c2bdd4','#dcd0d9','#d1d8e0','#f2d5df','#e2d4f5','#fcf4d4','#ffdcb3'],
    vivid:['#ff9aa2','#c8a2c8','#b19cd9','#ffb3c6']
  };
  const total = () => active.petal+active.crayon+active.yarn+active.heart;
  const fallingNodes = new Set();
  // Límites de la zona realmente visible (también contempla zoom y barras móviles).
  function visibleArea(){
    const vv=window.visualViewport;
    return {
      left:vv?vv.offsetLeft:0,
      top:vv?vv.offsetTop:0,
      width:vv?vv.width:window.innerWidth,
      height:vv?vv.height:window.innerHeight
    };
  }
  function placeFallingNode(node){
    const area=visibleArea(), size=Number(node.dataset.size)||32;
    const usable=Math.max(0,area.width-size-16);
    const x=area.left+8+Math.min(usable,Math.max(0,usable*Number(node.dataset.xRatio)));
    const roomLeft=Math.max(0,x-area.left-8);
    const roomRight=Math.max(0,area.left+area.width-8-size-x);
    const driftLimit=Math.min(70,Math.max(roomLeft,roomRight));
    const direction=roomRight>=roomLeft?1:-1;
    const drift=direction*driftLimit*Number(node.dataset.driftRatio);
    node.style.left=x+'px';
    node.style.top=(area.top+4)+'px';
    node.style.setProperty('--drop-y',Math.max(0,area.height-size-12)+'px');
    node.style.setProperty('--tx',drift+'px');
    node.style.setProperty('--bx',(direction*Math.min(12,Math.max(0,driftLimit-Math.abs(drift))))+'px');
  }
  function refreshVisibleArea(){ fallingNodes.forEach(placeFallingNode); }
  window.addEventListener('resize',refreshVisibleArea,{passive:true});
  window.addEventListener('scroll',refreshVisibleArea,{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',refreshVisibleArea,{passive:true});
    window.visualViewport.addEventListener('scroll',refreshVisibleArea,{passive:true});
  }
  function add(kind,node,parent=document.body){
    if(active[kind]>=limits[kind] || total()>=maxTotal) return false;
    active[kind]++;
    node.addEventListener('animationend',()=>{node.remove();fallingNodes.delete(node);active[kind]=Math.max(0,active[kind]-1);},{once:true});
    parent.appendChild(node);
    if(kind==='yarn'||kind==='heart'){
      fallingNodes.add(node);
      placeFallingNode(node);
    }
    return true;
  }
  const rand = (a,b)=>a+Math.random()*(b-a);
  function petals(e){
    const count=window.innerWidth<=768?4:6;
    const frag=document.createDocumentFragment();
    for(let i=0;i<count && active.petal<limits.petal && total()<maxTotal;i++){
      const n=document.createElement('i'); n.className='petal-anim';
      n.style.background=colors.petal[(Math.random()*colors.petal.length)|0];
      n.style.left=e.clientX+'px'; n.style.top=e.clientY+'px';
      const a=rand(0,Math.PI*2),d=rand(35,105);
      n.style.setProperty('--tx',(Math.cos(a)*d)+'px');
      n.style.setProperty('--ty',(Math.sin(a)*d+28)+'px');
      n.style.setProperty('--rot',rand(-540,540)+'deg');
      if(add('petal',n,frag)){} 
    }
    document.body.appendChild(frag);
  }
  function crayons(container){
    if(!container)return;
    const count=window.innerWidth<=768?5:7;
    const frag=document.createDocumentFragment();
    for(let i=0;i<count && active.crayon<limits.crayon && total()<maxTotal;i++){
      const n=document.createElement('div'); n.className='crayon-anim-hero';
      n.style.color=colors.crayon[(Math.random()*colors.crayon.length)|0];
      const a=rand(0,Math.PI*2),d=rand(150,360);
      n.style.setProperty('--tx',(Math.cos(a)*d)+'px');
      n.style.setProperty('--ty',(Math.sin(a)*d)+'px');
      n.style.setProperty('--rot',rand(-540,540)+'deg');
      n.style.left='50%'; n.style.top='50%';
      add('crayon',n,frag);
    }
    container.appendChild(frag);
  }
  function falling(kind){
    const count=kind==='yarn'?(window.innerWidth<=768?2:3):(window.innerWidth<=768?3:5);
    const frag=document.createDocumentFragment();
    for(let i=0;i<count && active[kind]<limits[kind] && total()<maxTotal;i++){
      const n=document.createElement('div'); n.className=kind==='yarn'?'yarn-anim':'heart-anim';
      const color=colors.vivid[(Math.random()*colors.vivid.length)|0];
      if(kind==='yarn'){
        n.innerHTML=`<svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="${color}"/><path d="M14 35Q50 20 86 35M10 50Q50 40 90 50M14 65Q50 60 86 65M35 14Q20 50 35 86M50 10Q35 50 50 90M65 14Q50 50 65 86M25 20Q50 5 75 20M25 80Q50 95 75 80" stroke="rgba(255,255,255,.48)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M50 88C55 105 40 115 65 115" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
      }else{
        n.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${color}" stroke="white" stroke-width="1.2"/></svg>`;
      }
      const size=kind==='yarn'?40:22;
      n.dataset.size=String(size);
      n.dataset.xRatio=String(Math.random());
      n.dataset.driftRatio=String(rand(.25,1));
      n.style.setProperty('--rot',rand(-220,220)+'deg');
      n.style.setProperty('--scale',rand(.65,1.05));
      add(kind,n,frag);
    }
    document.body.appendChild(frag);
  }
  return {petals,crayons,falling};
})();

document.addEventListener("click",e=>{
 decorParticles.petals(e);
 const heroLogo=e.target.closest('.hero-logo');
 if(heroLogo) decorParticles.crayons(heroLogo.closest('.hero-art'));
 const headerBrand=e.target.closest('.site-header .brand');
 if(headerBrand){
   decorParticles.falling('yarn');
   // En inicio, el logo actúa como disparador del efecto sin recargar la página.
   if(document.body.dataset.page==='home') e.preventDefault();
 }
 const aboutHeading=e.target.closest('h2');
 if(aboutHeading && aboutHeading.textContent.includes('Soy Silvia Rodríguez')) decorParticles.falling('heart');

 // CONTROLADOR DE NAVEGACIÓN DIRECTA
 const link = e.target.closest("a");  
 if (link && link.href) {  
     const isInternal = link.getAttribute("href").includes(".html") && !link.getAttribute("href").startsWith("http") && link.target !== "_blank";
     if (isInternal) {  
         // En inicio, pulsar el logotipo solo dispara la animación de ovillos.
         if (link.classList.contains("brand") && document.body.dataset.page === "home") return;
         // Navega instantáneamente sin transiciones, guardando la página actual en localStorage
         localStorage.setItem("silviacrea_current_page", link.getAttribute("href"));
         e.preventDefault();
         document.body.classList.add("page-leaving");
         window.setTimeout(()=>{window.location.href=link.href;},150);
         return;
     }  
 }

 if(e.target.closest("[data-open-cart]"))openCart();   
if(e.target.closest("[data-close-cart]"))closeCart();   
const add=e.target.closest("[data-add]");if(add){e.stopPropagation();addProduct(products[Number(add.dataset.add)]);return;}   
const detail=e.target.closest("[data-detail-card]");   
if(detail){const i=Number(detail.dataset.index),kind=detail.dataset.detailCard;openProduct(kind==="product"?products[i]:kind==="specialty"?specialties[i]:gallery[i],kind==="product", i);return;}   
  
const cardEl=e.target.closest("[data-card-kind]");   
if(cardEl&&!e.target.closest("button")){   
const i=Number(cardEl.dataset.index),kind=cardEl.dataset.cardKind;   
openProduct(kind==="product"?products[i]:kind==="specialty"?specialties[i]:gallery[i],kind==="product", i);   
return;   
}   
  
if(e.target.closest("#modal-img-wrapper")) {  
 const img = $("#modal-image");  
 if(img && img.src && img.style.display !== "none") {  
 const fsImg = $("#fs-modal-image");  
 fsImg.src = workerModeUrl(modalPhotos[modalPhotoIndex]||img.src,"fullscreen");fsImg.alt=img.alt||"Imagen ampliada";  
 const fsModal = $("#fs-modal");  
 if(fsModal&&fsModal.parentElement!==document.documentElement)document.documentElement.appendChild(fsModal);
 updateSilviaVisualViewport();
 const pModal = $(".product-modal");  
 const fsContent = $(".fs-modal-content");  
 fsContent.className = "fs-modal-content";   
if(pModal.classList.contains("theme-pink")) fsContent.classList.add("theme-pink");  
 if(pModal.classList.contains("theme-lilac")) fsContent.classList.add("theme-lilac");  
 $("#fs-prev").style.display=modalPhotos.length>1?"flex":"none";$("#fs-next").style.display=modalPhotos.length>1?"flex":"none";
 fsModal.classList.add("open");  
 fsModal.setAttribute("aria-hidden", "false");document.body.style.overflow="hidden";document.documentElement.style.overflow="hidden";  
 }  
}  
  
if(e.target.closest("[data-close-fs]") || e.target.id === "fs-modal" || e.target.classList.contains("fs-modal-backdrop")) {  
 $("#fs-modal")?.classList.remove("open");  
 $("#fs-modal")?.setAttribute("aria-hidden", "true");  
}
if(e.target.closest("#fs-prev")){setModalPhoto(modalPhotoIndex-1);$("#fs-modal-image").src=workerModeUrl(modalPhotos[modalPhotoIndex],"fullscreen");}
if(e.target.closest("#fs-next")){setModalPhoto(modalPhotoIndex+1);$("#fs-modal-image").src=workerModeUrl(modalPhotos[modalPhotoIndex],"fullscreen");}  
   
const qty=e.target.closest("[data-qty]");if(qty){const item=cart[Number(qty.dataset.index)];item.qty=Math.max(1,item.qty+Number(qty.dataset.qty));const p=products.find(x=>x.name===item.name);if(p)item.qty=Math.min(item.qty,p.stock);updateCart();}   
const rem=e.target.closest("[data-remove]");if(rem){cart.splice(Number(rem.dataset.remove),1);updateCart();}   
if(e.target.closest("[data-close-modal]")||e.target.id==="product-modal"||e.target.classList.contains("modal-backdrop"))closeProduct();   
});   
  
document.addEventListener("keydown",e=>{  
 if($("#fs-modal")?.classList.contains("open")&&(e.key==="ArrowLeft"||e.key==="ArrowRight")&&modalPhotos.length>1){setModalPhoto(modalPhotoIndex+(e.key==="ArrowLeft"?-1:1));$("#fs-modal-image").src=workerModeUrl(modalPhotos[modalPhotoIndex],"fullscreen");e.preventDefault();return;}
 // 1. Ignoramos teclado si el usuario está escribiendo datos  
 if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;  
  
 // 2. --- NAVEGACIÓN DE CARRUSEL CON TECLADO ---  
 if (e.key === "ArrowLeft" || e.key === "ArrowRight") {  
 const sliders = $$(".has-slider");  
 let bestSlider = null;  
 let maxVisible = 0;  
   
// Detectar qué carrusel está más visible en pantalla  
 sliders.forEach(slider => {  
 const rect = slider.getBoundingClientRect();  
 const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);  
 if (visibleHeight > maxVisible) {  
 maxVisible = visibleHeight;  
 bestSlider = slider;  
 }  
 });  
   
// Si encontramos uno en pantalla (ocupando al menos 100px), lo movemos  
 if (bestSlider && maxVisible > 100) {   
e.preventDefault(); // Evita scroll vertical nativo  
 const card = bestSlider.querySelector(".item-card");   
const walk = card ? (card.offsetWidth + 24) * 2 : 300;  
 bestSlider.scrollBy({left: e.key === "ArrowLeft" ? -walk : walk, behavior: "smooth"});  
 }  
 }  
 // ----------------------------------------------  
  
 const c=e.target.closest("[data-card-kind]");  
 if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();const i=Number(c.dataset.index),kind=c.dataset.cardKind;openProduct(kind==="product"?products[i]:kind==="specialty"?specialties[i]:gallery[i],kind==="product",i);}  
});   
  
document.addEventListener("input",e=>{const el=e.target.closest("[data-comment]");if(el){cart[Number(el.dataset.comment)].comment=el.value;saveCart();}});   
$("#modal-add")?.addEventListener("click",()=>{if(modalProduct){const p=products.find(x=>x.name===modalProduct.name);if(p)addProduct(p);closeProduct();}});   
$("#continue-order")?.addEventListener("click",()=>{   
if(!cart.length){showToast("Añade algún producto primero.");return;}   
let checkoutView = $("#checkout-view");  
if(!checkoutView){  
 checkoutView = document.createElement("div");  
 checkoutView.id = "checkout-view";  
 checkoutView.style.display = "none";  
 checkoutView.style.flex = "1";  
 checkoutView.style.overflow = "auto";  
 checkoutView.innerHTML = `  
 <div style="margin-bottom:15px;"><button type="button" class="text-button" id="back-to-cart" style="font-size:14.5px;">← Volver al carrito</button></div>  
 <form id="order-form" class="form-card" style="padding:20px; background:var(--pink-soft); border-color:#f0d5e1;">  
 <label>Nombre *<input id="customer-name" required autocomplete="name" style="background:var(--lilac-card); border-color:#dfceeb;"></label>  
 <label>Correo electrónico *<input id="customer-email" type="email" required autocomplete="email" style="background:var(--lilac-card); border-color:#dfceeb;"></label>  
 <label>Teléfono *<input id="customer-phone" required inputmode="numeric" pattern="[0-9]{9}" maxlength="9" oninput="this.value=this.value.replace(/[^0-9]/g,'')" title="El teléfono debe tener exactamente 9 dígitos" autocomplete="tel" style="background:var(--lilac-card); border-color:#dfceeb;"></label>  
 <label>Dirección de envío *<textarea id="customer-address" rows="2" required autocomplete="street-address" style="background:var(--lilac-card); border-color:#dfceeb;"></textarea></label>  
 <label>Comentario general<textarea id="customer-comment" rows="3" style="background:var(--lilac-card); border-color:#dfceeb;"></textarea></label>  
 <p class="small-note">El importe mostrado es estimado y no incluye los gastos de envío. En esta etapa no se realizará ningún cargo; Silvia contactará contigo para confirmar los detalles y el importe definitivo.<br><br><strong style="color:var(--pink-dark)">Nota importante:</strong> Actualmente solo realizamos envíos dentro de la Península.</p>  
 <button class="btn btn-primary full-width" id="submit-order" type="submit">Enviar solicitud de pedido</button>  
 </form>  
 `;  
 $(".cart-drawer").appendChild(checkoutView);  
 $("#order-form").addEventListener("submit",e=>{e.preventDefault();sendOrder();});  
 $("#back-to-cart").addEventListener("click",()=>{  
 $("#checkout-view").style.display = "none";  
 $("#cart-items").style.display = "";  
 $(".cart-summary").style.display = "block";  
 $(".drawer-head h2").textContent = "Mi carrito";  
 $(".drawer-head .eyebrow").textContent = "Tus favoritos";  
 });  
}  
$("#cart-items").style.display = "none";  
$(".cart-summary").style.display = "none";  
checkoutView.style.display = "block";  
$(".drawer-head h2").textContent = "Datos de tu solicitud";  
$(".drawer-head .eyebrow").textContent = "Un último paso";  
});   
$("#contact-form")?.addEventListener("submit",sendContact);   
$("#year").textContent=new Date().getFullYear();initMenu();updateCart();
function applyMaintenanceState(state){
 const mode=state&&state.mode?state.mode:"normal";
 if(mode==="normal"){
   const wasActive=document.body.classList.contains("maintenance-active");
   document.body.classList.remove("maintenance-active","maintenance-checking");
   const old=$(".maintenance-screen");if(old)old.remove();maintenanceCurrentState=null;
   if(wasActive&&pageContentLoaded)loadPageContent();
   return false;
 }
 const signature=JSON.stringify({mode,message:state.message||""});
 if(document.body.classList.contains("maintenance-active")&&maintenanceCurrentState===signature)return true;
 return showMaintenanceScreen(state);
}
function showMaintenanceScreen(state){
 if(!state||!state.mode||state.mode==="normal")return applyMaintenanceState({mode:"normal"});
 const mode=state.mode,logo="assets/logo%20web.png",instagram="https://www.instagram.com/silviiacrea",contact="contacto.html#contact-form";
 const copy={construction:{title:"Web en construcción",message:"Estamos preparando un rincón lleno de creatividad. Muy pronto podrás descubrir todas las creaciones.",icon:"🛠️",className:"construction"},maintenance:{title:"Estamos realizando pequeños cuidados",message:"La web está en mantenimiento. Mientras tanto, puedes contactar con Silvia o seguir las novedades en Instagram.",icon:"🧵",className:"maintenance"},total:{title:"Volvemos muy pronto",message:"Estamos realizando trabajos de mantenimiento.",icon:"🌙",className:"total"}}[mode]||{title:"Estamos realizando pequeños cuidados",message:"La web está en mantenimiento.",icon:"🧵",className:"maintenance"};
 let overlay=$(".maintenance-screen");if(!overlay){overlay=document.createElement("div");overlay.className="maintenance-screen";document.body.appendChild(overlay);}
 const actions=mode==="total"?`<div class="maintenance-total-follow"><span>Por ahora, puedes seguirnos en Instagram.</span><a class="btn btn-primary" href="${instagram}" target="_blank" rel="noopener">Instagram</a></div>`:`<div class="maintenance-actions"><button class="btn btn-primary" type="button" data-open-maint-contact>Formulario de contacto</button><a class="btn btn-soft" href="${instagram}" target="_blank" rel="noopener">Instagram</a></div><div class="maintenance-contact-overlay" id="maintenance-contact-overlay" aria-hidden="true"><div class="maintenance-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-contact-title"><button type="button" class="maintenance-contact-close" data-close-maint-contact aria-label="Cerrar formulario">×</button><h2 id="maintenance-contact-title">Contacta con Silvia</h2><form id="maintenance-contact"><label>Tu nombre<input name="Nombre" required autocomplete="name"></label><label>Email<input type="email" name="Email" required autocomplete="email"></label><label>Mensaje<textarea name="Mensaje" rows="3" required></textarea></label><button class="btn btn-primary" type="submit">Enviar mensaje</button><p id="maintenance-status" aria-live="polite"></p></form></div></div>`;
 overlay.innerHTML=`<section class="maintenance-card ${copy.className}" role="dialog" aria-modal="true"><img class="maintenance-logo" src="${logo}" alt="Silvia Crea"><div class="maintenance-icon" aria-hidden="true"><span class="maintenance-symbol">${copy.icon}</span><span class="maintenance-spark">✦</span></div><h1>${esc(copy.title)}</h1><p>${esc(state.message||copy.message)}</p>${actions}</section>`;
 document.body.classList.add("maintenance-active");document.body.classList.remove("maintenance-checking");
 maintenanceCurrentState=JSON.stringify({mode,message:state.message||""});
 const contactLayer=$("#maintenance-contact-overlay",overlay);
 overlay.querySelector("[data-open-maint-contact]")?.addEventListener("click",()=>{contactLayer?.classList.add("open");contactLayer?.setAttribute("aria-hidden","false");document.body.dataset.maintContactOpen="1";contactLayer?.querySelector("input")?.focus();});
 overlay.querySelector("[data-close-maint-contact]")?.addEventListener("click",()=>{contactLayer?.classList.remove("open");contactLayer?.setAttribute("aria-hidden","true");delete document.body.dataset.maintContactOpen;});
 contactLayer?.addEventListener("click",ev=>{if(ev.target===contactLayer){contactLayer.classList.remove("open");contactLayer.setAttribute("aria-hidden","true");delete document.body.dataset.maintContactOpen;}});
 const form=$("#maintenance-contact",overlay);form?.addEventListener("submit",async ev=>{ev.preventDefault();const status=$("#maintenance-status",overlay),button=form.querySelector("button");button.disabled=true;status.textContent="Enviando…";try{const fd=new FormData(form),data={action:"contact"};fd.forEach((v,k)=>data[k]=v);const r=await fetch(cfg.appsScriptUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(data)});const out=await r.json();if(out.status!=="success")throw new Error(out.message||"No se pudo enviar");status.textContent="Mensaje enviado. Gracias por contactar.";form.reset();contactLayer?.classList.remove("open");contactLayer?.setAttribute("aria-hidden","true");delete document.body.dataset.maintContactOpen;}catch(err){status.textContent="No se ha podido enviar. Escríbenos por Instagram.";}finally{button.disabled=false;}});
 return true;
}
async function applyMaintenance(){
 document.body.classList.add("maintenance-checking");
 try{const data=await fetchFreshSiteData();const state=data.maintenance||{mode:"normal"};applyMaintenanceState(state);applyShopAccessImage(data.imagenTiendaInicio||data.shopImage||"");siteDataPromise=Promise.resolve(data);startMaintenancePolling();return state.mode!=="normal";}
 catch(err){console.warn("No se pudo obtener datos.json para el estado inicial:",err);applyMaintenanceState({mode:"normal"});startMaintenancePolling();return false;}
}

function loadPageContent(){
 if(pageContentLoaded)return;pageContentLoaded=true;
 if($("#products-grid"))loadProducts().catch(err=>showLoadError("#products-grid",err));
 if($("#specialties-grid"))loadSpecialties().catch(err=>showLoadError("#specialties-grid",err));
 if($("#gallery-grid"))loadGallery().catch(err=>showLoadError("#gallery-grid",err));
 if($("#category-grid"))Promise.all([loadProducts(),loadGallery()]).catch(err=>showLoadError("#category-grid",err));
}
applyMaintenance().then(active=>{if(!active)loadPageContent();});

})();