import { io } from 'socket.io-client';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Reloj } from '../public/shared/reloj.js';
import { Guion } from '../public/shared/guion.js';
import { FASES, VELOCIDAD_BASE, INTERVALO_PROGRESO } from '../public/shared/constantes.js';

// Simulador de grupos (sección 9, Fase 0): N celulares falsos que entran a la sala,
// sincronizan el reloj, siguen el guion, mandan su distancia y responden las preguntas.
// Con --cortes, cada bot sufre microcortes al azar para probar la reconexión.
//
//   node tools/bots.js --bots 40 --empezar --cortes 2
//   node tools/bots.js --url https://mi-servidor --bots 40          (solo jugar; el proyector arranca)

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const azar = (min, max) => min + Math.random() * (max - min);

class Bot {
  constructor(numero, opciones) {
    this.numero = numero;
    this.opciones = opciones;
    this.token = null;
    this.guion = null;
    this.distancia = 0;
    this.choques = 0;
    this.frenado = 0;
    this.carril = 1;
    this.desdeCarril = 0;
    this.faseActual = null;
    this.cola = new Map();
    this.resultados = new Map();
    this.rtts = [];
    this.m = { cortes: 0, recuperadas: 0, reingresos: 0, rechazos: 0, respuestasEnviadas: 0, respuestasOk: 0, respuestasRechazadas: 0, progresos: 0, rangos: 0 };
    this.terminado = false;

    this.socket = io(opciones.url, {
      transports: opciones.polling ? ['polling'] : ['websocket', 'polling'],
      tryAllTransports: !opciones.polling,
      reconnectionDelay: 250,
      reconnectionDelayMax: 2000,
      forceNew: true,
    });
    this.reloj = new Reloj(this.socket);
    this.escuchar();
  }

  escuchar() {
    const s = this.socket;
    s.on('connect', () => {
      if (s.recovered) this.m.recuperadas++;
      else {
        if (this.token) this.m.reingresos++;
        s.emit('player:join', { groupId: this.numero, deviceToken: this.token });
      }
      this.reloj.sincronizar(4);
      this.vaciarCola();
    });
    s.on('disconnect', () => this.m.cortes++);
    s.on('player:joined', ({ deviceToken }) => (this.token = deviceToken));
    s.on('player:join_rejected', () => this.m.rechazos++);
    s.on('game:script', (g) => {
      this.guion = new Guion(g);
      this.distancia = 0;
      this.resultados.clear();
      this.faseActual = null;
      this.terminado = false;
      this.programarCortes();
    });
    s.on('question:result', (r) => this.resultados.set(r.index, r));
    s.on('state:sync', (e) => {
      for (const r of e.answers ?? []) this.resultados.set(r.index, r);
      if (e.runDistance > this.distancia) this.distancia = e.runDistance;
    });
    s.on('run:rank', () => this.m.rangos++);
    s.on('game:end', () => (this.terminado = true));
  }

  /** Cortes de red al azar durante la partida (para la prueba de reconexión). */
  programarCortes() {
    const { cortes, corteMin, corteMax } = this.opciones;
    const g = this.guion.datos;
    const fin = g.phases.at(-1).startsAt;
    for (let i = 0; i < cortes; i++) {
      const cuando = azar(g.startsAt, fin - corteMax * 1000) - this.reloj.ahora();
      setTimeout(() => this.cortar(azar(corteMin, corteMax)), Math.max(0, cuando));
    }
  }

  cortar(segundos) {
    if (!this.socket.connected) return;
    const manager = this.socket.io;
    manager.reconnection(false);
    manager.engine.close();
    setTimeout(() => {
      manager.reconnection(true);
      this.socket.connect();
    }, segundos * 1000);
  }

  encolar(clave, evento, datos) {
    this.cola.set(clave, { evento, datos, enviando: false });
    this.m.respuestasEnviadas++;
    this.vaciarCola();
  }

  vaciarCola() {
    if (!this.socket.connected) return;
    for (const [clave, item] of this.cola) {
      if (item.enviando) continue;
      item.enviando = true;
      this.socket.timeout(4000).emit(item.evento, item.datos, (error, r) => {
        item.enviando = false;
        if (error) return;
        this.cola.delete(clave);
        if (r?.ok) this.m.respuestasOk++;
        else this.m.respuestasRechazadas++;
      });
    }
  }

  /** Avanza la simulación del bot (se llama cada 50 ms). */
  paso(dt) {
    if (!this.guion) return;
    const t = this.reloj.ahora();
    const f = this.guion.faseEn(t);
    if (f && f.numero !== this.faseActual?.numero) {
      const anterior = this.faseActual;
      this.faseActual = f;
      if (anterior?.type === FASES.PREGUNTA) {
        this.encolar(`q${anterior.index}`, 'question:answer', {
          index: anterior.index,
          lane: this.carril,
          serverTime: anterior.startsAt + anterior.duration,
          since: this.desdeCarril,
        });
      }
      if (f.type === FASES.PREGUNTA) {
        // Elige un carril al azar en algún momento de la pregunta.
        const demora = azar(1000, f.duration * 0.8);
        setTimeout(() => {
          this.carril = Math.floor(Math.random() * (f.options ?? 3));
          this.desdeCarril = this.reloj.ahora();
        }, demora);
      }
    }
    if (!f || f.type === FASES.CUENTA || f.type === FASES.FIN) return;

    // Choca de vez en cuando y frena un segundo, como un grupo real.
    if (f.type !== FASES.PREGUNTA && Math.random() < dt * 0.15) {
      this.choques++;
      this.frenado = 1;
    }
    this.frenado = Math.max(0, this.frenado - dt);
    this.distancia += VELOCIDAD_BASE * (this.frenado > 0 ? 0.4 : 1) * dt;
  }

  enviarProgreso() {
    if (!this.guion || !this.socket.connected || this.terminado) return;
    this.socket.volatile.emit('run:progress', { runDistance: Math.round(this.distancia * 10) / 10, speed: VELOCIDAD_BASE, hits: this.choques, jumps: 0, likes: 0 });
    this.m.progresos++;
  }

  async medirRtt() {
    if (!this.socket.connected) return;
    const m = await this.reloj.medirUna();
    if (m) this.rtts.push(m.rtt);
  }

  cerrar() {
    this.socket.disconnect();
  }
}

function percentil(lista, p) {
  if (!lista.length) return null;
  const o = [...lista].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor(o.length * p))];
}

/** Corre una prueba completa y devuelve un resumen (lo usan el CLI y los tests). */
export async function correrBots(opciones) {
  const o = { url: 'http://localhost:3000', bots: 40, desde: 1, cortes: 0, corteMin: 2, corteMax: 8, empezar: false, polling: false, log: console.log, ...opciones };
  const bots = [];
  for (let i = 0; i < o.bots; i++) {
    bots.push(new Bot(o.desde + i, o));
    await espera(15); // no entran todos en el mismo milisegundo
  }

  const tick = setInterval(() => bots.forEach((b) => b.paso(0.05)), 50);
  const progreso = setInterval(() => bots.forEach((b) => b.enviarProgreso()), INTERVALO_PROGRESO);
  const rtt = setInterval(() => bots.forEach((b) => b.medirRtt()), 2000);

  // Esperar a que entren todos.
  const limite = Date.now() + 20_000;
  while (bots.some((b) => !b.token) && Date.now() < limite) await espera(100);
  o.log(`✔ ${bots.filter((b) => b.token).length}/${o.bots} bots dentro de la sala`);

  let host = null;
  if (o.empezar) {
    host = io(o.url, { transports: ['websocket'], forceNew: true });
    await new Promise((r) => host.on('connect', r));
    host.emit('host:hello');
    host.emit('host:start', { cantidadPreguntas: o.preguntas, duracionTramo: o.tramo, tiempoPorDefecto: o.pregunta, dificultadObstaculos: 'facil' });
    o.log('▶ Partida iniciada por el bot-proyector');
  }

  const informe = setInterval(() => {
    const conectados = bots.filter((b) => b.socket.connected).length;
    const fase = bots[0]?.faseActual;
    o.log(`  ${conectados}/${o.bots} conectados · fase ${fase ? `${fase.type} ${fase.index ?? ''}` : 'lobby'} · respuestas ok ${bots.reduce((s, b) => s + b.m.respuestasOk, 0)} · cortes ${bots.reduce((s, b) => s + b.m.cortes, 0)}`);
  }, o.intervaloInforme ?? 5000);

  // Esperar el final de la partida (o Ctrl+C si la arranca el proyector real).
  while (!bots.every((b) => b.terminado)) await espera(200);
  await espera(1500); // dar tiempo a acks y resultados atrasados

  clearInterval(tick);
  clearInterval(progreso);
  clearInterval(rtt);
  clearInterval(informe);

  const preguntas = bots[0].guion.datos.questions;
  const rtts = bots.flatMap((b) => b.rtts);
  const suma = (k) => bots.reduce((s, b) => s + b.m[k], 0);
  const resumen = {
    bots: o.bots,
    preguntas,
    respuestasEsperadas: o.bots * preguntas,
    respuestasOk: suma('respuestasOk'),
    respuestasRechazadas: suma('respuestasRechazadas'),
    respuestasPendientes: bots.reduce((s, b) => s + b.cola.size, 0),
    resultadosRecibidos: bots.reduce((s, b) => s + b.resultados.size, 0),
    cortes: suma('cortes'),
    sesionesRecuperadas: suma('recuperadas'),
    reingresosConToken: suma('reingresos'),
    rechazos: suma('rechazos'),
    progresosEnviados: suma('progresos'),
    rttMedianaMs: percentil(rtts, 0.5)?.toFixed(1),
    rttP95Ms: percentil(rtts, 0.95)?.toFixed(1),
  };
  resumen.ok = resumen.respuestasOk === resumen.respuestasEsperadas && resumen.resultadosRecibidos === resumen.respuestasEsperadas;

  bots.forEach((b) => b.cerrar());
  host?.disconnect();
  return resumen;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: v } = parseArgs({
    options: {
      url: { type: 'string', default: 'http://localhost:3000' },
      bots: { type: 'string', default: '40' },
      desde: { type: 'string', default: '1' },
      cortes: { type: 'string', default: '0' },
      'corte-min': { type: 'string', default: '2' },
      'corte-max': { type: 'string', default: '8' },
      empezar: { type: 'boolean', default: false },
      preguntas: { type: 'string', default: '6' },
      tramo: { type: 'string', default: '15' },
      pregunta: { type: 'string', default: '15' },
      polling: { type: 'boolean', default: false },
    },
  });
  const resumen = await correrBots({
    url: v.url,
    bots: Number(v.bots),
    desde: Number(v.desde),
    cortes: Number(v.cortes),
    corteMin: Number(v['corte-min']),
    corteMax: Number(v['corte-max']),
    empezar: v.empezar,
    preguntas: Number(v.preguntas),
    tramo: Number(v.tramo),
    pregunta: Number(v.pregunta),
    polling: v.polling,
  });
  console.log('\nResumen');
  console.table(resumen);
  console.log(resumen.ok ? '✅ Todas las respuestas llegaron y se contaron una sola vez.' : '❌ Faltan respuestas o resultados.');
  process.exit(resumen.ok ? 0 : 1);
}
