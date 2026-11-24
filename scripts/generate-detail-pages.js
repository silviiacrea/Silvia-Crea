// Genera páginas HTML estáticas indexables para especialidades, productos y trabajos.
// Prioridad de datos: Apps Script (datos actuales de Sheets), Worker y datos.json local.
const fs = require('node:fs');
const path = require('node:path');
const nestedRoot = path.resolve(__dirname, '../Silvia-Crea web');
const root = fs.existsSync(path.join(nestedRoot, 'index.html')) ? nestedRoot : path.resolve(__dirname, '..');
const domain = fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim().replace(/\/$/, '');
const site = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
const cfg = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
const apps = (cfg.match(/appsScriptUrl:\s*"([^"]+)/) || [])[1];
const worker = (cfg.match(/workerBaseUrl:\s*"([^"]+)/) || [])[1] || 'https://worker.silviacrea.es';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isComingSoon = value => /^proximamente\.*$/i.test(String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim());
const slugBase = v => String(v || 'pieza').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'pieza';
const money = v => Number(String(v ?? 0).replace(/[€\s]/g,'').replace(/\./g,'').replace(',','.')) || 0;
function workerImage(raw, mode='detail') {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.hostname === 'worker.silviacrea.es' && u.pathname.startsWith('/i/')) {
      u.searchParams.set('wm', mode);
      u.searchParams.set('v', '62');
      return u.href;
    }
    const prefix = '/file/silviacreacatalogo/';
    if (!u.hostname.endsWith('backblazeb2.com') || !u.pathname.startsWith(prefix)) return '';
    const pathPart = decodeURIComponent(u.pathname.slice(prefix.length));
    const encoded = Buffer.from(pathPart, 'utf8').toString('base64url');
    return `${worker}/i/${encoded}?wm=${mode}&v=63`;
  } catch { return ''; }
}
async function getData() {
  if (process.argv.includes('--local')) return JSON.parse(fs.readFileSync(path.join(root,'datos.json'),'utf8'));
  const candidates = [];
  if (apps) candidates.push(apps + (apps.includes('?') ? '&' : '?') + 'action=data');
  candidates.push(worker.replace(/\/$/,'') + '/datos.json');
  for (const url of candidates) {
    try {
      const res = await fetch(url, {headers:{accept:'application/json'}, signal:AbortSignal.timeout(12000)});
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.catalogo) && Array.isArray(data.trabajos)) return data;
    } catch (e) { console.warn('Fuente remota no disponible:', url, e.message); }
  }
  return JSON.parse(fs.readFileSync(path.join(root,'datos.json'),'utf8'));
}
function buildPages(items, type) {
  const folder = type === 'product' ? 'catalogo' : type === 'specialty' ? 'especialidades' : 'trabajo';
  const label = type === 'product' ? 'Producto artesanal' : type === 'specialty' ? 'Especialidad artesanal' : 'Trabajo realizado';
  const seen = new Map(), entries=[];
  const ordered = ['product','specialty'].includes(type) ? [...items].sort((a,b)=>((b.destacado===true)-(a.destacado===true))) : items;
  for (const item of ordered) {
    const name = String(item.nombre || item.name || '').trim();
    const image = workerImage(item.imagenGrande || item.imagen || item.image);
    if (!name || isComingSoon(name)) continue;
    const base = slugBase(name), n=(seen.get(base)||0)+1; seen.set(base,n);
    const slug = n===1 ? base : `${base}-${n}`;
    const description = String(item.descripcionCompleta || item.descripcion || item.description || '').trim();
    const fichaDescription = String(item.descripcionFicha || item['descripcion ficha'] || '').trim();
    const short = String(item.descripcion || item.description || description).trim();
    const pageDescription = fichaDescription || description || short;
    const price = money(item.precio ?? item.price);
    const stock = item.stock === '' || item.stock == null ? 99 : Number(item.stock);
    const offer = item.oferta === true || ['si','sí','true','1'].includes(String(item.oferta).toLowerCase());
    const offerPrice = money(item.precioOferta ?? item.offerPrice ?? price);
    const canonical = `${site}/${folder}/${slug}/`;
    const title = `Silvia Crea | ${name}`;
    const meta = (fichaDescription || description || short || `${name}, creación artesanal de Silvia Crea.`).slice(0,300);
    const schema = type === 'product' ? {
      '@context':'https://schema.org','@type':'Product','name':name,'description':pageDescription,
      'image':[image],'brand':{'@type':'Brand','name':'Silvia Crea'},'url':canonical,
      'offers':{'@type':'Offer','url':canonical,'priceCurrency':'EUR','price':(offer?offerPrice:price).toFixed(2),
        'availability':stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock','itemCondition':'https://schema.org/NewCondition','seller':{'@type':'Organization','name':'Silvia Crea','url':site+'/'}}
    } : {'@context':'https://schema.org','@type':'CreativeWork','name':name,'description':pageDescription,'image':image,'creator':{'@type':'Person','name':'Silvia Rodríguez','url':site+'/sobre-mi.html'},'publisher':{'@type':'Organization','name':'Silvia Crea','url':site+'/'},'url':canonical};
    if (!image) delete schema.image;
    const data = {name,description:description||short,descripcionFicha:fichaDescription,short,image:image || '../../assets/camara.svg',album:String(item.album||''),albumFolder:folder==='trabajo'?'trabajos':folder,price:offer?offerPrice:price,stock,offer:type==='product'};
    const json = JSON.stringify(data).replace(/</g,'\\u003c');
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="silvia-build" content="66.0"><meta name="description" content="${esc(meta)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="${type==='product'?'product':'article'}"><meta property="og:site_name" content="Silvia Crea"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(meta)}"><meta property="og:url" content="${esc(canonical)}">${image ? `<meta property="og:image" content="${esc(image)}">` : ''}<meta name="twitter:card" content="summary_large_image">
<title>${esc(title)}</title><link rel="icon" href="../../assets/logo%20web.png" type="image/png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Caveat:wght@500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="../../css/estilos.css?v=66.0"><link rel="stylesheet" href="../../css/detalle-seo.css?v=66.0">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head><body data-page="detail"><a class="skip-link" href="#contenido">Saltar al contenido</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="../../index.html" aria-label="Silvia Crea, inicio"><img src="../../assets/logo%20web.png" alt="Logotipo Silvia Crea" class="header-logo"><span><strong>Silvia Crea ♡</strong><small>Arte y manualidades</small></span></a><nav class="main-nav" aria-label="Navegación principal"><a href="../../index.html">Inicio</a><a href="../../tienda.html">Tienda</a><a href="../../galeria.html">Galería</a><a href="../../sobre-mi.html">Sobre mí</a><a href="../../encargos.html">Encargos</a><a href="../../contacto.html">Contacto</a></nav><button class="cart-trigger" type="button" data-open-cart aria-label="Abrir carrito"><svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span>Carrito</span><b class="cart-count">0</b></button></div></header>
<main id="contenido" class="detail-main"><nav class="detail-breadcrumb" aria-label="Migas de pan"><a href="../../index.html">Inicio</a><span>›</span><a href="../../${type==='product'?'tienda.html':'galeria.html'}">${type==='product'?'Tienda':'Galería'}</a><span>›</span><span>${esc(name)}</span></nav><article class="detail-layout"><section class="detail-visual"><div class="detail-main-image"><img id="detail-image" src="${esc(image || '../../assets/camara.svg')}" alt="${esc(name)}" fetchpriority="high"><span class="detail-image-caption">${esc(label)} · Silvia Crea</span></div></section><section class="detail-copy"><span class="eyebrow">${esc(label)} · Hecho a mano</span><h1>${esc(name)}</h1><p class="detail-description">${esc(pageDescription)}</p>${fichaDescription && description && fichaDescription!==description ? `<section class="detail-extra-description"><h2>Descripción de la ficha</h2><p>${esc(fichaDescription)}</p></section>` : ''}${type==='product'?`<p class="detail-price">${(offer?offerPrice:price).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</p><button class="btn btn-primary" id="detail-add" type="button" ${stock<=0?'disabled':''}>Añadir al carrito</button><p class="detail-cart-note" id="detail-cart-note" role="status" aria-live="polite"></p>`:''}<section class="detail-album" id="detail-album" hidden><h2>Más imágenes</h2><div class="detail-thumbnails" id="detail-thumbnails"></div></section><a class="detail-back" href="../../${type==='product'?'tienda.html':'galeria.html'}">← Volver a ${type==='product'?'la tienda':'la galería'}</a></section></article></main>
<footer class="site-footer"><a class="footer-brand-img" href="../../index.html" aria-label="Inicio Silvia Crea"><img src="../../assets/logo%20web.png" alt="Logotipo Silvia Crea" class="footer-logo"><span class="footer-brand">Silvia Crea <span>♡</span></span></a><p>Arte y manualidades hechas con cariño.</p><div class="footer-links"><a href="../../contacto.html">Contacto</a><a href="../../tienda.html">Tienda</a><a href="../../encargos.html">Encargos</a><a href="../../politica-cookies.html">Política de cookies</a><button type="button" data-cookie-settings>Configurar cookies</button><a href="https://www.instagram.com/silviiacrea" target="_blank" rel="noopener noreferrer">Instagram</a></div><small>© <span id="year"></span> Silvia Crea</small></footer>
<div class="drawer-backdrop" data-close-cart></div><aside class="cart-drawer" aria-label="Carrito" aria-hidden="true"><div class="drawer-head"><div><span class="eyebrow">Tus favoritos</span><h2>Mi carrito</h2></div><button type="button" class="text-button empty-btn-style" id="empty-cart-btn">Vaciar</button><button type="button" class="icon-button" data-close-cart aria-label="Cerrar carrito">×</button></div><div id="cart-items" class="cart-items"><p class="empty-cart">Todavía no has añadido productos.</p></div><div class="cart-summary"><div class="summary-line"><span>Unidades</span><strong id="cart-units">0</strong></div><div class="summary-line total-line"><span>Total estimado</span><strong id="cart-total">0,00 €</strong></div><p>Los gastos de envío se concretarán personalmente. El envío de la solicitud no implica ningún pago.</p><button class="btn btn-primary full-width" id="continue-order" type="button">Continuar con la solicitud</button></div></aside>
<script src="../../js/config.js"></script><script>window.SILVIA_DETAIL=${json};</script><script src="../../js/detalle-seo.js?v=66.0" defer></script><script src="../../js/cookies.js?v=66.0" defer></script></body></html>`;
    const dir=path.join(root,folder,slug); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'index.html'),html);
    entries.push({url:canonical,lastmod:new Date().toISOString().slice(0,10)});
  }
  return entries;
}
(async()=>{
 const data=await getData();
 for (const folder of ['catalogo','trabajo','especialidades']) { const p=path.join(root,folder); fs.rmSync(p,{recursive:true,force:true}); fs.mkdirSync(p,{recursive:true}); }
 const urls=[...buildPages(data.catalogo,'product'),...buildPages(data.especialidades||[],'specialty'),...buildPages(data.trabajos,'work')];
 const staticPages=['','tienda.html','galeria.html','sobre-mi.html','encargos.html','contacto.html','categorias-tienda.html','categorias-trabajos.html','manualidades-badajoz-extremadura.html','politica-cookies.html'].map(x=>({url:`${site}/${x}`,lastmod:new Date().toISOString().slice(0,10)}));
 const all=[...staticPages,...urls];
 fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${all.map(x=>`<url><loc>${esc(x.url)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join('')}</urlset>`);
 console.log(`Páginas generadas: ${urls.length} (${urls.filter(x=>x.url.includes('/catalogo/')).length} catálogo, ${urls.filter(x=>x.url.includes('/especialidades/')).length} especialidades, ${urls.filter(x=>x.url.includes('/trabajo/')).length} trabajos)`);
})().catch(e=>{console.error(e);process.exit(1)});
