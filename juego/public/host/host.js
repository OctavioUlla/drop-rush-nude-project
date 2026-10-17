import { io } from 'socket.io-client';
import { grupos as coloresGrupos } from '../../../design-system/tokens.js';
import { Reloj } from '../shared/reloj.js';
import { Guion } from '../shared/guion.js';
import { FASES } from '../shared/constantes.js';

// Pantalla del proyector: lobby con código y QR, pregunta con revelado, ranking en vivo
// de hasta 40 grupos, ganador, repaso de errores y debate (secciones 2 y 4.1).
// ?debug abre el panel técnico (carga del servidor y FPS de los celulares).

const $ = (id) => document.getElementById(id);
const LETRAS = ['A', 'B', 'C'];
const EN_TOP = 10;
const CLAVE_SESION = 'dropRush.host';
const NOMBRES_FASE = {
  [FASES.CUENTA]: 'Cuenta regresiva',
  [FASES.TRAMO]: 'Tramo',
  [FASES.PREGUNTA]: 'Pregunta',
  [FASES.SPRINT]: '¡Sprint final!',
  [FASES.FIN]: 'Llegada',
};

const socket = io({ transports: ['websocket', 'polling'], tryAllTransports: true });
const reloj = new Reloj(socket);

let sala = null; // { code, hostKey, maxGroups, settings }
let grupos = [];
let guion = null;
let pregunta = null;
let revelado = null; // resumen del revelado + `hasta` (performance.now) mientras se muestra
let posicionados = null;
let posiciones = [];
let final = null;
let repaso = [];
let vista = 'auto'; // 'auto' (según el guion) | 'repaso' | 'debate'
let repasoIndice = 0;

// ---------- Sesión del proyector ----------
function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) ?? {};
  } catch {
    return {};
  }
}
function guardarSesion(datos) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
  } catch {
    /* modo privado: al recargar se crea otra sala */
  }
}

/** Vuelve a la sala guardada (si se recargó el proyector) o crea una nueva. */
async function abrirSala(nueva = false) {
  const guardada = leerSesion();
  let r = null;
  if (!nueva && guardada.code) r = await socket.emitWithAck('host:hello', guardada).catch(() => null);
  if (!r?.ok) {
    limpiarPartida();
    r = await socket.emitWithAck('host:create_room', {});
  }
  sala = r;
  guardarSesion({ code: r.code, hostKey: r.hostKey });
  aplicarAjustes(r.settings);
  $('codigo').textContent = r.code;
  $('barra-sala').textContent = `Sala ${r.code}`;
  $('barra-sala').hidden = false;
  const origen = await origenParaCelulares();
  $('url').textContent = `${origen.replace(/^https?:\/\//, '')}/play`;
  $('qr').src = `/api/qr.svg?texto=${encodeURIComponent(`${origen}/play/?sala=${r.code}`)}`;
}

/** Si el proyector abrió localhost, los celulares necesitan la IP de la notebook en la red. */
async function origenParaCelulares() {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return location.origin;
  const { ips = [] } = await fetch('/api/red').then((r) => r.json()).catch(() => ({}));
  return ips[0] ? `${location.protocol}//${ips[0]}${location.port ? `:${location.port}` : ''}` : location.origin;
}

function aplicarAjustes(a) {
  if (!a) return;
  $('cfg-preguntas').value = a.cantidadPreguntas;
  $('cfg-preguntas').max = a.maxPreguntas;
  $('cfg-tramo').value = a.duracionTramo;
  $('cfg-pregunta').value = a.tiempoPorDefecto;
  $('cfg-repaso').value = a.preguntasEnRepaso;
  $('cfg-dificultad').value = a.dificultadObstaculos;
}

function limpiarPartida() {
  guion = null;
  pregunta = null;
  revelado = null;
  posicionados = null;
  posiciones = [];
  final = null;
  repaso = [];
  vista = 'auto';
  dibujarPosiciones();
}

// ---------- Red ----------
socket.on('connect', async () => {
  await abrirSala();
  await reloj.sincronizar();
});
socket.on('disconnect', () => ($('red').textContent = '🔴 sin conexión'));
socket.on('room:groups', (lista) => {
  grupos = lista;
  dibujarGrupos();
});
socket.on('host:state', (e) => {
  if (!e) return limpiarPartida();
  guion = new Guion(e.script);
  pregunta = e.question ?? pregunta;
  posicionados = e.positioned;
  final = e.final;
  if (e.reveal) revelado = { ...e.reveal, hasta: performance.now() + e.reveal.at + guion.datos.revealDuration - Date.now() };
});
socket.on('game:script', (datos) => {
  limpiarPartida();
  guion = new Guion(datos);
});
socket.on('game:reset', limpiarPartida);
socket.on('question:start', (p) => {
  pregunta = p;
  posicionados = { index: p.index, count: 0, total: grupos.filter((g) => g.taken).length };
});
socket.on('question:positioned', (p) => (posicionados = p));
socket.on('question:reveal', (r) => {
  // Una respuesta que llegó tarde (por un corte) solo actualiza el número de aciertos.
  if (r.late && revelado?.index === r.index) Object.assign(revelado, r, { hasta: revelado.hasta });
  else if (!r.late) revelado = { ...r, hasta: performance.now() + (guion?.datos.revealDuration ?? 3000) };
});
socket.on('run:positions', (p) => {
  posiciones = ordenEstable(p);
  dibujarPosiciones();
});
socket.on('game:end', (f) => (final = f));
socket.on('server:stats', (s) => {
  const ocupados = grupos.filter((g) => g.taken).length;
  $('red').textContent = `${s.connected}/${ocupados} ${s.connected < ocupados ? '🟠' : '🟢'}`;
  $('stats').textContent = [
    `sala ${sala?.code ?? '–'}   salas ${s.rooms}   sockets ${s.sockets}`,
    `grupos ${s.groups}   conectados ${s.connected}`,
    `mensajes/s  entrada ${s.inPerSecond}   salida ${s.outPerSecond}`,
    `event loop ${s.eventLoopLagMs} ms   memoria ${s.memoryMb} MB`,
    `rtt del proyector ${reloj.rtt?.toFixed(0) ?? '–'} ms`,
  ].join('\n');
});
socket.on('debug:reports', dibujarInformes);
setInterval(() => reloj.sincronizar(3), 15_000);

// ---------- Controles ----------
$('btn-empezar').addEventListener('click', () =>
  socket.emit('host:start', {
    cantidadPreguntas: Number($('cfg-preguntas').value),
    duracionTramo: Number($('cfg-tramo').value),
    tiempoPorDefecto: Number($('cfg-pregunta').value),
    preguntasEnRepaso: Number($('cfg-repaso').value),
    dificultadObstaculos: $('cfg-dificultad').value,
  }),
);
$('btn-terminar').addEventListener('click', () => {
  if (confirm('¿Terminar la partida y volver al lobby?')) socket.emit('host:end');
});
$('btn-liberar').addEventListener('click', () => {
  if (confirm('¿Liberar todos los grupos? Cada celular va a tener que elegir su número de nuevo.')) socket.emit('host:release_all');
});
$('btn-nueva-sala').addEventListener('click', () => {
  if (confirm('¿Crear una sala nueva? Los celulares van a tener que escanear el QR nuevo.')) abrirSala(true);
});
$('btn-debug').addEventListener('click', () => ($('debug').hidden = !$('debug').hidden));
if (new URLSearchParams(location.search).has('debug')) $('debug').hidden = false;

// Liberar un grupo (por ejemplo, si su celular se quedó sin batería): en el lobby o en el ranking.
function pedirLiberar(numero) {
  if (confirm(`¿Liberar el grupo ${numero}? Otro celular del grupo lo va a poder retomar${guion ? ' conservando su distancia' : ''}.`)) {
    socket.emit('host:release_group', { groupId: numero });
  }
}
for (const id of ['grilla', 'top', 'resto']) {
  $(id).addEventListener('click', (e) => {
    const f = e.target.closest('[data-tomado]');
    if (f) pedirLiberar(Number(f.dataset.grupo));
  });
}

$('btn-repaso').addEventListener('click', async () => {
  repaso = (await socket.timeout(5000).emitWithAck('host:review', {}).catch(() => [])) ?? [];
  repasoIndice = 0;
  vista = repaso.length ? 'repaso' : 'debate';
  dibujarRepaso();
});
$('btn-repaso-anterior').addEventListener('click', () => moverRepaso(-1));
$('btn-repaso-siguiente').addEventListener('click', () => moverRepaso(1));
$('btn-debate-volver').addEventListener('click', () => {
  if (!repaso.length) return (vista = 'auto');
  vista = 'repaso';
  repasoIndice = repaso.length - 1;
  dibujarRepaso();
});
$('btn-lobby').addEventListener('click', () => socket.emit('host:end'));

// El presentador puede avanzar el repaso con el control remoto o las flechas.
document.addEventListener('keydown', (e) => {
  if (vista !== 'repaso' && vista !== 'debate') return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault();
    if (vista === 'repaso') moverRepaso(1);
  } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    if (vista === 'repaso') moverRepaso(-1);
    else $('btn-debate-volver').click();
  }
});

function moverRepaso(paso) {
  const nuevo = repasoIndice + paso;
  if (nuevo < 0) vista = 'auto';
  else if (nuevo >= repaso.length) vista = 'debate';
  else {
    repasoIndice = nuevo;
    dibujarRepaso();
  }
}

// ---------- Dibujo ----------
function ficha(numero, tomado = false) {
  const c = coloresGrupos[numero - 1];
  const s = document.createElement('span');
  s.className = 'np-ficha';
  s.style.setProperty('--g', c.color);
  s.style.setProperty('--gt', c.texto);
  s.textContent = numero;
  s.dataset.grupo = numero;
  if (tomado) s.dataset.tomado = '';
  return s;
}

function dibujarGrupos() {
  $('grilla').replaceChildren(
    ...grupos.map((g) => {
      const f = ficha(g.number, g.taken);
      if (!g.taken) f.classList.add('np-ficha--libre');
      else if (!g.connected) f.classList.add('np-ficha--desconectada');
      f.title = !g.taken ? 'Libre' : g.connected ? 'Conectado · tocar para liberar' : 'Desconectado · tocar para liberar';
      return f;
    }),
  );
  const listos = grupos.filter((g) => g.taken).length;
  $('contador').textContent = `${listos} ${listos === 1 ? 'grupo listo' : 'grupos listos'}`;
  $('btn-empezar').disabled = listos === 0;
}

const filas = new Map(); // número de grupo → <li> del top 10

function filaTop(numero) {
  let li = filas.get(numero);
  if (li) return li;
  li = document.createElement('li');
  const puesto = document.createElement('span');
  puesto.className = 'puesto';
  const pista = document.createElement('div');
  pista.className = 'pista';
  const barra = document.createElement('div');
  barra.style.setProperty('--g', coloresGrupos[numero - 1].color);
  pista.append(barra);
  const metros = document.createElement('span');
  metros.className = 'metros';
  li.append(puesto, ficha(numero, true), pista, metros);
  li.hidden = true;
  $('top').append(li);
  filas.set(numero, li);
  return li;
}

/**
 * Ordena por metros enteros y, a igual metro, deja el orden anterior: así dos grupos
 * que corren a la par no se pasan cinco veces por segundo en el proyector.
 */
function ordenEstable(nuevas) {
  const antes = new Map(posiciones.map(([numero], i) => [numero, i]));
  const servidor = new Map(nuevas.map(([numero], i) => [numero, i]));
  const orden = (n) => antes.get(n) ?? servidor.get(n);
  return [...nuevas].sort((a, b) => b[1] - a[1] || orden(a[0]) - orden(b[0]));
}

/** Top 10 grande (con barras y cambios de puesto animados) y el resto en columnas compactas. */
function dibujarPosiciones() {
  const top = posiciones.slice(0, EN_TOP);
  const maximo = Math.max(1, top[0]?.[1] ?? 1);
  const enTop = new Set();
  top.forEach(([numero, distancia, , conectado], i) => {
    const li = filaTop(numero);
    enTop.add(numero);
    li.hidden = false;
    li.style.transform = `translateY(calc(var(--fila) * ${i}))`;
    li.classList.toggle('primero', i === 0);
    li.classList.toggle('desconectado', !conectado);
    li.children[0].textContent = `${i + 1}.`;
    li.children[2].firstChild.style.width = `${(distancia / maximo) * 100}%`;
    li.children[3].textContent = `${distancia} m`;
  });
  for (const [numero, li] of filas) if (!enTop.has(numero)) li.hidden = true;
  $('top').style.setProperty('--filas', Math.max(1, top.length));

  $('resto').replaceChildren(
    ...posiciones.slice(EN_TOP).map(([numero, distancia, , conectado], i) => {
      const li = document.createElement('li');
      if (!conectado) li.classList.add('desconectado');
      const puesto = document.createElement('span');
      puesto.className = 'puesto';
      puesto.textContent = `${EN_TOP + i + 1}.`;
      const metros = document.createElement('span');
      metros.textContent = `${distancia} m`;
      li.append(puesto, ficha(numero, true), metros);
      return li;
    }),
  );
}

function mostrarPantalla(id) {
  for (const p of document.querySelectorAll('.pantalla')) p.hidden = p.id !== id;
}

function actualizar() {
  if (!sala) return;
  const t = reloj.ahora();
  const f = guion?.faseEn(t) ?? null;

  if (!guion) {
    mostrarPantalla('pantalla-lobby');
    $('barra-fase').textContent = '';
    return;
  }
  if (vista === 'repaso') return mostrarPantalla('pantalla-repaso');
  if (vista === 'debate') {
    const otros = (final?.stats.length ?? 1) - 1;
    $('debate-pregunta').textContent =
      otros > 0 ? `¿Cómo se sintieron los ${otros} ${otros === 1 ? 'grupo que quedó' : 'grupos que quedaron'} sin sudadera?` : '¿Cómo se siente quedarse sin la sudadera?';
    return mostrarPantalla('pantalla-debate');
  }
  if (f?.type === FASES.FIN && final) {
    $('barra-fase').textContent = 'Sold out';
    dibujarFinal();
    return mostrarPantalla('pantalla-final');
  }

  mostrarPantalla('pantalla-carrera');
  $('barra-fase').textContent = textoFase(f, t);
  dibujarCuenta(f, t);
  dibujarPregunta(f, t);
}

function textoFase(f, t) {
  if (!f) return `Empieza en ${Math.max(0, Math.ceil((guion.datos.startsAt - t) / 1000))} s`;
  if (f.type === FASES.FIN) return 'Llegando a la tienda…';
  const numero = f.type === FASES.TRAMO || f.type === FASES.PREGUNTA ? ` ${f.index + 1}/${guion.datos.questions}` : '';
  return `${NOMBRES_FASE[f.type]}${numero} · ${Math.max(0, Math.ceil(f.restante / 1000))} s`;
}

function dibujarCuenta(f, t) {
  let texto = '';
  if (!f) texto = '';
  else if (f.type === FASES.CUENTA) {
    const s = Math.ceil(f.restante / 1000);
    texto = s <= 3 ? String(s) : '';
  } else if (t - guion.largada < 800) texto = '¡DROP!';
  $('cuenta').textContent = texto;
  $('cuenta').hidden = !texto;
}

function dibujarPregunta(f, t) {
  const p = pregunta;
  const r = p && revelado?.index === p.index ? revelado : null;
  const respondiendo = p && f?.type === FASES.PREGUNTA && f.index === p.index;
  const esperandoRevelado = p && !r && t < p.endsAt + 2500;
  const mostrandoRevelado = r && performance.now() < r.hasta;
  const visible = Boolean(respondiendo || esperandoRevelado || mostrandoRevelado);

  $('pregunta').hidden = !visible;
  $('pantalla-carrera').classList.toggle('carrera--pregunta', visible);
  if (!visible) return;

  $('pregunta').classList.toggle('pregunta--revelada', Boolean(r));
  $('pregunta-numero').textContent = `Pregunta ${p.number} de ${p.total}`;
  if ($('pregunta-texto').dataset.index !== String(p.index)) {
    $('pregunta-texto').dataset.index = p.index;
    $('pregunta-texto').textContent = p.text;
    $('pregunta-opciones').replaceChildren(
      ...p.options.map((o, i) => {
        const d = document.createElement('div');
        d.className = 'np-opcion';
        const letra = document.createElement('span');
        letra.className = 'np-opcion__letra';
        letra.textContent = LETRAS[i];
        d.append(letra, o);
        return d;
      }),
    );
  }
  [...$('pregunta-opciones').children].forEach((d, i) => {
    d.classList.toggle('np-opcion--correcta', Boolean(r) && i === r.correctIndex);
    d.classList.toggle('np-opcion--incorrecta', Boolean(r) && i !== r.correctIndex);
  });

  const restante = Math.max(0, p.endsAt - t);
  $('pregunta-tiempo').style.setProperty('--progreso', `${(restante / (p.endsAt - p.startsAt)) * 100}%`);
  $('pregunta-tiempo').classList.toggle('np-temporizador--urgente', restante < 4000);
  $('pregunta-tiempo').hidden = Boolean(r);

  const estado = $('pregunta-estado');
  if (r) estado.innerHTML = `<b>${r.correctCount}</b> de ${r.total} grupos acertaron`;
  else if (respondiendo) {
    const pos = posicionados?.index === p.index ? posicionados : { count: 0, total: grupos.filter((g) => g.taken).length };
    estado.innerHTML = `<b>${pos.count}</b>/${pos.total} grupos posicionados · ${Math.ceil(restante / 1000)} s`;
  } else estado.textContent = 'Atravesando los arcos…';

  const bonus = guion.datos.bonus;
  $('pregunta-ayuda').hidden = !respondiendo || !bonus?.speedMax;
  if (bonus) $('pregunta-ayuda').textContent = `⚡ Cuanto antes elijan el carril (y se queden ahí), más metros: hasta +${bonus.base + bonus.speedMax} m`;
}

function dibujarFinal() {
  const ganador = final.stats[0];
  if (!ganador) {
    $('ganador-nombre').textContent = 'Nadie llegó a la tienda';
    $('ganador-ficha').replaceChildren();
    $('ganador-datos').replaceChildren();
    $('cola').replaceChildren();
    return;
  }
  if ($('ganador-ficha').dataset.grupo === String(ganador.group) && $('cola').childElementCount === final.stats.length - 1) return;
  $('ganador-ficha').dataset.grupo = ganador.group;
  $('ganador-ficha').replaceChildren(ficha(ganador.group));
  $('ganador-nombre').textContent = `Grupo ${ganador.group}`;
  const datos = [
    ['Aciertos', `${ganador.correct}/${final.questions}`],
    ['Distancia', `${ganador.distance} m`],
    ['Esquivados', ganador.dodged],
    ['Likes', ganador.likes],
  ];
  $('ganador-datos').replaceChildren(
    ...datos.map(([etiqueta, valor]) => {
      const d = document.createElement('div');
      d.className = 'np-dato';
      const dt = document.createElement('dt');
      dt.className = 'np-dato__etiqueta';
      dt.textContent = etiqueta;
      const dd = document.createElement('dd');
      dd.className = 'np-dato__valor';
      dd.textContent = valor;
      d.append(dt, dd);
      return d;
    }),
  );
  $('cola').replaceChildren(
    ...final.stats.slice(1).map((s) => {
      const li = document.createElement('li');
      const puesto = document.createElement('span');
      puesto.className = 'puesto';
      puesto.textContent = `${s.position}.`;
      const datos = document.createElement('span');
      datos.textContent = `${s.correct}/${final.questions} · ${s.distance} m`;
      li.append(puesto, ficha(s.group), datos);
      return li;
    }),
  );
}

function dibujarRepaso() {
  const q = repaso[repasoIndice];
  if (!q) return;
  $('repaso-numero').textContent = `Repaso de errores · ${repasoIndice + 1} de ${repaso.length}${q.topic ? ` · ${q.topic}` : ''}`;
  $('repaso-texto').textContent = q.text;
  $('repaso-opciones').replaceChildren(
    ...q.options.map((o, i) => {
      const fila = document.createElement('div');
      fila.className = 'repaso__opcion';
      const opcion = document.createElement('div');
      opcion.className = `np-opcion ${i === q.correctIndex ? 'np-opcion--correcta' : ''}`;
      const letra = document.createElement('span');
      letra.className = 'np-opcion__letra';
      letra.textContent = LETRAS[i];
      opcion.append(letra, o);
      const barra = document.createElement('div');
      barra.className = `repaso__barra ${i === q.correctIndex ? 'repaso__barra--correcta' : ''}`;
      const pista = document.createElement('div');
      pista.className = 'pista';
      const relleno = document.createElement('div');
      relleno.style.width = `${q.total ? (q.distribution[i] / q.total) * 100 : 0}%`;
      pista.append(relleno);
      const n = document.createElement('span');
      n.textContent = `${q.distribution[i]}`;
      barra.append(pista, n);
      fila.append(opcion, barra);
      return fila;
    }),
  );
  const sinResponder = q.total - q.answered;
  $('repaso-aciertos').textContent =
    `${q.correctCount} de ${q.total} grupos acertaron (${Math.round(q.total ? (q.correctCount / q.total) * 100 : 0)} %)` +
    (sinResponder > 0 ? ` · ${sinResponder} sin responder` : '');
  $('repaso-explicacion').textContent = q.explanation || 'Sin explicación cargada para esta pregunta.';
  $('btn-repaso-siguiente').textContent = repasoIndice === repaso.length - 1 ? 'Debate →' : 'Siguiente →';
}

function dibujarInformes(informes) {
  const columnas = ['room', 'group', 'fpsMedio', 'fps1Bajo', 'cuadrosLargos', 'nivel', 'dpr', 'resolucion', 'llamadas', 'triangulos', 'gpu', 'memoriaGb', 'agente'];
  const titulos = ['Sala', 'Grupo', 'FPS medio', 'FPS 1 % bajo', '% > 34 ms', 'Nivel', 'DPR', 'Resolución', 'Draw calls', 'Triángulos', 'GPU', 'RAM (GB)', 'Navegador'];
  const filasHtml = informes.map((i) => `<tr>${columnas.map((c) => `<td>${escapar(i[c] ?? '–')}</td>`).join('')}</tr>`);
  $('informes').innerHTML = `<tr>${titulos.map((t) => `<th>${t}</th>`).join('')}</tr>${filasHtml.join('')}`;
}

function escapar(v) {
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

setInterval(actualizar, 100);
