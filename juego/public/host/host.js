import { io } from 'socket.io-client';
import { grupos as coloresGrupos } from '../../../design-system/tokens.js';
import { Reloj } from '../shared/reloj.js';
import { Guion } from '../shared/guion.js';
import { FASES } from '../shared/constantes.js';

// Proyector de la Fase 0: lanzar partidas de prueba y mirar grupos, posiciones,
// carga del servidor y las mediciones de FPS que mandan los celulares.
// (La pantalla final, con mapa y ranking animado, es de las fases 1 y 2.)

const $ = (id) => document.getElementById(id);
const LETRAS = ['A', 'B', 'C'];
const NOMBRES_FASE = {
  [FASES.CUENTA]: 'Cuenta regresiva',
  [FASES.TRAMO]: 'Tramo',
  [FASES.PREGUNTA]: 'Pregunta',
  [FASES.SPRINT]: 'Sprint final',
  [FASES.FIN]: 'Llegada',
};

const socket = io({ transports: ['websocket', 'polling'], tryAllTransports: true });
const reloj = new Reloj(socket);
let guion = null;
let pregunta = null;
let revelado = null;
let grupos = [];
let posiciones = [];
let final = null;

socket.on('connect', async () => {
  socket.emit('host:hello');
  await reloj.sincronizar();
});
socket.on('disconnect', () => ($('red').textContent = '🔴 sin conexión'));
socket.on('room:groups', (lista) => {
  grupos = lista;
  dibujarGrupos();
});
socket.on('game:script', (datos) => {
  guion = new Guion(datos);
  pregunta = null;
  revelado = null;
  final = null;
});
socket.on('game:reset', () => {
  guion = null;
  pregunta = null;
  posiciones = [];
  dibujarRanking();
});
socket.on('question:start', (p) => {
  pregunta = p;
  revelado = null;
});
socket.on('question:reveal', (r) => (revelado = r));
socket.on('run:positions', (p) => {
  posiciones = p;
  dibujarRanking();
});
socket.on('game:end', (f) => (final = f));
socket.on('server:stats', (s) => {
  $('red').textContent = `${s.connected}/${grupos.filter((g) => g.taken).length || 0} 🟢`;
  $('stats').textContent = [
    `sockets ${s.sockets}   grupos ${s.groups}   conectados ${s.connected}`,
    `mensajes/s  entrada ${s.inPerSecond}   salida ${s.outPerSecond}`,
    `event loop ${s.eventLoopLagMs} ms   memoria ${s.memoryMb} MB`,
    `rtt del proyector ${reloj.rtt?.toFixed(0) ?? '–'} ms`,
  ].join('\n');
});
socket.on('debug:reports', dibujarInformes);
setInterval(() => reloj.sincronizar(3), 15_000);

$('btn-empezar').addEventListener('click', () =>
  socket.emit('host:start', {
    cantidadPreguntas: Number($('cfg-preguntas').value),
    duracionTramo: Number($('cfg-tramo').value),
    tiempoPorDefecto: Number($('cfg-pregunta').value),
    dificultadObstaculos: $('cfg-dificultad').value,
  }),
);
$('btn-terminar').addEventListener('click', () => socket.emit('host:end'));
$('btn-liberar').addEventListener('click', () => {
  if (confirm('¿Liberar todos los grupos? Cada celular va a tener que elegir su número de nuevo.')) socket.emit('host:release_all');
});

function ficha(numero) {
  const c = coloresGrupos[numero - 1];
  const s = document.createElement('span');
  s.className = 'np-ficha';
  s.style.setProperty('--g', c.color);
  s.style.setProperty('--gt', c.texto);
  s.textContent = numero;
  return s;
}

function dibujarGrupos() {
  $('grilla').replaceChildren(
    ...grupos.map((g) => {
      const f = ficha(g.number);
      if (!g.taken) f.classList.add('np-ficha--libre');
      else if (!g.connected) f.classList.add('np-ficha--desconectada');
      return f;
    }),
  );
}

function dibujarRanking() {
  const maximo = Math.max(1, ...posiciones.map((p) => p[1]));
  $('ranking').replaceChildren(
    ...posiciones.map(([numero, distancia, , conectado]) => {
      const li = document.createElement('li');
      if (!conectado) li.classList.add('desconectado');
      const barra = document.createElement('div');
      barra.className = 'barra-dist';
      barra.style.setProperty('--g', coloresGrupos[numero - 1].color);
      barra.style.width = `${(distancia / maximo) * 100}%`;
      const d = document.createElement('span');
      d.textContent = `${distancia} m`;
      li.append(ficha(numero), barra, d);
      return li;
    }),
  );
}

function dibujarInformes(informes) {
  const columnas = ['group', 'fpsMedio', 'fps1Bajo', 'cuadrosLargos', 'nivel', 'dpr', 'resolucion', 'llamadas', 'triangulos', 'gpu', 'memoriaGb', 'agente'];
  const titulos = ['Grupo', 'FPS medio', 'FPS 1 % bajo', '% > 34 ms', 'Nivel', 'DPR', 'Resolución', 'Draw calls', 'Triángulos', 'GPU', 'RAM (GB)', 'Navegador'];
  const filas = informes.map((i) => `<tr>${columnas.map((c) => `<td>${escapar(i[c] ?? '–')}</td>`).join('')}</tr>`);
  $('informes').innerHTML = `<tr>${titulos.map((t) => `<th>${t}</th>`).join('')}</tr>${filas.join('')}`;
}

function escapar(v) {
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function actualizarFase() {
  if (!guion) {
    $('fase').textContent = 'Sin partida';
    $('pregunta').hidden = true;
    return;
  }
  const t = reloj.ahora();
  const f = guion.faseEn(t);
  if (!f) {
    $('fase').textContent = `Empieza en ${((guion.datos.startsAt - t) / 1000).toFixed(1)} s`;
    return;
  }
  const resto = Math.max(0, f.restante / 1000).toFixed(1);
  const numero = f.type === FASES.TRAMO || f.type === FASES.PREGUNTA ? ` ${f.index + 1}/${guion.datos.questions}` : '';
  $('fase').textContent = f.type === FASES.FIN
    ? final ? `🏆 Ganó el grupo ${final.winner}` : 'Llegada'
    : `${NOMBRES_FASE[f.type]}${numero} · ${resto} s`;

  const mostrar = pregunta && (f.type === FASES.PREGUNTA || (revelado && revelado.index === pregunta.index && t - (f.startsAt ?? 0) < 4000));
  $('pregunta').hidden = !mostrar;
  if (!mostrar) return;
  const r = revelado?.index === pregunta.index ? revelado : null;
  $('pregunta').innerHTML = `<p>${escapar(pregunta.text)}</p>${pregunta.options
    .map((o, i) => {
      const clase = r ? (i === r.correctIndex ? 'np-opcion--correcta' : 'np-opcion--incorrecta') : '';
      const votos = r ? ` · ${r.distribution[i]}` : '';
      return `<div class="np-opcion ${clase}"><span class="np-opcion__letra">${LETRAS[i]}</span>${escapar(o)}${votos}</div>`;
    })
    .join('')}${r ? `<p>${r.correctCount} de ${r.total} grupos acertaron</p>` : ''}`;
}
setInterval(actualizarFase, 100);
