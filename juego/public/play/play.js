import { colorGrupo } from '../shared/grupos.js';
import { FASES, PASOS_POR_SEGUNDO, VELOCIDAD_BASE, INTERVALO_PROGRESO, VALOR_LIKE, esProfe, etiquetaGrupo } from '../shared/constantes.js';
import { recorridoIdeal } from '../shared/carrera.js';
import { VENTAJAS, PODERES, DURACION_ARRANQUE_LENTO } from '../shared/poderes.js';
import { Guion } from '../shared/guion.js';
import { Corredor } from './runner.js';
import { Pista } from './track.js';
import { escucharControles } from './input.js';
import { Red } from './net.js';
import { Vista } from './render/vista.js';
import { Calidad, resumirCuadros } from './render/quality.js';
import { PantallaPresentacion } from './presentacion.js';

// Controlador del celular.
// ?sala=ABCD   → entra directo a esa sala (es lo que trae el QR del proyector).
// ?solo        → sin servidor: práctica y partida simulada en el propio celular.
// ?calidad=baja|media|alta → fija la calidad (para comparar mediciones).
// ?debug       → abre el panel de pruebas al cargar.

const PASO = 1 / PASOS_POR_SEGUNDO;
const LETRAS = ['A', 'B', 'C'];
// Al llegar, el corredor frena en unos 3 m y queda mirando la tienda (y la cola) desde un poco antes.
const FRENADA_TIENDA = 14;
// Textos cortos de ejemplo para los arcos de la partida simulada (?solo).
const CORTAS_SOLO = ['EGC', 'UGC', 'Influencers'];
const params = new URLSearchParams(location.search);
const SOLO = params.has('solo');
const CODIGO_URL = params.get('sala')?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || null;

const $ = (id) => document.getElementById(id);

// ---------- Estado ----------
const corredor = new Corredor();
const pista = new Pista();
const calidad = new Calidad({ forzada: params.get('calidad'), alCambiarNivel: () => vista?.aplicarNivel() });
let vista = null;
let red = null;
let presentacion = null; // pantallas de la presentación (espera, hype y votación) antes del juego
let grupo = SOLO ? 1 : null;
let guion = null;
let guionIniciado = null; // id del guion con el que se reinició el corredor
let faseActual = null;
let respuestaPendiente = null; // { index, desde } durante una pregunta
let pregunta = null; // la pregunta en curso (textos cortos para los carriles)
// Bonus de cada pregunta acertada (índice → metros): si un resultado llega dos veces no se suma dos veces.
const bonusPorPregunta = new Map();
const bonusTotal = () => [...bonusPorPregunta.values()].reduce((s, b) => s + b, 0);
/** Distancia total como la calcula el servidor: corrida + bonus de las respuestas + likes. */
const distanciaTotal = () => corredor.distancia + bonusTotal() + corredor.likes * VALOR_LIKE;
let rango = null;
let resultadoFinal = null;
let cartelHasta = 0;
let practicaHasta = 0;
let medicion = null;
let distanciaSync = 0;
let aciertosSolo = 0;
let arcos = null; // { index, opciones, z } de la última pregunta (se quedan donde se cruzaron)
let tiendaZ = null; // distancia de la puerta de la tienda (sprint final y llegada)
const carteles = LETRAS.map((letra) => ({ letra, texto: '', activo: false, cerrado: false }));
// Ventajas y poderes (Fase 3). Las horas son del servidor.
let ventaja = null; // { id, hasta }: activa desde que llega el resultado hasta el final del tramo
let poder = null; // poder guardado, listo para usar
let usoPendiente = null; // poder usado que todavía no confirmó el servidor
let hype = false; // la próxima respuesta correcta vale el doble
let cincuentaPendiente = false; // Pase 50/50 esperando la próxima pregunta de 3 opciones
let cerrada = null; // { index, lane }: arco cerrado por el Pase 50/50
let algoritmoHasta = 0; // Cambio de algoritmo de otro grupo: más obstáculos hasta esta hora
let extrasHasta = 0; // distancia hasta la que ya se agregaron obstáculos extra
let impulso = false; // último cuarto de la tabla (emparejar): se aplica desde la próxima fase
const resultadosVistos = new Set(); // índices de pregunta cuyo resultado ya se aplicó
let corrimientosVistos = 0; // corrimientos del guion (pausa o salto del presentador) ya aplicados

/** Hora del guion: la del servidor, congelada mientras el presentador tiene la partida en pausa. */
const ahora = () => {
  const t = red ? red.ahora() : Date.now();
  return guion ? guion.tiempo(t) : t;
};

// ---------- Arranque ----------
function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function iniciar() {
  if (!hayWebGL()) {
    $('sin-webgl').hidden = false;
    return;
  }
  if (SOLO) {
    $('btn-partida').hidden = false;
    $('btn-partida').addEventListener('click', partidaLocal);
    mostrarJuego();
  } else {
    conectar();
  }
  if (params.has('debug')) $('debug').hidden = false;

  $('btn-calidad').addEventListener('click', () => {
    const orden = ['auto', 'alta', 'media', 'baja'];
    calidad.elegir(orden[(orden.indexOf(calidad.preferencia) + 1) % orden.length]);
    $('calidad-texto').textContent = calidad.preferencia;
  });
  $('calidad-texto').textContent = calidad.preferencia;
  $('btn-debug').addEventListener('click', () => ($('debug').hidden = !$('debug').hidden));
  // En el celu se usa apenas se apoya el dedo: el click se pierde si el dedo se mueve un poco
  // o si hay otro dedo en la pantalla (por ejemplo, deslizando de carril). El click queda para el teclado.
  $('poder').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    usarPoder();
  });
  $('poder').addEventListener('click', usarPoder);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' || e.code === 'Enter') usarPoder();
  });
  $('btn-medir').addEventListener('click', empezarMedicion);
  $('btn-corte').addEventListener('click', () => red?.simularCorte(5));
  $('btn-corte-largo').addEventListener('click', () => red?.simularCorte(20));
}

function mostrarJuego() {
  $('ingreso').hidden = true;
  $('juego').hidden = false;
  if (!vista) {
    vista = new Vista($('lienzo'), grupo, calidad);
    escucharControles($('lienzo'), (g) => corredor.gesto(g));
    requestAnimationFrame(bucle);
  } else {
    vista.cambiarGrupo(grupo);
  }
  const c = colorGrupo(grupo);
  $('hud-grupo').textContent = etiquetaGrupo(grupo);
  $('hud-grupo').style.setProperty('--g', c.color);
  $('hud-grupo').style.setProperty('--gt', c.texto);
  corredor.corriendo = true;
  pedirWakeLock();
}

// ---------- Red ----------
function conectar() {
  red = new Red(CODIGO_URL);
  presentacion = new PantallaPresentacion({ red, raiz: $('pres'), hayPartida: () => Boolean(guion), grupo: () => grupo });
  red.addEventListener('room:groups', (e) => dibujarGrilla(e.detail));
  red.addEventListener('sala', (e) => mostrarPasoGrupo(e.detail.codigo));
  red.addEventListener('unido', (e) => {
    grupo = e.detail.grupo;
    $('ingreso-error').hidden = true;
    mostrarJuego();
  });
  red.addEventListener('rechazado', (e) => {
    const { motivo } = e.detail;
    if (motivo === 'room_not_found') {
      // El servidor se reinició o la sala ya no existe: se pide el código de nuevo.
      volverAlIngreso();
      mostrarPasoCodigo('Esa sala ya no existe. Escribí el código que aparece ahora en el proyector.');
      return;
    }
    const textos = { taken: 'Este grupo ya tiene un jugador. Elegí tu número.', invalid_group: 'Elegí tu número de grupo.' };
    $('ingreso-error').textContent = textos[motivo] ?? 'No se pudo entrar. Probá de nuevo.';
    $('ingreso-error').hidden = motivo === 'invalid_group';
    volverAlIngreso();
    if (red.sala) red.entrarSala(red.sala);
    else mostrarPasoCodigo();
  });
  red.addEventListener('liberado', () => {
    reiniciarPartida();
    grupo = null;
    volverAlIngreso();
    $('ingreso-error').textContent = 'El presentador liberó tu grupo. Elegí tu número de nuevo.';
    $('ingreso-error').hidden = false;
    red.entrarSala(red.sala);
  });
  red.addEventListener('game:script', (e) => {
    if (guion?.id !== e.detail.id) {
      // Partida nueva.
      bonusPorPregunta.clear();
      reiniciarEfectos();
      resultadoFinal = null;
      corrimientosVistos = e.detail.shifts?.length ?? 0;
    } else {
      // El mismo guion con una pausa, un salto o el final adelantado por el presentador.
      correrHoras(e.detail.shifts ?? []);
    }
    guion = new Guion(e.detail);
  });
  red.addEventListener('game:reset', (e) => {
    reiniciarPartida();
    if (e.detail?.released) {
      red.olvidarGrupo();
      grupo = null;
      volverAlIngreso();
      red.entrarSala(red.sala);
    }
  });
  red.addEventListener('state:sync', (e) => {
    const s = e.detail;
    // El servidor manda los resultados ya revelados: reemplazan a los que tenía el celular.
    bonusPorPregunta.clear();
    for (const r of s.answers ?? []) bonusPorPregunta.set(r.index, r.bonus);
    distanciaSync = s.runDistance;
    if (s.total) rango = { position: s.position, total: s.total };
    if (s.question) pregunta = s.question;
    if (s.final) resultadoFinal = s.final;
    // Si se recargó la página en plena carrera, se retoma desde la distancia que tenía el servidor.
    if (guion && guionIniciado === s.scriptId && s.runDistance > corredor.distancia + 5) corredor.distancia = s.runDistance;
    sincronizarEfectos(s);
  });
  red.addEventListener('question:start', (e) => (pregunta = e.detail));
  red.addEventListener('question:result', (e) => mostrarResultado(e.detail));
  red.addEventListener('question:closed', (e) => cerrarArco(e.detail));
  red.addEventListener('run:modifiers', (e) => recibirAlgoritmo(e.detail));
  red.addEventListener('run:rank', (e) => {
    rango = e.detail;
    impulso = Boolean(e.detail.catchUp);
  });
  red.addEventListener('game:end', (e) => (resultadoFinal = e.detail));

  $('form-codigo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = $('codigo').value.trim().toUpperCase();
    if (codigo.length !== 4) return mostrarPasoCodigo('El código tiene 4 letras.');
    const r = await red.entrarSala(codigo);
    if (!r.ok) mostrarPasoCodigo(r.reason === 'room_not_found' ? `No hay ninguna sala ${codigo}. Revisá el código en el proyector.` : 'No hay conexión. Probá de nuevo.');
  });
  $('codigo').addEventListener('input', (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')));
  for (const id of ['btn-cambiar-grupo', 'pres-cambiar-grupo']) $(id).addEventListener('click', cambiarGrupo);
  $('btn-cambiar-sala').addEventListener('click', () => {
    red.olvidarGrupo();
    red.sala = null;
    mostrarPasoCodigo();
  });

  // Sin token se elige la sala (salvo que la traiga el QR, que la Red ya abre al conectar).
  if (!red.token) {
    volverAlIngreso();
    if (red.sala) mostrarPasoGrupo(red.sala);
    else mostrarPasoCodigo();
  }
}

/** Antes de que arranque la presentación el grupo se puede soltar para elegir otro número (por si se eligió mal). */
async function cambiarGrupo() {
  if (!puedeCambiarGrupo()) return;
  const r = await red.salirDeGrupo();
  if (!r.ok) {
    cartel(r.reason === 'started' ? 'Ya arrancó: no se puede cambiar de grupo.' : 'No se pudo cambiar de grupo. Probá de nuevo.', 2500);
    return;
  }
  grupo = null;
  $('ingreso-error').hidden = true;
  volverAlIngreso();
  mostrarPasoGrupo(red.sala);
}

/** Hasta el hype de apertura (o, sin presentación, hasta la partida): después el grupo queda fijo. */
function puedeCambiarGrupo() {
  return !SOLO && grupo != null && !guion && presentacion?.hype.fase === 'reposo';
}

function actualizarCambioGrupo() {
  const oculto = !puedeCambiarGrupo();
  for (const id of ['btn-cambiar-grupo', 'pres-cambiar-grupo']) if ($(id).hidden !== oculto) $(id).hidden = oculto;
}

function reiniciarPartida() {
  guion = null;
  guionIniciado = null;
  faseActual = null;
  resultadoFinal = null;
  respuestaPendiente = null;
  pregunta = null;
  practicaHasta = 0;
  arcos = null;
  tiendaZ = null;
  bonusPorPregunta.clear();
  reiniciarEfectos();
  corredor.limitarCarriles(2);
  corredor.corriendo = true;
}

/** Corre las horas propias (ventaja, Cambio de algoritmo) igual que el servidor corrió el guion. */
function correrHoras(lista) {
  for (const { from, delta } of lista.slice(corrimientosVistos)) {
    const mover = (t) => (t > from ? t + delta : t);
    if (ventaja) ventaja.hasta = mover(ventaja.hasta);
    algoritmoHasta = mover(algoritmoHasta);
  }
  corrimientosVistos = lista.length;
}

function reiniciarEfectos() {
  ventaja = null;
  poder = null;
  usoPendiente = null;
  hype = false;
  cincuentaPendiente = false;
  cerrada = null;
  algoritmoHasta = 0;
  extrasHasta = 0;
  impulso = false;
  resultadosVistos.clear();
  Object.assign(corredor, { turbo: false, iman: false, escudos: 0, impulso: false, lenta: 0 });
  corredor.cerrarCarril(null);
}

/**
 * Al reconectar o recargar, el servidor manda el estado de las ventajas y los poderes.
 * Un resultado revelado mientras no había conexión se muestra ahora (solo el último).
 */
function sincronizarEfectos(s) {
  const nuevos = (s.answers ?? []).filter((r) => !resultadosVistos.has(r.index));
  const ultimo = nuevos.reduce((a, r) => (!a || r.index > a.index ? r : a), null);
  for (const r of nuevos) if (r !== ultimo) resultadosVistos.add(r.index);
  if (ultimo) mostrarResultado(ultimo);

  if (s.advantage && s.advantage.until !== ventaja?.hasta) activarVentaja(s.advantage.id, s.advantage.until);
  if (s.power !== usoPendiente) poder = s.power ?? null;
  if (!usoPendiente) {
    hype = Boolean(s.hype);
    cincuentaPendiente = Boolean(s.fiftyFifty);
  }
  if (s.closed) cerrada = s.closed;
  if (s.extraObstacles > algoritmoHasta) algoritmoHasta = s.extraObstacles;
  impulso = Boolean(s.catchUp);
}

function volverAlIngreso() {
  $('ingreso').hidden = false;
  $('juego').hidden = true;
}

function mostrarPasoCodigo(error) {
  $('paso-codigo').hidden = false;
  $('paso-grupo').hidden = true;
  $('codigo-error').textContent = error ?? '';
  $('codigo-error').hidden = !error;
  if (!$('codigo').value && red?.sala) $('codigo').value = red.sala;
}

function mostrarPasoGrupo(codigo) {
  $('paso-codigo').hidden = true;
  $('paso-grupo').hidden = false;
  $('codigo-error').hidden = true;
  $('sala-codigo').textContent = codigo;
}

/** Los grupos de alumnos y, aparte, los lugares de los profes (P1 a P5). */
function dibujarGrilla(lista) {
  const boton = ({ number, taken }) => {
    const b = document.createElement('button');
    const c = colorGrupo(number);
    const nombre = esProfe(number) ? `Profe ${etiquetaGrupo(number)}` : `Grupo ${number}`;
    b.className = taken ? 'np-ficha np-ficha--libre np-ficha--desconectada' : 'np-ficha';
    b.style.setProperty('--g', c.color);
    b.style.setProperty('--gt', c.texto);
    b.textContent = etiquetaGrupo(number);
    b.disabled = taken;
    b.setAttribute('aria-label', taken ? `${nombre} (tomado)` : nombre);
    b.addEventListener('click', () => red.unirse(number));
    return b;
  };
  $('grilla').replaceChildren(...lista.filter((g) => !g.teacher).map(boton));
  $('grilla-profes').replaceChildren(...lista.filter((g) => g.teacher).map(boton));
}

// ---------- Partida simulada (?solo) ----------
function partidaLocal() {
  const inicio = Date.now() + 500;
  const fases = [];
  let t = inicio;
  const agregar = (type, s, extra = {}) => {
    fases.push({ type, startsAt: t, duration: s * 1000, ...extra });
    t += s * 1000;
  };
  agregar(FASES.CUENTA, 4);
  for (let index = 0; index < 3; index++) {
    agregar(FASES.TRAMO, 15, { index, seed: Math.floor(Math.random() * 2 ** 31) });
    agregar(FASES.PREGUNTA, 8, { index, options: 3 });
  }
  agregar(FASES.SPRINT, 10, { index: 3, seed: Math.floor(Math.random() * 2 ** 31) });
  agregar(FASES.FIN, 0);
  guion = new Guion({ id: Math.random(), startsAt: inicio, phases: fases, difficulty: 'facil', questions: 3 });
  resultadoFinal = null;
  bonusPorPregunta.clear();
  reiniciarEfectos();
  aciertosSolo = 0;
  $('btn-partida').hidden = true;
}

// ---------- Guion ----------
function actualizarFase() {
  if (!guion) return;
  const f = guion.faseEn(ahora());
  if (!f) return;
  const misma = f.numero === faseActual?.numero && f.type === faseActual.type;
  if (faseActual && guionIniciado === guion.id && (misma || f.numero < faseActual.numero)) {
    // Misma fase (con las horas al día si el presentador pausó o saltó). Nunca se vuelve atrás:
    // si la pausa llegó tarde por un corte, se sigue en la fase que ya estaba.
    if (misma) faseActual = f;
    return;
  }
  const anterior = faseActual;
  faseActual = f;

  // Primera fase vista de este guion: se arranca de cero (o desde la distancia guardada, si se recargó).
  if (guionIniciado !== guion.id) {
    guionIniciado = guion.id;
    corredor.reiniciar(f.type === FASES.CUENTA ? 0 : distanciaSync);
    pista.vaciar();
    practicaHasta = 0;
    arcos = null;
    tiendaZ = null;
  }
  if (anterior?.type === FASES.PREGUNTA && anterior.numero === f.numero - 1) responder(anterior);
  if (f.type !== FASES.PREGUNTA) {
    corredor.limitarCarriles(2);
    corredor.cerrarCarril(null);
  }
  // El impulso de emparejar se fija al empezar cada fase: así los arcos y la tienda no saltan.
  corredor.impulso = impulso && f.type !== FASES.CUENTA && f.type !== FASES.FIN;

  switch (f.type) {
    case FASES.CUENTA:
      corredor.corriendo = false;
      break;
    case FASES.TRAMO:
    case FASES.SPRINT: {
      corredor.corriendo = true;
      const d = corredor.distancia;
      const largo = VELOCIDAD_BASE * (f.restante / 1000);
      pista.agregarTramo(f.seed, d + 30, d + Math.max(40, largo - 15), guion.datos.difficulty);
      extrasHasta = 0;
      // Ruta VIP Château que ya estaba activa (por ejemplo, si se recargó en pleno tramo).
      if (ventaja?.id === 'vip' && ventaja.hasta > ahora()) pista.aclarar(d + 12);
      if (f.type === FASES.SPRINT) cartel('<span class="cartel__caja">¡Sprint final!</span>', 2000);
      break;
    }
    case FASES.PREGUNTA:
      corredor.corriendo = true;
      pista.hundirDesde(corredor.distancia + 4);
      // Con 2 opciones el tercer carril es una pared: el corredor solo puede elegir A o B.
      corredor.limitarCarriles((f.options ?? 3) - 1);
      respuestaPendiente = { index: f.index, desde: Math.max(ahora(), f.startsAt), carril: corredor.carril };
      if (SOLO) {
        pregunta = { index: f.index, shortOptions: CORTAS_SOLO };
        if (cincuentaPendiente) cerrarArco({ index: f.index, lane: Math.floor(Math.random() * 3) });
      }
      if (cerrada?.index === f.index) corredor.cerrarCarril(cerrada.lane);
      break;
    case FASES.FIN:
      corredor.corriendo = false;
      // Si el presentador terminó la carrera antes, la tienda aparece cerca en vez de quedar a lo lejos.
      if (tiendaZ != null && tiendaZ > corredor.distancia + FRENADA_TIENDA * 2) tiendaZ = corredor.distancia + FRENADA_TIENDA * 2;
      if (SOLO) {
        resultadoFinal = {
          winner: 1,
          queue: [],
          questions: guion.datos.questions,
          stats: [{ group: 1, position: 1, distance: Math.round(distanciaTotal()), correct: aciertosSolo, dodged: corredor.esquivados, likes: corredor.likes }],
        };
        $('btn-partida').hidden = false;
      }
      break;
  }
}

/** Al terminar la pregunta, el corredor "atraviesa el arco" de su carril. */
function responder(fase) {
  const r = respuestaPendiente;
  respuestaPendiente = null;
  if (!r || r.index !== fase.index) return;
  const datos = { index: fase.index, lane: corredor.carril, serverTime: fase.startsAt + fase.duration, since: r.desde };
  cartel('<span class="cartel__caja">✔ Respuesta guardada</span>', 1500);
  if (SOLO) {
    setTimeout(() => mostrarResultado(resultadoSolo(fase, r.desde)), 600);
    return;
  }
  red.encolar(`q${fase.index}:${guion.id}`, 'question:answer', datos);
}

/** Partida simulada (?solo): acierta al azar (más seguido con el 50/50) y reparte ventajas y poderes como el servidor. */
let rachaSolo = 0;
function resultadoSolo(fase, desde) {
  const index = fase.index;
  const correct = Math.random() < (cerrada?.index === index ? 0.8 : 0.6) && corredor.carril !== cerrada?.lane;
  const premio = calcularPremio(fase, desde);
  if (!correct) {
    rachaSolo = 0;
    return { index, correct, bonus: 0, speedBonus: 0, slowStart: DURACION_ARRANQUE_LENTO };
  }
  const r = { index, correct, bonus: premio.total, speedBonus: premio.rapidez, hype: hype || undefined };
  const ids = Object.keys(VENTAJAS);
  r.advantageId = ids[Math.floor(Math.random() * ids.length)];
  const siguiente = guion.fases[guion.fases.findIndex((x) => x.type === FASES.PREGUNTA && x.index === index) + 1];
  r.advantageUntil = siguiente.startsAt + siguiente.duration;
  if (++rachaSolo >= 2) {
    rachaSolo = 0;
    const poderes = Object.keys(PODERES);
    if (!poder) r.powerId = poderes[Math.floor(Math.random() * poderes.length)];
  }
  return r;
}

function mostrarResultado(r) {
  const { index, correct, bonus: b, speedBonus } = r;
  if (resultadosVistos.has(index)) return; // el mismo resultado puede llegar por question:result y por state:sync
  resultadosVistos.add(index);
  bonusPorPregunta.set(index, correct ? b : 0);
  if (SOLO && correct) aciertosSolo++;
  const d = document.createElement('div');
  d.className = `np-destello np-destello--${correct ? 'correcto' : 'error'}`;
  document.body.append(d);
  setTimeout(() => d.remove(), 1200);
  navigator.vibrate?.(correct ? 60 : [40, 60, 40]);

  const lineas = [];
  if (correct) {
    if (r.hype) hype = false;
    const extra = r.hype ? ' <small>· 🔥 x2 por el Hype</small>' : speedBonus ? ` <small>· ⚡ ${speedBonus} por rapidez</small>` : '';
    lineas.push(`✅ +${b} m${extra}`);
    if (r.advantageId) {
      const v = VENTAJAS[r.advantageId];
      activarVentaja(r.advantageId, r.advantageUntil);
      lineas.push(`<small>${v.icono} <b>${v.nombre}</b>: ${v.efecto.toLowerCase()}</small>`);
    }
  } else {
    lineas.push('❌ Incorrecta');
    // Pierde impulso: arranca el tramo un poco más lento (sección 3.5).
    corredor.lenta = r.slowStart ?? DURACION_ARRANQUE_LENTO;
  }
  if (r.powerId && r.powerId !== usoPendiente) {
    poder = r.powerId;
    const p = PODERES[r.powerId];
    lineas.push(`<small>🎁 ¡Racha! Nuevo poder: ${p.icono} <b>${p.nombre}</b></small>`);
    setTimeout(() => navigator.vibrate?.([30, 40, 30, 40, 80]), 400);
  }
  cartel(`<span class="cartel__caja">${lineas.join('<br>')}</span>`, lineas.length > 1 ? 3200 : 2000);
}

/** Ventaja del tramo que empieza: dura hasta `hasta` (hora del servidor). */
function activarVentaja(id, hasta) {
  if (!VENTAJAS[id] || !(hasta > ahora())) return;
  ventaja = { id, hasta };
  corredor.escudos = id === 'escudo' ? 1 : 0;
  // Ruta VIP: se despejan los obstáculos que todavía no se ven de cerca.
  if (id === 'vip') pista.aclarar(corredor.distancia + 12);
}

/** Pase 50/50: se cierra un arco incorrecto (si la pregunta está en curso, enseguida). */
function cerrarArco({ index, lane }) {
  cerrada = { index, lane };
  cincuentaPendiente = false;
  if (faseActual?.type === FASES.PREGUNTA && faseActual.index === index) corredor.cerrarCarril(lane);
  cartel(`<span class="cartel__caja">🎟️ Se cerró el arco ${LETRAS[lane]}</span>`, 1800);
}

/** Otro grupo usó Cambio de algoritmo: más obstáculos durante unos segundos. */
function recibirAlgoritmo({ extraObstacles, by }) {
  if (!(extraObstacles > algoritmoHasta)) return;
  algoritmoHasta = extraObstacles;
  navigator.vibrate?.([80, 50, 80]);
  const quien = by ? (esProfe(by) ? `El profe ${etiquetaGrupo(by)}` : `El grupo ${by}`) : 'Alguien';
  cartel(`<span class="cartel__caja">📉 ¡${quien} cambió el algoritmo!<br><small>Más obstáculos por unos segundos</small></span>`, 2500);
}

/** Usa el poder guardado. Se reintenta hasta el ack: aunque se corte la red, se aplica una sola vez. */
function usarPoder() {
  if (!poder || !enPartida() || guion.pausada) return;
  const id = poder;
  const p = PODERES[id];
  poder = null;
  navigator.vibrate?.(40);
  if (id === 'hype') hype = true;
  if (id === 'cincuenta') cincuentaPendiente = true;
  cartel(`<span class="cartel__caja">${p.icono} ¡${p.nombre}!<br><small>${p.efecto}</small></span>`, 2200);
  if (SOLO) {
    // En la práctica no hay otros grupos: el Cambio de algoritmo se ve en la propia calle.
    if (id === 'algoritmo') recibirAlgoritmo({ extraObstacles: ahora() + 5000, by: null });
    if (id === 'cincuenta' && faseActual?.type === FASES.PREGUNTA) cerrarArco({ index: faseActual.index, lane: Math.floor(Math.random() * 3) });
    return;
  }
  usoPendiente = id;
  const useId = `${guion.id}:${id}:${Math.round(ahora())}`;
  red.encolar(`poder:${useId}`, 'player:use_power', { powerId: id, useId }, (r) => {
    usoPendiente = null;
    if (!r?.ok) {
      if (id === 'hype') hype = false;
      if (id === 'cincuenta') cincuentaPendiente = false;
      return;
    }
    if (r.closed) cerrarArco(r.closed);
    if (id === 'algoritmo' && r.targets?.length) {
      cartel(`<span class="cartel__caja">📉 Más obstáculos para ${r.targets.length === 1 ? 'el grupo' : 'los grupos'} ${r.targets.map(etiquetaGrupo).join(', ')}</span>`, 2500);
    }
  });
}

/** Ventajas, impulso y obstáculos extra: se aplican en cada paso de la simulación. */
function aplicarEfectos() {
  const t = ahora();
  if (ventaja && t >= ventaja.hasta) {
    ventaja = null;
    corredor.escudos = 0;
  }
  const corriendo = enPartida() && (faseActual.type === FASES.TRAMO || faseActual.type === FASES.SPRINT || faseActual.type === FASES.PREGUNTA);
  corredor.turbo = corriendo && ventaja?.id === 'turbo';
  corredor.iman = corriendo && ventaja?.id === 'iman';

  // Cambio de algoritmo: obstáculos extra para los próximos segundos, nunca en las preguntas ni sobre la meta.
  if (algoritmoHasta > t && (faseActual?.type === FASES.TRAMO || faseActual?.type === FASES.SPRINT) && enPartida()) {
    const d = corredor.distancia;
    const finFase = d + recorrido(Math.max(0, faseActual.startsAt + faseActual.duration - t) / 1000) - 12;
    const hasta = Math.min(finFase, d + 22 + corredor.velocidad * ((algoritmoHasta - t) / 1000));
    const desde = Math.max(extrasHasta, d + 22);
    if (hasta > desde + 6) {
      pista.agregarExtra(Math.floor(algoritmoHasta + desde), desde, hasta);
      extrasHasta = hasta;
    }
  }
}

/**
 * Cuánto vale acertar si el grupo se queda en el carril que eligió en `desde`
 * (misma cuenta que el servidor): base fija + extra que baja cuanto más tarde se eligió.
 */
function calcularPremio(fase, desde) {
  const { base, speedMax } = guion?.datos.bonus ?? { base: 150, speedMax: 100 };
  const t = Math.min(Math.max(desde, fase.startsAt), fase.startsAt + fase.duration);
  const rapidez = Math.round(speedMax * (1 - (t - fase.startsAt) / fase.duration));
  const x = hype ? 2 : 1;
  return { total: (base + rapidez) * x, rapidez, maximo: (base + speedMax) * x };
}

function cartel(html, ms) {
  $('cartel').innerHTML = html;
  cartelHasta = performance.now() + ms;
}

// ---------- Práctica (lobby o sin partida) ----------
function practicar() {
  // Mientras no hay partida, la calle se llena sola con tramos al azar para practicar.
  if (corredor.distancia + 120 > practicaHasta) {
    const desde = Math.max(practicaHasta, corredor.distancia + 30);
    practicaHasta = desde + 150;
    pista.agregarTramo(Math.floor(Math.random() * 2 ** 31), desde, practicaHasta, 'facil');
  }
}

// ---------- Bucle ----------
let tAnterior = performance.now();
let ultimoCuadro = 0;
let acumulado = 0;
let tiempo = 0;
let ultimoProgreso = 0;
let ultimoHud = 0;
const estado = { distancia: 0, x: 0, y: 0 };

function enPartida() {
  return guion && faseActual && guionIniciado === guion.id && faseActual.type !== FASES.FIN;
}

function bucle(t) {
  requestAnimationFrame(bucle);
  actualizarCambioGrupo();
  // Durante la presentación el celular muestra la espera, el hype o la votación: el runner no se simula ni se dibuja.
  if (presentacion?.visible) {
    tAnterior = t;
    return;
  }
  // Calidad baja: como máximo 30 cuadros por segundo (la simulación no cambia: va a paso fijo).
  const { fpsMax } = calidad.config;
  if (fpsMax && t - ultimoCuadro < 1000 / fpsMax - 2) return;
  ultimoCuadro = t;
  // Si la pestaña estuvo oculta, no se intenta recuperar todo el tiempo perdido de golpe.
  const dt = Math.min(0.1, (t - tAnterior) / 1000);
  tAnterior = t;
  tiempo += dt;

  // En pausa no avanza nada: el corredor queda quieto donde estaba (los gestos no se guardan).
  const pausada = Boolean(guion?.pausada && enPartida());
  corredor.pausado = pausada;
  if (pausada) {
    acumulado = 0;
    corredor.pendiente = null;
  } else acumulado += dt;
  let pasos = 0;
  while (acumulado >= PASO && pasos < 8) {
    actualizarFase();
    if (!enPartida() && !(guion && faseActual?.type === FASES.FIN)) practicar();
    aplicarEfectos();
    if (respuestaPendiente && corredor.carril !== respuestaPendiente.carril) {
      respuestaPendiente.carril = corredor.carril;
      respuestaPendiente.desde = ahora();
      red?.carril(respuestaPendiente.index, corredor.carril);
    }
    corredor.paso(PASO, pista);
    pista.limpiar(corredor.distancia, PASO);
    acumulado -= PASO;
    pasos++;
  }
  if (pasos === 8) acumulado = 0;

  // Interpolación entre el paso anterior y el actual, para que el movimiento sea suave a cualquier FPS.
  const a = acumulado / PASO;
  const ant = corredor.anterior;
  estado.distancia = ant.distancia + (corredor.distancia - ant.distancia) * a;
  estado.x = ant.x + (corredor.x - ant.x) * a;
  estado.y = ant.y + (corredor.y - ant.y) * a;

  ubicarDecorados(estado.distancia, dt);
  vista.dibujar(estado, corredor, pista, dt, tiempo);
  for (const e of corredor.eventos) {
    if (e === 'choque') navigator.vibrate?.(35);
    if (e === 'escudo') navigator.vibrate?.([15, 30, 15]);
  }
  corredor.eventos.length = 0;
  calidad.registrar(dt);
  if (medicion) registrarMedicion(dt);

  if (red && enPartida() && t - ultimoProgreso > INTERVALO_PROGRESO) {
    ultimoProgreso = t;
    red.progreso({
      runDistance: Math.round(corredor.distancia * 10) / 10,
      speed: Math.round(corredor.velocidad * 10) / 10,
      hits: corredor.choques,
      jumps: corredor.saltos,
      likes: corredor.likes,
      dodged: corredor.esquivados,
    });
  }
  if (t - ultimoHud > 100) {
    ultimoHud = t;
    actualizarHud();
  }
}

// ---------- Arcos y tienda ----------
/** Metros que va a correr el corredor en los próximos `s` segundos si no choca. */
function recorrido(s) {
  return (recorridoIdeal(corredor.tiempoCarrera + s) - recorridoIdeal(corredor.tiempoCarrera)) * corredor.multiplicador;
}

/**
 * Los arcos de la pregunta y la tienda se acercan de forma que el corredor los cruza
 * justo cuando termina la fase (la respuesta la decide el guion, no el choque con el arco).
 * Al terminar la fase quedan fijos donde se cruzaron.
 */
function ubicarDecorados(distancia, dt) {
  const f = guion && guionIniciado === guion.id ? faseActual : null;
  const restante = f ? Math.max(0, f.startsAt + f.duration - ahora()) / 1000 : 0;
  // Si cambia la velocidad (turbo, impulso), arcos y tienda se reacomodan de a poco, sin saltos.
  const suave = (actual, objetivo) => (actual == null ? objetivo : actual + (objetivo - actual) * Math.min(1, dt * 3));

  if (f?.type === FASES.PREGUNTA) {
    const nuevo = arcos?.index !== f.index;
    arcos ??= {}; // se reutiliza el mismo objeto en cada cuadro
    arcos.index = f.index;
    arcos.opciones = f.options ?? 3;
    arcos.z = suave(nuevo ? null : arcos.z, distancia + recorrido(restante));
  } else if (arcos && (!f || distancia > arcos.z + 15)) arcos = null;
  if (arcos) {
    const cortas = pregunta?.index === arcos.index ? pregunta.shortOptions : null;
    const respondiendo = f?.type === FASES.PREGUNTA;
    const cerradaAca = cerrada?.index === arcos.index ? cerrada.lane : null;
    carteles.forEach((c, i) => {
      c.cerrado = i >= arcos.opciones || i === cerradaAca;
      c.texto = cortas?.[i] ?? '';
      c.activo = respondiendo && !c.cerrado && i === corredor.carril;
    });
  }
  vista.ubicarArcos(arcos?.z ?? null, carteles);

  if (f?.type === FASES.SPRINT) tiendaZ = suave(tiendaZ, distancia + recorrido(restante) + FRENADA_TIENDA);
  else if (f?.type === FASES.FIN) tiendaZ ??= distancia + FRENADA_TIENDA; // si recargó ya en la llegada
  else tiendaZ = null;
  vista.ubicarTienda(tiendaZ);
}

// ---------- HUD ----------
function actualizarHud() {
  // Al llegar, el corredor frena unos metros que el servidor ya no cuenta: se muestra la distancia oficial.
  const oficial = resultadoFinal?.stats?.find((x) => x.group === grupo)?.distance;
  const total = oficial ?? distanciaTotal();
  $('hud-distancia').textContent = `${Math.round(total)} m`;
  $('hud-likes').textContent = `❤ ${corredor.likes}`;
  $('hud-puesto').textContent = rango && enPartida() ? `${rango.position}.º` : '–';
  $('hud-total').textContent = rango && enPartida() ? ` de ${rango.total}` : '';

  const t = ahora();
  const f = faseActual && guion && guionIniciado === guion.id ? faseActual : null;
  const restante = f ? Math.max(0, f.startsAt + f.duration - t) : 0;

  $('temporizador').hidden = f?.type !== FASES.PREGUNTA;
  const premio = f?.type === FASES.PREGUNTA && respuestaPendiente?.index === f.index ? calcularPremio(f, respuestaPendiente.desde) : null;
  $('premio').hidden = !premio;
  if (premio) {
    $('premio').innerHTML = `${hype ? '🔥' : '⚡'} Si es la correcta: <b>+${premio.total} m</b>${hype ? ' <small>x2</small>' : ''}`;
    $('premio').classList.toggle('juego__premio--baja', premio.total < premio.maximo);
  }
  $('carriles').hidden = f?.type !== FASES.PREGUNTA;
  if (f?.type === FASES.PREGUNTA) {
    $('temporizador').style.setProperty('--progreso', `${(restante / f.duration) * 100}%`);
    $('temporizador').classList.toggle('np-temporizador--urgente', restante < 4000);
    const cortas = pregunta?.index === f.index ? pregunta.shortOptions : [];
    [...$('carriles').children].forEach((s, i) => {
      const abierta = i < (f.options ?? 3) && !(cerrada?.index === f.index && cerrada.lane === i);
      const texto = abierta ? `${LETRAS[i]}${cortas?.[i] ? `<small>${escapar(cortas[i])}</small>` : ''}` : '✕';
      if (s.dataset.texto !== texto) {
        s.innerHTML = texto;
        s.dataset.texto = texto;
      }
      s.classList.toggle('activo', abierta && i === corredor.carril);
      s.classList.toggle('pared', !abierta);
    });
  }
  actualizarFinal(f);
  actualizarEfectos(f, t);

  if (guion?.pausada && enPartida()) {
    $('cartel').innerHTML = '<span class="cartel__caja">⏸ Pausa<br><small>Mirá el proyector</small></span>';
  } else if (performance.now() < cartelHasta) {
    // Un cartel temporal (respuesta guardada, resultado) tiene prioridad.
  } else if (guion && !f && t < guion.datos.startsAt) {
    $('cartel').innerHTML = '<span class="cartel__caja">¡Prepárense!</span>';
  } else if (f?.type === FASES.CUENTA) {
    const s = Math.ceil(restante / 1000);
    $('cartel').innerHTML = `<span class="cartel__grande">${s > 0 && s <= 3 ? s : s > 3 ? '' : '¡DROP!'}</span>`;
  } else if (f?.type === FASES.PREGUNTA) {
    $('cartel').innerHTML = '<span class="cartel__caja">¡Mirá el proyector! 👀</span>';
  } else if (f?.type === FASES.FIN) {
    $('cartel').innerHTML = !resultadoFinal
      ? '<span class="cartel__caja">¡Llegaste a la tienda!</span>'
      : resultadoFinal.winner === grupo
        ? '<span class="np-cartel">¡La sudadera es tuya!</span>'
        : esProfe(grupo)
          ? '<span class="cartel__caja">Fuera de concurso 🎓<br><small>La sudadera es para los alumnos</small></span>'
          : '<span class="np-sello">Sold out</span>';
  } else if (!guion) {
    $('cartel').innerHTML = SOLO ? '' : '<span class="cartel__caja">Esperando que empiece el drop…</span>';
  } else {
    $('cartel').innerHTML = '';
  }

  // Ícono de red solo si el corte dura más de ~5 s; el juego nunca se bloquea.
  $('sin-red').hidden = !red || red.segundosSinRed < 5;

  if (!$('debug').hidden) $('debug-datos').textContent = textoDebug();
}

/** Chips de ventaja, impulso y efectos, y el botón del poder guardado. */
function actualizarEfectos(f, t) {
  const enCarrera = enPartida() && f?.type !== FASES.CUENTA;
  const chips = [];
  if (enCarrera && ventaja) {
    const v = VENTAJAS[ventaja.id];
    const extra = ventaja.id === 'escudo' && !corredor.escudos ? ' (usado)' : '';
    chips.push(`${v.icono} ${v.nombre}${extra} · ${Math.ceil((ventaja.hasta - t) / 1000)} s`);
  }
  if (enCarrera && corredor.impulso) chips.push('💨 Impulso +10 %');
  if (enCarrera && corredor.lenta > 0) chips.push('🐢 Arranque lento');
  if (enCarrera && algoritmoHasta > t) chips.push(`📉 Más obstáculos · ${Math.ceil((algoritmoHasta - t) / 1000)} s`);
  if (enCarrera && hype) chips.push('🔥 Hype: la próxima vale x2');
  if (enCarrera && cincuentaPendiente) chips.push('🎟️ 50/50 en la próxima');
  const html = chips.map((c) => `<span class="np-insignia">${c}</span>`).join('');
  if ($('efectos').dataset.html !== html) {
    $('efectos').innerHTML = html;
    $('efectos').dataset.html = html;
  }

  const mostrar = Boolean(poder) && enCarrera && f?.type !== FASES.FIN && !guion.pausada;
  $('poder').hidden = !mostrar;
  if (mostrar && $('poder').dataset.id !== poder) {
    const p = PODERES[poder];
    $('poder').dataset.id = poder;
    $('poder-icono').textContent = p.icono;
    $('poder-nombre').textContent = p.nombre;
    $('poder-efecto').textContent = p.efecto;
  }
}

function actualizarFinal(f) {
  const propio = f?.type === FASES.FIN && resultadoFinal?.stats?.find((s) => s.group === grupo);
  $('final').hidden = !propio;
  if (!propio) return;
  // Un profe no tiene puesto: corrió fuera de concurso.
  $('final-puesto').textContent = propio.teacher ? etiquetaGrupo(grupo) : `${propio.position}.º`;
  $('final-total').textContent = propio.teacher ? 'fuera de concurso' : `de ${resultadoFinal.stats.filter((s) => !s.teacher).length}`;
  $('final-aciertos').textContent = `${propio.correct}/${resultadoFinal.questions ?? '–'}`;
  $('final-distancia').textContent = `${propio.distance} m`;
  $('final-esquivados').textContent = propio.dodged ?? corredor.esquivados;
  $('final-likes').textContent = propio.likes;
}

function escapar(v) {
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// ---------- Panel de pruebas ----------
function textoDebug() {
  const i = vista.info();
  const lineas = [
    `FPS ${calidad.fps.toFixed(1)}  nivel ${i.nivel} (${calidad.preferencia})  dpr ${i.dpr.toFixed(2)}  ${i.resolucion}`,
    `draw calls ${i.llamadas}  triángulos ${i.triangulos}`,
    `obstáculos ${pista.obstaculos.length}  likes ${pista.likes.length}  choques ${corredor.choques}  esquivados ${corredor.esquivados}`,
    `GPU ${vista.gpu()}`,
  ];
  if (red) {
    lineas.push(
      `red ${red.conectado ? `🟢 ${red.socket.io.engine?.transport?.name}` : '🔴 sin conexión'}  rtt ${red.reloj.rtt?.toFixed(0) ?? '–'} ms  desfase ${red.reloj.desfase.toFixed(0)} ms`,
      `cortes ${red.cortes}  sesiones recuperadas ${red.recuperadas}  cola ${red.cola.size}  sin red ${red.segundosSinRed.toFixed(1)} s`,
    );
  }
  if (faseActual && guion) lineas.push(`fase ${faseActual.type} #${faseActual.index ?? ''}  quedan ${(Math.max(0, faseActual.startsAt + faseActual.duration - ahora()) / 1000).toFixed(1)} s`);
  return lineas.join('\n');
}

function empezarMedicion() {
  medicion = { inicio: performance.now(), duraciones: [] };
  $('debug-medicion').textContent = 'Midiendo 20 s… seguí jugando normalmente.';
}

function registrarMedicion(dt) {
  medicion.duraciones.push(dt * 1000);
  if (performance.now() - medicion.inicio < 20_000) return;
  const resumen = resumirCuadros(medicion.duraciones.slice(30)); // se descarta el arranque
  medicion = null;
  const i = vista.info();
  const informe = {
    ...resumen,
    nivel: i.nivel,
    dpr: i.dpr,
    resolucion: i.resolucion,
    llamadas: i.llamadas,
    triangulos: i.triangulos,
    gpu: vista.gpu(),
    agente: navigator.userAgent,
    memoriaGb: navigator.deviceMemory ?? null,
    nucleos: navigator.hardwareConcurrency ?? null,
  };
  $('debug-medicion').textContent = JSON.stringify(informe, null, 1);
  red?.socket.emit('debug:report', informe);
}

// ---------- Pantalla siempre encendida ----------
let wakeLock = null;
async function pedirWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    /* sin permiso o no soportado */
  }
}
document.addEventListener('visibilitychange', () => {
  // El sistema suelta el bloqueo al ocultar la pestaña: se vuelve a pedir al volver.
  if (document.visibilityState === 'visible' && vista && (!wakeLock || wakeLock.released)) pedirWakeLock();
});

// ---------- Service Worker ----------
// Solo en producción (npm run build): guarda el juego para que recargar no vuelva a descargarlo.
// En `npm run dev` no se registra, así Vite recarga los cambios sin caché de por medio.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

iniciar();
