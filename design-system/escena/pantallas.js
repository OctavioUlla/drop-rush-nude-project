// Lo que se ve en las pantallas y carteles del mundo clay: feeds verticales de EGC y UGC, la publicación viral
// con su contador de likes, el cartel de la tienda, el neón de la Nude House y la etiqueta de envío.
// Todo se dibuja en canvas con los colores y la tipografía del design system, y se vuelve a dibujar cuando
// terminan de cargar las fuentes (si no, el primer dibujo sale con la tipografía de respaldo).
import * as THREE from 'three';
import { colores } from '../tokens.js';

const M = colores.marca;
const A = colores.acento;
const fuente = (peso, px) => `${peso} ${px}px "Inter Tight", "Inter", sans-serif`;
const fuenteTexto = (peso, px) => `${peso} ${px}px "Inter", "Inter Tight", sans-serif`;
const fuentesListas = document.fonts?.load ? Promise.all([document.fonts.load(fuente(800, 40)), document.fonts.load(fuenteTexto(500, 20))]).then(() => document.fonts.ready) : Promise.resolve();

/** Textura de canvas: dibujar(ctx, w, h) se llama al crearla y otra vez cuando cargan las fuentes. */
export function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.redibujar = (...args) => { ctx.save(); dibujar(ctx, w, h, ...args); ctx.restore(); t.needsUpdate = true; };
  t.redibujar();
  fuentesListas.then(() => t.redibujar());
  return t;
}

// ---------- Primitivas ----------
function rect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function espaciado(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; }
/** Texto en varias líneas dentro de un ancho; devuelve la y final. */
function parrafo(ctx, texto, x, y, ancho, alto) {
  const palabras = texto.split(' ');
  let linea = '';
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && linea) { ctx.fillText(linea, x, y); linea = p; y += alto; }
    else linea = prueba;
  }
  ctx.fillText(linea, x, y);
  return y + alto;
}
function corazon(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.05, y + s * 0.28, x - s * 0.5, y + s * 0.02, x - s * 0.45, y - s * 0.22);
  ctx.bezierCurveTo(x - s * 0.4, y - s * 0.48, x - s * 0.08, y - s * 0.5, x, y - s * 0.24);
  ctx.bezierCurveTo(x + s * 0.08, y - s * 0.5, x + s * 0.4, y - s * 0.48, x + s * 0.45, y - s * 0.22);
  ctx.bezierCurveTo(x + s * 0.5, y + s * 0.02, x + s * 0.05, y + s * 0.28, x, y + s * 0.35);
  ctx.fill();
}
/** Sudadera plana (silueta), para las ilustraciones. */
function siluetaSudadera(ctx, x, y, s, color, detalle) {
  ctx.fillStyle = color;
  rect(ctx, x - s * 0.42, y - s * 0.38, s * 0.84, s * 0.92, s * 0.14); ctx.fill(); // cuerpo
  ctx.beginPath(); ctx.ellipse(x, y - s * 0.4, s * 0.24, s * 0.16, 0, 0, Math.PI * 2); ctx.fill(); // capucha
  for (const l of [-1, 1]) { // mangas
    ctx.save(); ctx.translate(x + l * s * 0.4, y - s * 0.3); ctx.rotate(l * -0.22);
    rect(ctx, -s * 0.13, 0, s * 0.26, s * 0.78, s * 0.12); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = detalle;
  rect(ctx, x - s * 0.25, y + s * 0.18, s * 0.5, s * 0.2, s * 0.05); ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1; // bolsillo
  ctx.font = fuente(800, s * 0.1); ctx.textAlign = 'center'; ctx.fillText('Nude® Project', x, y - s * 0.06);
}
function persona(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - s * 0.78, s * 0.16, 0, Math.PI * 2); ctx.fill();
  rect(ctx, x - s * 0.2, y - s * 0.58, s * 0.4, s * 0.6, [s * 0.18, s * 0.18, s * 0.04, s * 0.04]); ctx.fill();
}
function llave(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x - s * 0.32, y, s * 0.2, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.12, y); ctx.lineTo(x + s * 0.45, y); ctx.stroke();
  for (const dx of [0.22, 0.38]) { ctx.beginPath(); ctx.moveTo(x + s * dx, y); ctx.lineTo(x + s * dx, y + s * 0.14); ctx.stroke(); }
}

// ---------- Ilustraciones de las publicaciones (contenido de prueba, mientras no haya foto o clip real) ----------
const artes = {
  dia1(ctx, w, h) { // vlog de Nueva York
    ctx.fillStyle = M.cacao; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = M['cacao-suave'];
    const edificios = [[0.02, 0.5], [0.13, 0.36], [0.24, 0.44], [0.37, 0.28], [0.47, 0.4], [0.6, 0.22], [0.7, 0.34], [0.82, 0.3], [0.92, 0.46]];
    for (const [x, alto] of edificios) { ctx.fillRect(x * w, h * (0.78 - alto * 0.55), w * 0.1, h); }
    ctx.fillStyle = A.mostaza;
    for (let i = 0; i < 26; i++) ctx.fillRect(((i * 37) % 90 + 4) / 100 * w, h * (0.44 + ((i * 53) % 30) / 100), 6, 9);
    ctx.fillStyle = M.crema; ctx.textAlign = 'center';
    ctx.font = fuente(900, w * 0.36); espaciado(ctx, -w * 0.02); ctx.fillText('DAY 1', w / 2, h * 0.3);
    ctx.font = fuente(700, w * 0.055); espaciado(ctx, 0); ctx.fillText('making our brand known in the US', w / 2, h * 0.36);
  },
  reglas(ctx, w, h) {
    ctx.fillStyle = M.crema; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = M.cacao; ctx.textAlign = 'left';
    ctx.font = fuente(900, w * 0.17); espaciado(ctx, -w * 0.01);
    ctx.fillText('HOUSE', w * 0.09, h * 0.2); ctx.fillText('RULES', w * 0.09, h * 0.3);
    espaciado(ctx, 0);
    for (let i = 0; i < 5; i++) {
      const y = h * (0.42 + i * 0.075);
      ctx.font = fuente(800, w * 0.06); ctx.fillText(`0${i + 1}`, w * 0.09, y);
      ctx.fillStyle = M.piedra; rect(ctx, w * 0.24, y - w * 0.04, w * (0.6 - (i % 3) * 0.1), w * 0.035, w * 0.02); ctx.fill();
      ctx.fillStyle = M.cacao;
    }
  },
  podcast(ctx, w, h) {
    ctx.fillStyle = A.mostaza; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = M.cacao;
    rect(ctx, w * 0.38, h * 0.16, w * 0.24, h * 0.24, w * 0.12); ctx.fill(); // micrófono
    ctx.strokeStyle = M.cacao; ctx.lineWidth = w * 0.03;
    ctx.beginPath(); ctx.arc(w / 2, h * 0.3, w * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillRect(w * 0.485, h * 0.44, w * 0.03, h * 0.07); ctx.fillRect(w * 0.38, h * 0.505, w * 0.24, w * 0.03);
    ctx.textAlign = 'center'; ctx.font = fuente(800, w * 0.06); ctx.fillText('EPISODIO 01', w / 2, h * 0.6);
    ctx.font = fuente(900, w * 0.11); espaciado(ctx, -w * 0.005);
    ctx.fillText('De 0 a', w / 2, h * 0.68); ctx.fillText('200.000', w / 2, h * 0.75);
  },
  oficina(ctx, w, h) { outOfOffice(ctx, w, h, A.rosa); },
  cola(ctx, w, h) {
    ctx.fillStyle = M.arena; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = M.cacao; ctx.fillRect(w * 0.6, h * 0.16, w * 0.4, h * 0.5); // tienda
    ctx.fillStyle = M.crema; ctx.fillRect(w * 0.68, h * 0.32, w * 0.24, h * 0.34);
    ctx.font = fuente(800, w * 0.045); ctx.textAlign = 'center'; ctx.fillText('Nude® Project', w * 0.8, h * 0.25);
    ctx.fillStyle = M.piedra; ctx.fillRect(0, h * 0.66, w, h * 0.34);
    const tonos = [M.cacao, A.marino, M['cacao-suave'], A.bosque, M.cacao, A.ladrillo, M['cacao-suave']];
    tonos.forEach((c, i) => persona(ctx, w * (0.08 + i * 0.075), h * 0.66, w * (0.2 - i * 0.008), c));
    ctx.fillStyle = M.cacao; ctx.font = fuente(900, w * 0.2); ctx.textAlign = 'left'; espaciado(ctx, -w * 0.01);
    ctx.fillText('6:00', w * 0.07, h * 0.3); ctx.font = fuente(800, w * 0.06); espaciado(ctx, 0); ctx.fillText('a. m. · apertura', w * 0.08, h * 0.36);
  },
  llave(ctx, w, h) {
    ctx.fillStyle = A.bosque; ctx.fillRect(0, 0, w, h);
    llave(ctx, w * 0.5, h * 0.34, w * 0.75, M.crema);
    ctx.fillStyle = M.crema; ctx.textAlign = 'center';
    ctx.font = fuente(900, w * 0.3); espaciado(ctx, -w * 0.015); ctx.fillText('1/60', w / 2, h * 0.66);
    ctx.font = fuente(700, w * 0.055); espaciado(ctx, 0); ctx.fillText('la llave de los primeros 60', w / 2, h * 0.73);
  },
  outfit(ctx, w, h) {
    ctx.fillStyle = A.marino; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,248,238,.08)'; rect(ctx, w * 0.14, h * 0.22, w * 0.72, h * 0.58, w * 0.36); ctx.fill(); // espejo
    siluetaSudadera(ctx, w * 0.5, h * 0.48, w * 0.62, M.arena, M.cacao);
    ctx.fillStyle = M.crema; ctx.font = fuente(900, w * 0.15); ctx.textAlign = 'center'; espaciado(ctx, -w * 0.008);
    ctx.fillText('FIT CHECK', w / 2, h * 0.17);
  },
  artistas(ctx, w, h) {
    ctx.fillStyle = M.cacao; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = A.mostaza;
    for (const [x, y, s] of [[0.24, 0.22, 0.12], [0.72, 0.16, 0.08], [0.6, 0.36, 0.15], [0.3, 0.5, 0.07]]) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.4 : s; const a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(w * x + Math.cos(a) * r * w, h * y + Math.sin(a) * r * w); }
      ctx.fill();
    }
    ctx.fillStyle = M.crema; ctx.textAlign = 'left'; ctx.font = fuente(900, w * 0.12); espaciado(ctx, -w * 0.006);
    ctx.fillText('Visto en', w * 0.08, h * 0.68); ctx.fillText('artistas', w * 0.08, h * 0.76);
    ctx.font = fuente(700, w * 0.05); espaciado(ctx, 0); ctx.fillText('Drake · Lil Nas X · Bad Gyal', w * 0.08, h * 0.83);
  },
};

/** Publicación de Out of Office: remera irónica en el metro. */
function outOfOffice(ctx, w, h, fondo = M.arena) {
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'left'; ctx.font = fuente(900, w * 0.15); espaciado(ctx, -w * 0.006);
  ctx.fillStyle = M.cacao; ctx.fillText('OUT OF', w * 0.07, h * 0.19); ctx.fillText('OFFICE', w * 0.07, h * 0.28);
  espaciado(ctx, 0);
  // Metro: ventanas y barra.
  ctx.fillStyle = M.piedra; ctx.fillRect(0, h * 0.33, w, h * 0.2);
  ctx.fillStyle = M['cacao-profundo'];
  for (let i = 0; i < 3; i++) { rect(ctx, w * (0.05 + i * 0.33), h * 0.355, w * 0.26, h * 0.13, w * 0.04); ctx.fill(); }
  ctx.fillStyle = M['cacao-suave']; ctx.fillRect(w * 0.86, h * 0.31, w * 0.035, h * 0.69);
  // Persona con la remera.
  ctx.fillStyle = colores.juego.piel; ctx.beginPath(); ctx.arc(w * 0.46, h * 0.6, w * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = M.cacao; ctx.beginPath(); ctx.arc(w * 0.46, h * 0.585, w * 0.105, Math.PI, 0); ctx.fill();
  ctx.fillStyle = M.blanco; rect(ctx, w * 0.2, h * 0.67, w * 0.52, h * 0.4, [w * 0.12, w * 0.12, 0, 0]); ctx.fill();
  ctx.fillStyle = M.cacao; ctx.textAlign = 'center'; ctx.font = fuente(800, w * 0.036);
  parrafo(ctx, 'Heading to work because I was too shy to dance on TikTok in 2020', w * 0.46, h * 0.74, w * 0.4, w * 0.044);
}

/** Interfaz de un video vertical (estilo Reels/TikTok) encima de la ilustración. */
function interfazVideo(ctx, w, h, pub) {
  espaciado(ctx, 0); // la ilustración puede haber dejado el interletrado de su título
  const g = ctx.createLinearGradient(0, h * 0.62, 0, h);
  g.addColorStop(0, 'rgba(46,25,20,0)'); g.addColorStop(1, 'rgba(46,25,20,.72)');
  ctx.fillStyle = g; ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = M.crema; ctx.textAlign = 'left';
  ctx.font = fuente(800, w * 0.05); ctx.fillText(pub.cuenta, w * 0.06, h * 0.885);
  ctx.font = fuenteTexto(500, w * 0.038); ctx.globalAlpha = 0.92;
  parrafo(ctx, pub.texto, w * 0.06, h * 0.925, w * 0.7, w * 0.048);
  ctx.globalAlpha = 1;
  // Acciones a la derecha; la cifra (likes o vistas) va debajo de su ícono.
  const x = w * 0.9;
  ctx.fillStyle = M.crema;
  if (pub.icono === 'vistas') { ctx.beginPath(); ctx.moveTo(x - w * 0.03, h * 0.64); ctx.lineTo(x + w * 0.045, h * 0.66); ctx.lineTo(x - w * 0.03, h * 0.68); ctx.fill(); }
  else corazon(ctx, x, h * 0.66, w * 0.08);
  if (pub.cifra) { ctx.textAlign = 'center'; ctx.font = fuente(800, w * 0.045); ctx.fillText(pub.cifra, x, h * 0.702); }
  ctx.beginPath(); ctx.arc(x, h * 0.75, w * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - w * 0.04, h * 0.815); ctx.lineTo(x + w * 0.04, h * 0.8); ctx.lineTo(x - w * 0.01, h * 0.835); ctx.fill();
}
/** Foto o cuadro de video que cubre toda la pantalla (como object-fit: cover). */
function cubrir(ctx, media, w, h) {
  const mw = media.videoWidth || media.naturalWidth, mh = media.videoHeight || media.naturalHeight;
  const k = Math.max(w / mw, h / mh);
  ctx.drawImage(media, (w - mw * k) / 2, (h - mh * k) / 2, mw * k, mh * k);
}
/** Publicación sin foto ni ilustración: su texto en grande sobre cacao. */
function sinArte(ctx, w, h, pub) {
  ctx.fillStyle = M.cacao; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = M.crema; ctx.textAlign = 'left'; ctx.font = fuente(900, w * 0.1); espaciado(ctx, -w * 0.004);
  parrafo(ctx, pub.texto ?? '', w * 0.08, h * 0.3, w * 0.84, w * 0.11);
  espaciado(ctx, 0);
}
/** Cartel de pausa arriba de la publicación (el presentador frenó el feed para comentarla). */
function cartelPausa(ctx, w) {
  ctx.fillStyle = 'rgba(46,25,20,.78)'; rect(ctx, w * 0.33, w * 0.14, w * 0.34, w * 0.085, w * 0.042); ctx.fill();
  ctx.fillStyle = M.crema; ctx.fillRect(w * 0.375, w * 0.163, w * 0.014, w * 0.04); ctx.fillRect(w * 0.397, w * 0.163, w * 0.014, w * 0.04);
  ctx.textAlign = 'left'; ctx.font = fuente(800, w * 0.036); espaciado(ctx, w * 0.002); ctx.fillText('PAUSADO', w * 0.43, w * 0.198);
  espaciado(ctx, 0);
}
function barraEstado(ctx, w, tinta) {
  ctx.fillStyle = tinta; ctx.textAlign = 'left'; ctx.font = fuente(700, w * 0.04); espaciado(ctx, 0);
  ctx.fillText('9:41', w * 0.08, w * 0.075);
  rect(ctx, w * 0.8, w * 0.045, w * 0.1, w * 0.04, w * 0.012); ctx.fill();
  rect(ctx, w * 0.34, w * 0.035, w * 0.32, w * 0.06, w * 0.03); ctx.fillStyle = '#000'; ctx.fill(); // isla
}

/**
 * Publicaciones de prueba de cada feed. La presentación las reemplaza por presentacion/datos/feeds.json, con el
 * mismo formato: { cuenta, texto, cifra, icono: 'like' | 'vistas', archivo (foto o clip), arte (ilustración de
 * prueba si no hay archivo o no carga), claro (barra de estado en cacao, para fondos claros) }.
 */
export const publicaciones = {
  egc: [
    { cuenta: '@brunocasanovas', texto: 'Day 1 of making our brand known in the US', arte: 'dia1' },
    { cuenta: '@nudeproject', texto: 'House Rules: las reglas de la casa.', arte: 'reglas', claro: true },
    { cuenta: '@nudeproject.podcast', texto: 'Episodio 1: de 0 a 200.000 seguidores.', arte: 'podcast' },
    { cuenta: '@nudeproject', texto: 'Out of Office: la campaña la protagoniza el equipo.', arte: 'oficina', cifra: '+500 k' },
  ],
  ugc: [
    { cuenta: '@cola.madrid', texto: 'Cola desde las 6 de la mañana para la apertura.', arte: 'cola', claro: true },
    { cuenta: '@primeros60', texto: 'Uno de los 60: tengo la llave.', arte: 'llave' },
    { cuenta: '@fitcheck', texto: 'Fit check con la sudadera nueva.', arte: 'outfit' },
    { cuenta: '@comunidad', texto: 'La marca, vista en sus artistas.', arte: 'artistas' },
  ],
};

const esVideo = (archivo) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(archivo);
/** Carga la foto o el clip de una publicación; listo() se llama cuando hay algo para dibujar. */
function cargarMedia(archivo, listo) {
  if (!archivo) return null;
  if (esVideo(archivo)) {
    const v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
    v.addEventListener('loadeddata', () => { v.listo = true; listo(); }, { once: true });
    v.addEventListener('error', () => console.warn(`Feed: no se pudo cargar ${archivo}; se usa la ilustración de prueba`));
    v.src = archivo;
    return v;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { img.listo = true; listo(); };
  img.onerror = () => console.warn(`Feed: no se pudo cargar ${archivo}; se usa la ilustración de prueba`);
  img.src = archivo;
  return img;
}

/**
 * Feed vertical que pasa solo: una publicación a pantalla completa cada `cada` segundos, con un desplazamiento
 * hacia arriba. Cada publicación muestra su foto o clip (en silencio y en bucle) o, si no tiene, su ilustración.
 * Devuelve la textura con:
 * - avanzar(dt): en cada cuadro, con la estación en pantalla. Solo redibuja durante el pase o si hay un clip.
 * - dormir(): con la estación fuera de cuadro (frena los clips).
 * - pausar(si): el presentador frena el feed para comentar la publicación visible (si estaba pasando, termina el pase).
 */
export function feed(tipo, { publicaciones: pubs, ancho = 540, alto = 1134, cada = 4, pase = 0.7, desfase = 0 } = {}) {
  if (!pubs?.length) pubs = publicaciones[tipo];
  let estado = null;
  const capas = pubs.map((pub) => {
    let t = null; // lienzo() ya dibuja una vez al crearla, antes de que t exista
    t = lienzo(ancho, alto, (ctx, w, h) => {
      if (t?.media?.listo) cubrir(ctx, t.media, w, h);
      else if (artes[pub.arte]) artes[pub.arte](ctx, w, h);
      else sinArte(ctx, w, h, pub);
      interfazVideo(ctx, w, h, pub);
    });
    t.media = cargarMedia(pub.archivo, () => { t.redibujar(); estado = null; });
    return t;
  }); // cada publicación se dibuja una vez y el feed las compone
  const n = capas.length;
  let reloj = desfase, pausado = false, cuadro = 0;
  const tex = lienzo(ancho, alto, (ctx, w, h, i = 0, u = 0) => {
    const a = capas[i % n].image, b = capas[(i + 1) % n].image;
    const y = -h * u;
    ctx.drawImage(a, 0, y);
    if (u > 0) ctx.drawImage(b, 0, y + h);
    barraEstado(ctx, w, pubs[(u > 0.5 ? i + 1 : i) % n].claro ? M.cacao : M.crema); // la barra de estado no se desplaza
    if (pausado && u === 0) cartelPausa(ctx, w);
  });
  fuentesListas.then(() => { estado = null; });
  const suave = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
  const fase = () => {
    const ciclo = Math.max(0, reloj) / cada;
    const i = Math.floor(ciclo);
    return { i, u: THREE.MathUtils.clamp((ciclo - i - (1 - pase / cada)) / (pase / cada), 0, 1) };
  };
  tex.avanzar = (dt) => {
    let { i, u } = fase();
    // En pausa el reloj solo corre para terminar un pase empezado; la publicación queda quieta en pantalla.
    if (!pausado || u > 0) {
      reloj += dt;
      const f = fase();
      if (pausado && f.i > i) reloj = (i + 1) * cada; // el pase terminó: se queda en la publicación nueva
      ({ i, u } = fase());
    }
    // Los clips visibles corren (a ~30 cuadros por segundo) y los demás se frenan.
    const visibles = u > 0 ? [i % n, (i + 1) % n] : [i % n];
    let clip = false;
    capas.forEach((c, k) => {
      const v = c.media;
      if (!v?.listo || !('play' in v)) return;
      if (visibles.includes(k)) {
        if (v.paused) v.play().catch(() => {});
        clip = true;
      } else if (!v.paused) v.pause();
    });
    if (clip) { cuadro += dt; if (cuadro >= 1 / 30) { cuadro = 0; for (const k of visibles) if (capas[k].media?.listo) capas[k].redibujar(); estado = null; } }
    const clave = `${i}:${Math.round(suave(u) * 400)}:${pausado}`;
    if (clave === estado) return;
    estado = clave;
    tex.redibujar(i, suave(u));
  };
  tex.dormir = () => { for (const c of capas) if (c.media && 'pause' in c.media && !c.media.paused) c.media.pause(); };
  tex.pausar = (si = !pausado) => { pausado = si; estado = null; return pausado; };
  return tex;
}

/** Publicación viral para la pared de celulares, con el contador de likes (poner(n) la redibuja, 15 veces por segundo como mucho). */
export function publicacionViral() {
  const formato = new Intl.NumberFormat('es-AR');
  let likes = 0, ultimo = 0;
  const base = lienzo(360, 756, (ctx, w, h) => { outOfOffice(ctx, w, h * 0.86, M.arena); barraEstado(ctx, w, M.cacao); });
  const tex = lienzo(360, 756, (ctx, w, h) => {
    ctx.drawImage(base.image, 0, 0);
    ctx.fillStyle = M.crema; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = A.ladrillo; corazon(ctx, w * 0.11, h * 0.928, w * 0.1);
    ctx.fillStyle = M.cacao; ctx.textAlign = 'left'; ctx.font = fuente(800, w * 0.085); espaciado(ctx, -w * 0.003);
    ctx.fillText(formato.format(Math.round(likes)), w * 0.2, h * 0.948);
  });
  tex.poner = (n, t) => { // t: tiempo de la escena, en segundos
    if (Math.round(n) === Math.round(likes) || Math.abs(t - ultimo) < 1 / 15) return;
    likes = n; ultimo = t; tex.redibujar();
  };
  return tex;
}

export function cartelTienda() {
  return lienzo(1024, 220, (ctx, w, h) => {
    ctx.fillStyle = M.cacao; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = M.crema; ctx.font = fuente(700, 130); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    espaciado(ctx, -7);
    ctx.fillText('Nude® Project', w / 2, h / 2 + 6);
  });
}

/** Neón de la Nude House: letras crema con halo, fondo transparente. */
export function neonNudeHouse() {
  return lienzo(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fuente(700, 150); espaciado(ctx, -6);
    ctx.shadowColor = 'rgba(255,233,201,.9)'; ctx.shadowBlur = 28;
    ctx.fillStyle = '#fff4e2';
    ctx.fillText('Nude House', w / 2, h / 2 + 8);
    ctx.shadowBlur = 0; ctx.fillText('Nude House', w / 2, h / 2 + 8);
  });
}

/** Etiqueta de envío pegada en la caja de los primeros pedidos. */
export function etiquetaEnvio() {
  return lienzo(512, 320, (ctx, w, h) => {
    ctx.fillStyle = M.blanco; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = M.cacao; ctx.textAlign = 'left';
    ctx.font = fuente(800, 54); espaciado(ctx, -2); ctx.fillText('Nude® Project', 28, 74);
    ctx.font = fuenteTexto(600, 24); espaciado(ctx, 1); ctx.fillText('PEDIDO #0001 · 2019', 30, 116);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = M.piedra; ctx.fillRect(30, 150 + i * 30, 300 - i * 60, 14); }
    ctx.fillStyle = M.cacao;
    for (let i = 0; i < 34; i++) ctx.fillRect(30 + i * 13, 250, (i * 7) % 3 === 0 ? 7 : 3, 46); // código de barras
  });
}
