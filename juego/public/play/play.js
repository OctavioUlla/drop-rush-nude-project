import { grupos as coloresGrupos } from '../../../design-system/tokens.js';
import { FASES, PASOS_POR_SEGUNDO, VELOCIDAD_BASE, INTERVALO_PROGRESO } from '../shared/constantes.js';
import { Guion } from '../shared/guion.js';
import { Corredor } from './runner.js';
import { Pista } from './track.js';
import { escucharControles } from './input.js';
import { Red } from './net.js';
import { Vista } from './render/vista.js';
import { Calidad, resumirCuadros } from './render/quality.js';

// Controlador del celular (Fase 0: prototipo técnico).
// ?solo        → sin servidor: práctica y partida simulada en el propio celular.
// ?calidad=baja|media|alta → fija la calidad (para comparar mediciones).
// ?debug       → abre el panel de pruebas al cargar.

const PASO = 1 / PASOS_POR_SEGUNDO;
const LETRAS = ['A', 'B', 'C'];
const params = new URLSearchParams(location.search);
const SOLO = params.has('solo');

const $ = (id) => document.getElementById(id);

// ---------- Estado ----------
const corredor = new Corredor();
const pista = new Pista();
const calidad = new Calidad({ forzada: params.get('calidad'), alCambiarNivel: () => vista?.aplicarNivel() });
let vista = null;
let red = null;
let grupo = SOLO ? 1 : null;
let guion = null;
let guionIniciado = null; // id del guion con el que se reinició el corredor
let faseActual = null;
let respuestaPendiente = null; // { index, desde } durante una pregunta
let bonus = 0;
let rango = null;
let resultadoFinal = null;
let cartelHasta = 0;
let practicaHasta = 0;
let medicion = null;
let distanciaSync = 0;

const ahora = () => (red ? red.ahora() : Date.now());

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
  const c = coloresGrupos[grupo - 1];
  $('hud-grupo').textContent = grupo;
  $('hud-grupo').style.setProperty('--g', c.color);
  $('hud-grupo').style.setProperty('--gt', c.texto);
  corredor.corriendo = true;
  pedirWakeLock();
}

// ---------- Red ----------
function conectar() {
  red = new Red();
  red.addEventListener('room:groups', (e) => dibujarGrilla(e.detail));
  red.addEventListener('unido', (e) => {
    grupo = e.detail.grupo;
    mostrarJuego();
  });
  red.addEventListener('rechazado', (e) => {
    const textos = { taken: 'Este grupo ya tiene un jugador. Elegí tu número.', invalid_group: 'Elegí tu número de grupo.' };
    $('ingreso-error').textContent = textos[e.detail.motivo] ?? 'No se pudo entrar. Probá de nuevo.';
    $('ingreso-error').hidden = e.detail.motivo === 'invalid_group';
    $('ingreso').hidden = false;
    $('juego').hidden = true;
  });
  red.addEventListener('game:script', (e) => {
    guion = new Guion(e.detail);
    resultadoFinal = null;
  });
  red.addEventListener('game:reset', (e) => {
    guion = null;
    guionIniciado = null;
    faseActual = null;
    resultadoFinal = null;
    respuestaPendiente = null;
    practicaHasta = 0;
    corredor.corriendo = true;
    if (e.detail?.released) {
      red.olvidarGrupo();
      grupo = null;
      $('juego').hidden = true;
      $('ingreso').hidden = false;
    }
  });
  red.addEventListener('state:sync', (e) => {
    const s = e.detail;
    bonus = s.bonusDistance;
    distanciaSync = s.runDistance;
    if (s.total) rango = { position: s.position, total: s.total };
    // Si se recargó la página en plena carrera, se retoma desde la distancia que tenía el servidor.
    if (guion && guionIniciado === s.scriptId && s.runDistance > corredor.distancia + 5) corredor.distancia = s.runDistance;
  });
  red.addEventListener('question:result', (e) => mostrarResultado(e.detail));
  red.addEventListener('run:rank', (e) => (rango = e.detail));
  red.addEventListener('game:end', (e) => (resultadoFinal = e.detail));
  if (!red.token) $('ingreso').hidden = false;
}

function dibujarGrilla(lista) {
  const grilla = $('grilla');
  grilla.replaceChildren(
    ...lista.map(({ number, taken }) => {
      const b = document.createElement('button');
      const c = coloresGrupos[number - 1];
      b.className = taken ? 'np-ficha np-ficha--libre np-ficha--desconectada' : 'np-ficha';
      b.style.setProperty('--g', c.color);
      b.style.setProperty('--gt', c.texto);
      b.textContent = number;
      b.disabled = taken;
      b.setAttribute('aria-label', taken ? `Grupo ${number} (tomado)` : `Grupo ${number}`);
      b.addEventListener('click', () => red.unirse(number));
      return b;
    }),
  );
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
  bonus = 0;
  $('btn-partida').hidden = true;
}

// ---------- Guion ----------
function actualizarFase() {
  if (!guion) return;
  const f = guion.faseEn(ahora());
  if (!f || f.numero === faseActual?.numero) return;
  const anterior = faseActual;
  faseActual = f;

  // Primera fase vista de este guion: se arranca de cero (o desde la distancia guardada, si se recargó).
  if (guionIniciado !== guion.id) {
    guionIniciado = guion.id;
    corredor.reiniciar(f.type === FASES.CUENTA ? 0 : distanciaSync);
    pista.vaciar();
    practicaHasta = 0;
    bonus = 0;
  }
  if (anterior?.type === FASES.PREGUNTA && anterior.numero === f.numero - 1) responder(anterior);

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
      if (f.type === FASES.SPRINT) cartel('<span class="cartel__caja">¡Sprint final!</span>', 2000);
      break;
    }
    case FASES.PREGUNTA:
      corredor.corriendo = true;
      pista.hundirDesde(corredor.distancia + 4);
      respuestaPendiente = { index: f.index, desde: Math.max(ahora(), f.startsAt), carril: corredor.carril };
      break;
    case FASES.FIN:
      corredor.corriendo = false;
      if (SOLO) {
        resultadoFinal = { winner: 1, queue: [] };
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
    setTimeout(() => mostrarResultado({ index: fase.index, correct: Math.random() < 0.6, bonus: 180 }), 600);
    return;
  }
  red.encolar(`q${fase.index}:${guion.id}`, 'question:answer', datos);
}

function mostrarResultado({ correct, bonus: b }) {
  if (SOLO && correct) bonus += b;
  const d = document.createElement('div');
  d.className = `np-destello np-destello--${correct ? 'correcto' : 'error'}`;
  document.body.append(d);
  setTimeout(() => d.remove(), 1200);
  navigator.vibrate?.(correct ? 60 : [40, 60, 40]);
  cartel(correct ? `<span class="cartel__caja">✅ +${b} m</span>` : '<span class="cartel__caja">❌ Incorrecta</span>', 1500);
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
  // Si la pestaña estuvo oculta, no se intenta recuperar todo el tiempo perdido de golpe.
  const dt = Math.min(0.1, (t - tAnterior) / 1000);
  tAnterior = t;
  tiempo += dt;

  acumulado += dt;
  let pasos = 0;
  while (acumulado >= PASO && pasos < 8) {
    actualizarFase();
    if (!enPartida() && !(guion && faseActual?.type === FASES.FIN)) practicar();
    if (respuestaPendiente && corredor.carril !== respuestaPendiente.carril) {
      respuestaPendiente.carril = corredor.carril;
      respuestaPendiente.desde = ahora();
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

  vista.dibujar(estado, corredor, pista, dt, tiempo);
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
    });
  }
  if (t - ultimoHud > 100) {
    ultimoHud = t;
    actualizarHud();
  }
}

// ---------- HUD ----------
function actualizarHud() {
  const total = corredor.distancia + bonus;
  $('hud-distancia').textContent = `${Math.round(total)} m`;
  $('hud-likes').textContent = `❤ ${corredor.likes}`;
  $('hud-puesto').textContent = rango && enPartida() ? `${rango.position}.º` : '–';
  $('hud-total').textContent = rango && enPartida() ? ` de ${rango.total}` : '';

  const t = ahora();
  const f = faseActual && guion && guionIniciado === guion.id ? faseActual : null;
  const restante = f ? Math.max(0, f.startsAt + f.duration - t) : 0;

  $('temporizador').hidden = f?.type !== FASES.PREGUNTA;
  $('carriles').hidden = f?.type !== FASES.PREGUNTA;
  if (f?.type === FASES.PREGUNTA) {
    $('temporizador').style.setProperty('--progreso', `${(restante / f.duration) * 100}%`);
    $('temporizador').classList.toggle('np-temporizador--urgente', restante < 4000);
    [...$('carriles').children].forEach((s, i) => {
      s.textContent = i < (f.options ?? 3) ? LETRAS[i] : '';
      s.classList.toggle('activo', i === corredor.carril);
    });
  }

  if (performance.now() < cartelHasta) {
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

iniciar();
