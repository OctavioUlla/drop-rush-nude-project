// Motor de diapositivas del proyector (PLANIFICACION, sección 6.2): navegación, teclado, escalado 16:9,
// cronómetro por bloque, modo presentador (BroadcastChannel) e impresión.
// La escena 3D es la del design system: el deck le pide viajar a la estación de cada diapositiva y,
// cuando dos diapositivas seguidas comparten estación, solo cambia el texto (la cámara no se mueve).
import { tokens } from '../design-system/tokens.js';
import { CANAL, dosDigitos, leerDiapositivas } from './comun.js';

const $ = (s, el = document) => el.querySelector(s);
const params = new URLSearchParams(location.search);
const escenario = $('#escenario');
const { diapos, bloques } = leerDiapositivas(document);
const gigantes = [...document.querySelectorAll('.np-gigante')];
const salidaTexto = Number.parseFloat(tokens.movimiento['salida-texto']);
const ultimoBloque = bloques.length - 1;
// Cada diapositiva lleva su tema explícito: así no hereda el del escenario (en la impresión van todas juntas).
for (const d of diapos) d.el.setAttribute('data-np-tema', d.tema);

// ---------- Impresión: una diapositiva por página ----------
const imprimiendo = params.has('imprimir');
const marcarImpresion = (si) => document.documentElement.toggleAttribute('data-impresion', si || imprimiendo);
addEventListener('beforeprint', () => marcarImpresion(true));
addEventListener('afterprint', () => marcarImpresion(false));
marcarImpresion(false);

// Letras de la tipografía gigante, para que entren una por una.
for (const g of gigantes) g.innerHTML = [...g.textContent].map((c, i) => `<span style="--i: ${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');

// ---------- Escena 3D ----------
let motor = null;
if (!imprimiendo) {
  try {
    const { iniciar } = await import('../design-system/escena/escena.js');
    const escala = Number.parseFloat(params.get('escala'));
    motor = iniciar({ lienzo: $('#lienzo'), escenario, eventos: { salir, entrar, llegar }, escalaMaxima: escala > 0 ? escala : undefined });
    if (params.has('depurar') || params.has('render')) window.motor = motor; // herramientas: control de solapes y renders
  } catch (error) {
    // Sin WebGL: la presentación sigue, con el fondo del tema (y las imágenes de respaldo cuando existan).
    document.documentElement.setAttribute('data-np-sin-webgl', '');
    console.error(error);
  }
}
// Imagen pre-renderizada de cada diapositiva (renders/, ver tools/renders.mjs): se ve sin WebGL y en el PDF.
for (const d of diapos) d.el.style.setProperty('--respaldo', `url("${new URL(`./renders/${d.escena}${d.pose ? `-${d.pose}` : ''}.jpg`, location.href)}")`);
// ?render: solo la escena, sin texto ni interfaz (para generar esas imágenes).
document.documentElement.toggleAttribute('data-render', params.has('render'));
window.deckListo = true;

// ---------- Interfaz: índice de bloques ----------
$('#menu').innerHTML = bloques.map((b) => `<li><button data-bloque="${b.indice}"><b>${dosDigitos(b.indice)}</b>${b.nombre}</button></li>`).join('');
$('#menu').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  b.blur(); // si no, Espacio (o el control de diapositivas) volvería a apretar el botón
  ir(bloques[Number(b.dataset.bloque)].diapos[0]);
});
$('#de').textContent = `/ ${dosDigitos(ultimoBloque)}`;

// ---------- Estado ----------
const limitar = (n) => Math.max(0, Math.min(diapos.length - 1, n));
let actual = limitar(Number.parseInt(location.hash.slice(1), 10) || 0); // la diapositiva pedida
let visible = null; // la diapositiva cuyo texto está en pantalla
let cambio = 0; // cambio de texto pendiente dentro de una misma estación
let pausa = false;
// Cronómetro por bloque (ver más abajo): ms acumulados en cada bloque y desde cuándo corre el actual.
const reloj = { inicio: null, porBloque: bloques.map(() => 0), bloque: 0, desde: null };

/** Muestra el texto de la diapositiva i y actualiza la interfaz. */
function mostrar(i) {
  clearTimeout(cambio);
  const d = diapos[i];
  visible = i;
  escenario.setAttribute('data-np-tema', d.tema);
  for (const x of diapos) {
    x.el.classList.toggle('np-diapo--activa', x === d);
    if (x === d) { clearTimeout(x.salida); x.el.classList.remove('np-capa--sale'); }
  }
  for (const g of gigantes) {
    g.classList.remove('np-gigante--sale');
    g.classList.toggle('np-gigante--activa', g.dataset.escena === d.escena);
  }
  contar(d.el);
  $('#numero').textContent = dosDigitos(d.bloque);
  $('#bloque').textContent = dosDigitos(d.bloque);
  $('#barra').style.setProperty('--avance', d.bloque / ultimoBloque);
  $('#cola').style.setProperty('--avance', d.bloque / ultimoBloque);
  $('#puerta').classList.toggle('np-cola__puerta--abierta', d.bloque === ultimoBloque);
  document.querySelectorAll('#menu button').forEach((b, k) => b.toggleAttribute('aria-current', k === d.bloque));
}

/** El texto visible sale hacia arriba. */
function ocultar() {
  clearTimeout(cambio);
  if (visible === null) return;
  const d = diapos[visible];
  visible = null;
  d.el.classList.remove('np-diapo--activa');
  d.el.classList.add('np-capa--sale');
  clearTimeout(d.salida);
  d.salida = setTimeout(() => d.el.classList.remove('np-capa--sale'), salidaTexto + 200);
  for (const g of gigantes) if (g.classList.contains('np-gigante--activa')) g.classList.replace('np-gigante--activa', 'np-gigante--sale');
  d.el.querySelector('.np-etiquetas')?.classList.remove('np-etiquetas--visibles');
}

/** Con la cámara quieta en la estación: aparecen las etiquetas que señalan piezas y objetos de la escena. */
function asentar() {
  if (visible === null || !motor) return;
  diapos[visible].el.querySelector('.np-etiquetas')?.classList.add('np-etiquetas--visibles');
}

/** Cifras que cuentan desde 0 al entrar la diapositiva: <b data-contar="512394">. */
const formato = new Intl.NumberFormat('es-AR');
const durCifra = Number.parseFloat(tokens.movimiento.cifra);
function contar(el) {
  for (const c of el.querySelectorAll('[data-contar]')) {
    const meta = Number(c.dataset.contar), t0 = performance.now() + 450;
    cancelAnimationFrame(c.animacion);
    const paso = (ahora) => {
      const u = Math.min(Math.max((ahora - t0) / durCifra, 0), 1);
      c.textContent = formato.format(Math.round(meta * (1 - (1 - u) ** 4)));
      if (u < 1) c.animacion = requestAnimationFrame(paso);
    };
    c.animacion = requestAnimationFrame(paso);
  }
}

/** Cambia el texto sin mover la cámara (dos diapositivas de una misma estación). */
function cambiarTexto(i) {
  const habia = visible !== null;
  ocultar();
  cambio = setTimeout(() => { mostrar(i); asentar(); }, habia ? salidaTexto : 0);
}

function ir(n) {
  n = limitar(n);
  if (n === actual && (visible === n || motor?.viajando)) return;
  actual = n;
  history.replaceState(null, '', `#${n}`);
  if (reloj.inicio !== null) marcarBloque();
  else if (n !== 0) empezarReloj(); // si nadie lo empezó, arranca al pasar de la portada
  avisar();
  const { estacion, pose } = diapos[n];
  if (motor && (motor.viajando || motor.actual !== estacion)) motor.ir(estacion, pose);
  else { motor?.pose(pose); cambiarTexto(n); }
}
const siguiente = () => ir(actual + 1);
const anterior = () => ir(actual - 1);

// Eventos del viaje de cámara (estaciones, no diapositivas).
function salir() { ocultar(); }
function entrar(estacion) {
  // Si mientras viajaba se pidió otra diapositiva de la misma estación, se muestra esa.
  const d = diapos[actual];
  mostrar(d.estacion === estacion ? actual : bloques.find((b) => b.estacion === estacion).diapos[0]);
}
function llegar(estacion) {
  if (diapos[actual].estacion === estacion && visible !== actual) cambiarTexto(actual);
  else asentar();
}

// Etiquetas flotantes: se proyectan en cada cuadro desde una pieza de la sudadera (data-pieza) o un ancla de la
// estación (data-ancla); data-punto="x y z" elige el punto de la pieza (de -1 a 1) o desplaza el ancla (en metros).
const fijarEtiquetas = () => {
  const capa = visible !== null && diapos[visible].el.querySelector('.np-etiquetas--visibles');
  if (capa) {
    for (const el of capa.children) {
      el.punto ??= (el.dataset.punto ?? '0 0 0').split(' ').map(Number);
      const { x, y } = motor.proyectar(el.dataset.pieza ?? el.dataset.ancla, el.punto);
      el.style.setProperty('--x', `${x}%`);
      el.style.setProperty('--y', `${y}%`);
    }
  }
  requestAnimationFrame(fijarEtiquetas);
};
if (motor) requestAnimationFrame(fijarEtiquetas);

// ---------- Cronómetro por bloque ----------
// Lo lleva el proyector (así sobrevive a cerrar y abrir el modo presentador). Guarda marcas de tiempo:
// el presentador calcula lo transcurrido con su propio reloj, que es el mismo porque están en la misma compu.
function empezarReloj() {
  const ahora = Date.now();
  Object.assign(reloj, { inicio: ahora, porBloque: bloques.map(() => 0), bloque: diapos[actual].bloque, desde: ahora });
}
function marcarBloque() {
  const b = diapos[actual].bloque;
  if (b === reloj.bloque) return;
  const ahora = Date.now();
  reloj.porBloque[reloj.bloque] += ahora - reloj.desde;
  Object.assign(reloj, { bloque: b, desde: ahora });
}
function reiniciarReloj() {
  Object.assign(reloj, { inicio: null, porBloque: bloques.map(() => 0), bloque: diapos[actual].bloque, desde: null });
}

// ---------- Modo presentador ----------
const canal = 'BroadcastChannel' in window ? new BroadcastChannel(CANAL) : null;
function avisar() {
  canal?.postMessage({ tipo: 'estado', actual, pausa, reloj: structuredClone(reloj), ahora: Date.now() });
}
setInterval(avisar, 1000); // latido: el presentador sabe si el proyector sigue abierto
canal?.addEventListener('message', ({ data }) => {
  if (data.tipo === 'hola') avisar();
  else if (data.tipo === 'ir') ir(data.diapositiva);
  else if (data.tipo === 'siguiente') siguiente();
  else if (data.tipo === 'anterior') anterior();
  else if (data.tipo === 'pausa') alternarPausa();
  else if (data.tipo === 'reloj') { (data.accion === 'empezar' ? empezarReloj : reiniciarReloj)(); avisar(); }
});
const abrirPresentador = () => window.open('./presentador.html', 'np-presentador', 'popup,width=1440,height=900');

function alternarPausa() {
  pausa = !pausa;
  $('#pausa').classList.toggle('pausa--activa', pausa);
  avisar();
}

// ---------- Hype colectivo de la portada (PLANIFICACION 2.1) ----------
// Tecla H: cuenta regresiva → medidor → drop. Hasta la fase 4 es un ensayo sin celulares: los toques se simulan
// con 40 grupos; la fase 4 reemplaza la simulación por los eventos pres:hype:* del servidor, sin tocar la escena.
const hypeUi = $('#hype');
const GRUPOS = 40, META = 25 * GRUPOS;
let ensayo = null;
if (hypeUi) $('#hype-grupos').innerHTML = Array.from({ length: GRUPOS }, (_, i) => `<span class="np-ficha np-ficha--libre" style="--g: var(--np-grupo-${i + 1}); --gt: var(--np-grupo-${i + 1}-texto)">${i + 1}</span>`).join('');
function faseHype(fase) {
  escenario.dataset.hype = fase;
  hypeUi?.setAttribute('data-fase', fase);
}
function pintarHype(toques, sumando) {
  const nivel = Math.min(toques / META, 1);
  $('#hype-barra').style.setProperty('--valor', `${(nivel * 100).toFixed(1)}%`);
  $('#hype-cifra').textContent = `${Math.floor(nivel * 100)} % · ${formato.format(toques)} toques`;
  $('#hype-sumando').textContent = `${sumando.size}/${GRUPOS} grupos sumando`;
  $('#hype-grupos').querySelectorAll('.np-ficha').forEach((f, i) => f.classList.toggle('np-ficha--libre', !sumando.has(i)));
  motor?.hype('llenando', nivel);
}
function hype() {
  if (!hypeUi || diapos[actual].escena !== 'portada' || motor?.viajando) return;
  if (ensayo?.fase === 'llenando') { ensayo.toques = META; return; } // el presentador lo completa si se estanca
  if (ensayo) return;
  ensayo = { fase: 'cuenta', toques: 0, sumando: new Set() };
  faseHype('cuenta');
  motor?.hype('cuenta');
  const cuenta = $('#hype-cuenta');
  [3, 2, 1].forEach((n, k) => setTimeout(() => { cuenta.textContent = n; cuenta.classList.remove('np-cuenta--ya'); }, k * 1000));
  setTimeout(() => {
    cuenta.textContent = '¡Hype!'; cuenta.classList.add('np-cuenta--ya');
    ensayo.fase = 'llenando';
    faseHype('llenando');
    pintarHype(0, ensayo.sumando);
    let ultimo = performance.now();
    const simular = (ahora) => {
      const dt = (ahora - ultimo) / 1000; ultimo = ahora;
      // Cada grupo arranca a su tiempo y toca entre 4 y 8 veces por segundo (el tope del servidor).
      for (let g = 0; g < GRUPOS; g++) if (Math.random() < dt * 1.4) ensayo.sumando.add(g);
      ensayo.toques = Math.min(META, ensayo.toques + Math.round(ensayo.sumando.size * dt * (2 + Math.random() * 1.6)));
      pintarHype(ensayo.toques, ensayo.sumando);
      if (ensayo.toques < META) return requestAnimationFrame(simular);
      // ¡Drop!
      faseHype('drop');
      motor?.hype('drop');
      $('#hype-final').textContent = `${GRUPOS} grupos, ${formato.format(ensayo.toques)} toques: el drop salió.`;
      setTimeout(() => { faseHype('reposo'); ensayo = null; }, 6000);
    };
    requestAnimationFrame(simular);
  }, 3000);
}

// ---------- Medidor de rendimiento (fase 0: fps en la notebook del presentador) ----------
let medidor = null;
async function medir(recorrer = false) {
  if (!motor) return;
  if (!medidor) {
    const { crearMedidor } = await import('./medidor.js');
    medidor = crearMedidor({ escenario, lienzo: $('#lienzo'), motor, bloques, ir });
  }
  if (recorrer) medidor.recorrer();
  else medidor.alternar();
}

// ---------- Teclado (también sirve con un control de diapositivas), rueda y deslizar ----------
addEventListener('keydown', (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const tecla = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(tecla)) { ev.preventDefault(); siguiente(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(tecla)) { ev.preventDefault(); anterior(); }
  else if (tecla === 'Home') ir(0);
  else if (tecla === 'End') ir(diapos.length - 1);
  else if (tecla === 'p') abrirPresentador();
  else if (tecla === 'b' || tecla === '.') alternarPausa(); // los controles de diapositivas mandan "." para la pantalla negra
  else if (tecla === 'm') medir();
  else if (tecla === 'h') hype();
});
addEventListener('hashchange', () => ir(Number.parseInt(location.hash.slice(1), 10) || 0));
// La rueda recorre la presentación solo a pantalla completa: dentro de un iframe tiene que seguir bajando la página.
let rueda = 0, ruedaHasta = 0;
if (window.top === window && !imprimiendo) addEventListener('wheel', (ev) => {
  if (performance.now() < ruedaHasta) return;
  rueda += ev.deltaY;
  if (Math.abs(rueda) > 80) { (rueda > 0 ? siguiente : anterior)(); rueda = 0; ruedaHasta = performance.now() + 900; }
}, { passive: true });
let x0 = null;
escenario.addEventListener('pointerdown', (ev) => { x0 = ev.target.closest('button') ? null : ev.clientX; });
escenario.addEventListener('pointerup', (ev) => {
  if (x0 !== null && Math.abs(ev.clientX - x0) > 50) (ev.clientX < x0 ? siguiente : anterior)();
  x0 = null;
});
// El cursor se esconde si no se mueve (en el proyector molesta).
let quieto = 0;
addEventListener('pointermove', () => {
  escenario.classList.remove('np-escenario--sin-cursor');
  clearTimeout(quieto);
  quieto = setTimeout(() => escenario.classList.add('np-escenario--sin-cursor'), 2500);
});

// ---------- Cargador: cuenta hasta 100 mientras se compilan los shaders y cargan las fuentes ----------
if (imprimiendo) {
  $('#cargador').remove();
  diapos.forEach((d) => d.el.classList.add('np-diapo--activa'));
} else {
  if (motor) motor.saltar(diapos[actual].estacion, diapos[actual].pose);
  const durCarga = Number.parseFloat(tokens.movimiento.cargador);
  const t0 = performance.now();
  await document.fonts.ready;
  const contar = (ahora) => {
    const p = Math.min((ahora - t0) / durCarga, 1);
    const suave = 1 - (1 - p) ** 3;
    $('#carga').style.setProperty('--p', suave);
    $('#porcentaje').textContent = `${Math.round(suave * 100)} %`;
    if (p < 1) return requestAnimationFrame(contar);
    $('#cargador').classList.add('np-cargador--listo');
    mostrar(actual);
    setTimeout(() => {
      motor?.arrancar();
      asentar();
      if (params.has('medir')) medir(true);
    }, 350);
  };
  requestAnimationFrame(contar);
}
avisar();
