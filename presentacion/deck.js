// Motor de diapositivas del proyector (PLANIFICACION, sección 6.2): navegación, teclado, escalado 16:9,
// cronómetro por bloque, modo presentador (BroadcastChannel) e impresión.
// La escena 3D es la del design system: el deck le pide viajar a la estación de cada diapositiva y,
// cuando dos diapositivas seguidas comparten estación, solo cambia el texto (la cámara no se mueve).
import { tokens, colores, colorDeGrupo } from '../design-system/tokens.js';
import { crearCola } from '../design-system/cola.js';
import { CANAL, dosDigitos, leerDiapositivas } from './comun.js';
import { abrirSala } from './interactivo/sala.js';
import { crearHype } from './interactivo/hype.js';
import { crearVotacion } from './interactivo/votacion.js';

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
    const feeds = await leerFeeds();
    motor = iniciar({ lienzo: $('#lienzo'), escenario, eventos: { salir, entrar, llegar }, escalaMaxima: escala > 0 ? escala : undefined, feeds });
    if (params.has('depurar') || params.has('render')) window.motor = motor; // herramientas: control de solapes y renders
  } catch (error) {
    // Sin WebGL: la presentación sigue, con el fondo del tema (y las imágenes de respaldo cuando existan).
    document.documentElement.setAttribute('data-np-sin-webgl', '');
    console.error(error);
  }
}
/**
 * Publicaciones de los feeds de EGC vs. UGC, de la pared viral y de los cuadros de la Nude House (datos/feeds.json). Las rutas de fotos y clips son relativas al
 * archivo. Si no se puede leer, el motor usa las publicaciones de prueba del design system.
 */
async function leerFeeds() {
  const url = new URL('./datos/feeds.json', location.href);
  try {
    const datos = await (await fetch(url)).json();
    for (const pub of [...(datos.egc ?? []), ...(datos.ugc ?? []), datos.viral, ...(datos.experiencial?.fotos ?? [])]) if (pub?.archivo) pub.archivo = new URL(pub.archivo, url).href;
    return datos;
  } catch (error) {
    console.warn('No se pudo leer datos/feeds.json: se usan las publicaciones de prueba', error);
    return undefined;
  }
}
/** Pregunta y opciones de la votación en vivo (datos/votacion.json). Sin el archivo, no hay votación. */
async function leerVotacion() {
  try {
    return await (await fetch(new URL('./datos/votacion.json', location.href))).json();
  } catch (error) {
    console.warn('No se pudo leer datos/votacion.json: la tecla V no abre nada', error);
    return null;
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
// Cola de la tienda (PLANIFICACION 2.2): la barra de progreso. En cada bloque entra una persona y la fila da un
// paso; en el último nos toca y se abre la puerta (QUEDA 1).
const cola = crearCola($('#cola'), { bloques: bloques.length });

// ---------- Estado ----------
const limitar = (n) => Math.max(0, Math.min(diapos.length - 1, n));
let actual = limitar(Number.parseInt(location.hash.slice(1), 10) || 0); // la diapositiva pedida
let visible = null; // la diapositiva cuyo texto está en pantalla
let cambio = 0; // cambio de texto pendiente dentro de una misma estación
let pausa = false;
let feedsPausados = false;
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
  cola.ir(d.bloque);
  sala?.etapa(etapaDe(i));
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
  alternarQr(false);
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
  canal?.postMessage({ tipo: 'estado', actual, pausa, feedsPausados, reloj: structuredClone(reloj), ahora: Date.now(), interactivo: estadoInteractivo() });
}
setInterval(avisar, 1000); // latido: el presentador sabe si el proyector sigue abierto
canal?.addEventListener('message', ({ data }) => {
  if (data.tipo === 'hola') avisar();
  else if (data.tipo === 'ir') ir(data.diapositiva);
  else if (data.tipo === 'siguiente') siguiente();
  else if (data.tipo === 'anterior') anterior();
  else if (data.tipo === 'pausa') alternarPausa();
  else if (data.tipo === 'feeds') alternarFeeds();
  else if (data.tipo === 'clase') alternarClase();
  else if (data.tipo === 'hype') lanzarHype();
  else if (data.tipo === 'qr') alternarQr();
  else if (data.tipo === 'votacion') votacion?.alternar();
  else if (data.tipo === 'reiniciar-interactivo') reiniciarInteractivo();
  else if (data.tipo === 'reloj') { (data.accion === 'empezar' ? empezarReloj : reiniciarReloj)(); avisar(); }
});
const abrirPresentador = () => window.open('./presentador.html', 'np-presentador', 'popup,width=1440,height=900');

/** Tecla F: frena los feeds de EGC vs. UGC para comentar la publicación que se ve (y los reanuda). */
function alternarFeeds() {
  if (!motor) return;
  feedsPausados = motor.pausarFeeds(!feedsPausados);
  avisar();
}

/**
 * Tecla U, en EGC vs. UGC (después de los clips reales): el celular de UGC muestra las fotos que se sacaron los grupos
 * en la espera, como publicaciones (@grupo7, @grupo12…), unos 15 s; otra U las saca antes. Sin servidor o sin fotos,
 * las de ensayo (lo dice la cabecera del feed).
 */
function alternarClase() {
  if (!motor || diapos[actual].escena !== 'egc-ugc' || motor.viajando) return;
  if (motor.claseEnFeed()) motor.mostrarClase(null);
  else motor.mostrarClase(fotosDeLaClase());
  avisar();
}
const fotosDeLaClase = () =>
  (servidor === 'conectado' ? sala.fotos : []).map((f) => ({
    cuenta: f.profe ? '@profes' : `@grupo${f.numero}`,
    url: f.url,
    color: f.profe ? colores.marca.cacao : colorDeGrupo(f.numero).color,
  }));

function alternarPausa() {
  pausa = !pausa;
  $('#pausa').classList.toggle('pausa--activa', pausa);
  avisar();
}

// ---------- Interacciones con los celulares (PLANIFICACION 2.1 a 2.3, fase 4) ----------
// La presentación abre la sala del juego: el QR de la portada lleva a /play/ con la sala elegida, el hype (H) y la
// votación (V) llegan a los celulares y la cola la forman los grupos conectados. Sin servidor (o sin celulares) el
// hype y la votación se ensayan con grupos simulados, así la presentación nunca se traba.
let sala = null;
let servidor = imprimiendo ? 'sin servidor' : 'conectando'; // conectando | conectado | sin servidor
let qrGrande = false; // QR a pantalla completa (tecla Q)
/** En el último bloque (Drop Rush) los celulares pasan al lobby del juego; antes, a la espera de la presentación. */
const etapaDe = (i) => (diapos[i].bloque === ultimoBloque ? 'juego' : 'presentacion');
// Se declaran antes de crearlos: al crearse ya avisan al modo presentador, que lee su estado.
let hype = null, votacion = null;
if ($('#hype')) hype = crearHype({ $, escenario, motor, sala: () => sala, alCambiar: avisar });
const datosVotacion = imprimiendo ? null : await leerVotacion();
if (datosVotacion) votacion = crearVotacion({ datos: datosVotacion, contenedores: [...document.querySelectorAll('[data-votacion]')], estados: [...document.querySelectorAll('[data-votacion-estado]')], escenario, motor, sala: () => sala, alCambiar: avisar });

if (!imprimiendo) {
  abrirSala({ etapa: etapaDe(actual), nueva: params.has('nueva-sala') })
    .then((s) => {
      sala = s;
      hype?.conectar(s);
      votacion?.conectar(s);
      s.addEventListener('cambio', pintarSala);
      // Si no hay sala a los pocos segundos, se avisa (el socket sigue reintentando y la sala aparece sola cuando vuelve).
      setInterval(pintarSala, 3000);
    })
    .catch((error) => {
      console.warn('Sin servidor del juego: el hype y la votación se ensayan sin celulares', error);
      servidor = 'sin servidor';
      pintarSala();
    });
}

/** QR y contador de la portada, sala en la interfaz y en el bloque de Drop Rush, y la cola con los grupos. */
function pintarSala() {
  if (sala) servidor = sala.conectado ? 'conectado' : sala.codigo || performance.now() > 9000 ? 'sin servidor' : 'conectando';
  escenario.dataset.servidor = servidor;
  const enLinea = servidor === 'conectado';
  const conectados = enLinea ? sala.conectados : 0;
  const cifra = enLinea ? `${conectados}/${sala.max}` : '';
  if (enLinea && $('#qr').dataset.url !== sala.urlQr) {
    $('#qr').dataset.url = sala.urlQr;
    $('#qr').src = $('#qr-grande-img').src = `/api/qr.svg?texto=${encodeURIComponent(sala.urlQr)}`;
    $('#sala-url').textContent = $('#qr-grande-url').textContent = `${sala.urlCelulares.replace(/^https?:\/\//, '')}/play`;
  }
  if (!enLinea) alternarQr(false);
  for (const el of document.querySelectorAll('[data-sala="codigo"]')) el.textContent = sala?.codigo ?? '—';
  for (const el of document.querySelectorAll('[data-sala="conectados"]')) el.textContent = cifra;
  $('#sala-estado').textContent = enLinea ? `${cifra} en la cola` : servidor === 'conectando' ? 'Conectando con el servidor…' : 'Sin servidor: el hype y la votación se ensayan sin celulares';
  $('#pista').textContent = enLinea ? `Sala ${sala.codigo} · ${cifra} conectados · /play` : '← → recorrer · P presentador';
  // Los profes (P1 a P5, fuera de concurso) también hacen la cola, en cacao.
  const colorEnCola = (g) => (g.teacher ? colores.marca.cacao : colorDeGrupo(g.number).color);
  cola.grupos(enLinea ? sala.grupos.filter((g) => g.connected).map(colorEnCola) : []);
  avisar();
}

/**
 * Tecla Q (o tocar el QR chico): el QR a pantalla completa, para que se escanee desde el fondo del aula y para los que
 * llegan tarde en cualquier diapositiva. Sin sala no hay QR que mostrar. Se cierra al cambiar de diapositiva.
 */
function alternarQr(si = !qrGrande) {
  si = si && servidor === 'conectado';
  if (si === qrGrande) return;
  qrGrande = si;
  $('#qr-grande').classList.toggle('qr-grande--activo', si);
  $('#qr-grande').setAttribute('aria-hidden', String(!si));
  avisar();
}
$('#qr-agrandar').addEventListener('click', (ev) => {
  ev.currentTarget.blur(); // si no, Espacio (o el control de diapositivas) lo volvería a apretar
  alternarQr(true);
});
$('#qr-grande').addEventListener('click', () => alternarQr(false));

/** Tecla H, solo en la portada: cuenta regresiva → medidor → drop; con el medidor corriendo, lo completa. */
function lanzarHype() {
  if (!hype || diapos[actual].escena !== 'portada' || motor?.viajando) return;
  alternarQr(false);
  hype.alternar();
}

/** Tecla J (en el bloque de Drop Rush): el proyector del juego, en la misma ventana y con la misma sala. */
function abrirJuego() {
  if (diapos[actual].bloque === ultimoBloque) location.assign('/host/');
}

/** Ensayos: borra el hype y la votación guardados en el servidor. */
function reiniciarInteractivo() {
  sala?.pedir('pres:reiniciar');
}

/** Estado de la sala, el hype y la votación para el modo presentador. */
function estadoInteractivo() {
  return {
    servidor,
    qrGrande,
    sala: sala?.codigo ?? null,
    conectados: servidor === 'conectado' ? sala.conectados : 0,
    max: sala?.max ?? 40,
    hype: hype?.estado ?? null,
    votacion: votacion?.estado ?? null,
    fotos: servidor === 'conectado' ? sala.fotos.length : 0,
    clase: motor?.claseEnFeed() ?? null,
  };
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
  else if (tecla === 'h') lanzarHype();
  else if (tecla === 'q') alternarQr();
  else if (tecla === 'Escape') alternarQr(false);
  else if (tecla === 'v') votacion?.alternar();
  else if (tecla === 'j') abrirJuego();
  else if (tecla === 'f') alternarFeeds();
  else if (tecla === 'u') alternarClase();
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
