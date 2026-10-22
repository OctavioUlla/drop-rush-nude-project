// Diapositivas sobre el plano secuencia: navegación, texto coreografiado con la cámara, índice, avance, cifras que
// cuentan, etiquetas flotantes y cargador. Genérico: las diapositivas se escriben en index.html y la escena en tema.js.
//
// Cada <section class="capa" data-escena="…"> es una diapositiva:
//   data-escena  estación de tema.estaciones a la que viaja la cámara (seguidas con la misma escena: no viaja).
//   data-pose    encuadre alternativo dentro de la estación (poses de la estación).
//   data-bloque  en la primera diapositiva de un bloque: su nombre en el índice de arriba.
//   data-tema    claro | oscuro (por defecto, el de la estación).
import { iniciar } from 'motor';
import tema from 'tema';

const $ = (s, el = document) => el.querySelector(s);
const escenario = $('#escenario');
const params = new URLSearchParams(location.search);
const css = (nombre) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(nombre));
const salidaTexto = css('--salida-texto') || 380;
const dosDigitos = (n) => String(n).padStart(2, '0');

// ---------- Diapositivas y bloques ----------
const nombres = tema.estaciones.map((e) => e.nombre);
const temaDe = Object.fromEntries(tema.estaciones.map((e) => [e.nombre, e.tema ?? 'claro']));
const bloques = [];
const diapos = [...document.querySelectorAll('.capa[data-escena]')].map((el, i) => {
  if (i === 0 || el.dataset.bloque) bloques.push({ nombre: el.dataset.bloque ?? '', diapo: i });
  const escena = el.dataset.escena;
  const estacion = nombres.indexOf(escena);
  if (estacion < 0) console.error(`La diapositiva ${i} pide la escena "${escena}", que no está en tema.estaciones`);
  el.setAttribute('data-tema', el.dataset.tema ?? temaDe[escena] ?? 'claro');
  return { el, escena, estacion: Math.max(0, estacion), pose: el.dataset.pose ?? null, bloque: bloques.length - 1, tema: el.dataset.tema };
});
const gigantes = [...document.querySelectorAll('.gigante')];
for (const g of gigantes) g.innerHTML = [...g.textContent.trim()].map((c, i) => `<span style="--i: ${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');

// ---------- Interfaz ----------
const menu = $('#menu');
if (menu) {
  menu.innerHTML = bloques.map((b, k) => `<li><button data-bloque="${k}"><b>${dosDigitos(k)}</b>${b.nombre}</button></li>`).join('');
  menu.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    b.blur(); // si no, Espacio volvería a apretar el botón
    ir(bloques[Number(b.dataset.bloque)].diapo);
  });
}
if ($('#total')) $('#total').textContent = `/ ${dosDigitos(bloques.length - 1)}`;

// ---------- Escena 3D ----------
let motor = null;
try {
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); // que el cargador se pinte antes de compilar
  const escala = Number.parseFloat(params.get('escala'));
  motor = iniciar({ lienzo: $('#lienzo'), escenario, tema, eventos: { salir: ocultar, entrar: () => mostrar(actual), llegar: asentar }, escalaMaxima: escala > 0 ? escala : undefined });
} catch (error) {
  // Sin WebGL: la presentación sigue con el fondo del tema y el texto.
  document.documentElement.setAttribute('data-sin-webgl', '');
  console.error(error);
}

// ---------- Estado ----------
const limitar = (n) => Math.max(0, Math.min(diapos.length - 1, n));
let actual = limitar(Number.parseInt(location.hash.slice(1), 10) || 0); // la diapositiva pedida
let visible = null; // la diapositiva cuyo texto está en pantalla
let cambio = 0;

/** Muestra el texto de la diapositiva i y actualiza la interfaz. */
function mostrar(i) {
  clearTimeout(cambio);
  const d = diapos[i];
  visible = i;
  escenario.setAttribute('data-tema', d.el.dataset.tema);
  for (const x of diapos) {
    x.el.classList.toggle('capa--activa', x === d);
    if (x === d) { clearTimeout(x.salida); x.el.classList.remove('capa--sale'); }
  }
  for (const g of gigantes) {
    g.classList.remove('gigante--sale');
    g.classList.toggle('gigante--activa', g.dataset.escena === d.escena && (!g.dataset.pose || g.dataset.pose === (d.pose ?? '')));
  }
  contar(d.el);
  if ($('#numero')) $('#numero').textContent = dosDigitos(d.bloque);
  escenario.style.setProperty('--avance', diapos.length > 1 ? i / (diapos.length - 1) : 1);
  menu?.querySelectorAll('button').forEach((b, k) => b.toggleAttribute('aria-current', k === d.bloque));
}

/** El texto visible sale hacia arriba. */
function ocultar() {
  clearTimeout(cambio);
  if (visible === null) return;
  const d = diapos[visible];
  visible = null;
  d.el.classList.remove('capa--activa');
  d.el.classList.add('capa--sale');
  clearTimeout(d.salida);
  d.salida = setTimeout(() => d.el.classList.remove('capa--sale'), salidaTexto + 200);
  for (const g of gigantes) if (g.classList.contains('gigante--activa')) g.classList.replace('gigante--activa', 'gigante--sale');
  d.el.querySelector('.etiquetas')?.classList.remove('etiquetas--visibles');
}

/** Con la cámara quieta: aparecen las etiquetas que señalan piezas y objetos. */
function asentar() {
  if (visible === null || !motor) return;
  diapos[visible].el.querySelector('.etiquetas')?.classList.add('etiquetas--visibles');
}

/** Cifras que cuentan desde 0: <b data-contar="26.5" data-decimales="1">0</b>. */
// useGrouping 'always': en español, Intl no separa los miles en números de 4 cifras (1200 en vez de 1.200).
const formato = (dec) => new Intl.NumberFormat(document.documentElement.lang || 'es', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' });
function contar(el) {
  for (const c of el.querySelectorAll('[data-contar]')) {
    const meta = Number(c.dataset.contar), dec = Number(c.dataset.decimales ?? 0), f = formato(dec);
    const t0 = performance.now() + 450;
    cancelAnimationFrame(c.animacion);
    const paso = (ahora) => {
      const u = Math.min(Math.max((ahora - t0) / 1200, 0), 1);
      c.textContent = f.format(meta * (1 - (1 - u) ** 4));
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
  const { estacion, pose } = diapos[n];
  if (motor && (motor.viajando || motor.actual !== estacion)) motor.ir(estacion, pose);
  else { motor?.pose(pose); cambiarTexto(n); }
}

// ---------- Etiquetas flotantes: siguen a su pieza o ancla en cada cuadro ----------
function seguirEtiquetas() {
  requestAnimationFrame(seguirEtiquetas);
  if (!motor) return;
  const d = diapos[visible ?? actual];
  for (const et of d.el.querySelectorAll('.etiqueta-3d')) {
    const punto = (et.dataset.punto ?? '0,0,0').split(',').map(Number);
    const { x, y } = motor.proyectar(et.dataset.pieza ?? et.dataset.ancla, punto);
    et.style.setProperty('--x', `${x}%`);
    et.style.setProperty('--y', `${y}%`);
  }
}
requestAnimationFrame(seguirEtiquetas);

// ---------- Teclado, clic y gestos ----------
addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const k = ev.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) ir(actual + 1);
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) ir(actual - 1);
  else if (k === 'Home') ir(0);
  else if (k === 'End') ir(diapos.length - 1);
  else if (k === 'f' || k === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
  else return;
  ev.preventDefault();
});
escenario.addEventListener('click', (ev) => { if (!ev.target.closest('button, a')) ir(actual + 1); });
let toque = null;
escenario.addEventListener('touchstart', (ev) => { toque = ev.touches[0].clientX; }, { passive: true });
escenario.addEventListener('touchend', (ev) => {
  if (toque === null) return;
  const dx = ev.changedTouches[0].clientX - toque;
  toque = null;
  if (Math.abs(dx) > 40) { ev.preventDefault(); ir(actual + (dx < 0 ? 1 : -1)); }
});
// El cursor se esconde si no se mueve (proyector).
let quieto = 0;
addEventListener('pointermove', () => {
  escenario.classList.remove('escenario--sin-cursor');
  clearTimeout(quieto);
  quieto = setTimeout(() => escenario.classList.add('escenario--sin-cursor'), 2500);
});

// ---------- Cargador: cuenta hasta 100 % y se abre como un telón ----------
const cargador = $('.cargador');
const porcentaje = $('#porcentaje');
await new Promise((listo) => {
  const t0 = performance.now(), dur = params.has('capturar') ? 0 : 1400;
  const paso = (ahora) => {
    const u = dur ? Math.min((ahora - t0) / dur, 1) : 1;
    const p = 1 - (1 - u) ** 3;
    cargador?.style.setProperty('--p', p);
    if (porcentaje) porcentaje.textContent = `${Math.round(p * 100)} %`;
    if (u < 1) requestAnimationFrame(paso); else listo();
  };
  requestAnimationFrame(paso);
});
await document.fonts?.ready;
cargador?.classList.add('cargador--listo');
if (motor && actual) motor.saltar(diapos[actual].estacion, diapos[actual].pose);
// Capturas: sin bucle de render (en un navegador sin GPU cada cuadro tarda y frena las animaciones del texto).
if (motor && params.has('capturar')) motor.depuracion.pausar(true);
motor?.arrancar();
setTimeout(() => { mostrar(actual); asentar(); }, motor ? 450 : 0);

// API para herramientas (capturas): saltar a una diapositiva con la escena asentada.
window.deck = {
  get total() { return diapos.length; },
  get actual() { return actual; },
  ir,
  saltar(i) {
    actual = limitar(i);
    if (motor) { motor.saltar(diapos[actual].estacion, diapos[actual].pose); motor.adelantar(3); }
    for (const d of diapos) d.el.classList.remove('capa--sale');
    mostrar(actual);
    asentar();
  },
  /** Congela el viaje de la diapositiva i−1 a la i en una fracción (0 a 1) del recorrido. false si no hay viaje. */
  viajar(i, fraccion = 0.5) {
    i = limitar(i);
    if (!motor || i === 0) return false;
    const desde = diapos[i - 1], hasta = diapos[i];
    if (desde.estacion === hasta.estacion) return false;
    motor.saltar(desde.estacion, desde.pose);
    motor.adelantar(2);
    mostrar(i - 1);
    actual = i;
    motor.ir(hasta.estacion, hasta.pose);
    motor.adelantar(motor.duracionViaje(desde.estacion, hasta.estacion) * fraccion);
    return true;
  },
};
window.presentacionLista = true;
