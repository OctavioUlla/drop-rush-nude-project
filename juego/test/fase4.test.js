import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import express from 'express';
import { io } from 'socket.io-client';
import { Guion } from '../public/shared/guion.js';
import { FASES } from '../public/shared/constantes.js';
import { iniciarServidor, servirComprimidos } from '../server/index.js';
import { medirBalance, reglasDeBalance } from '../tools/balanceo.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function conectar(url) {
  const s = io(url, { transports: ['websocket'], forceNew: true });
  const eventos = [];
  s.onAny((nombre, datos) => eventos.push([nombre, datos]));
  s.eventos = eventos;
  s.esperar = async (nombre, filtro = () => true, ms = 15_000) => {
    const limite = Date.now() + ms;
    for (;;) {
      const e = eventos.find(([n, d]) => n === nombre && filtro(d));
      if (e) return e[1];
      if (Date.now() > limite) throw new Error(`No llegó ${nombre}`);
      await espera(20);
    }
  };
  /** El último guion recibido (el mismo id vuelve con cada pausa o salto). */
  s.guion = () => eventos.filter(([n]) => n === 'game:script').at(-1)?.[1];
  return new Promise((resolve) => s.on('connect', () => resolve(s)));
}

const faseDe = (guion, tipo, index) => guion.phases.find((f) => f.type === tipo && f.index === index);

// ---------- Guion compartido ----------

test('el guion en pausa congela la hora en el momento de la pausa', () => {
  const g = new Guion({ id: 1, startsAt: 0, phases: [{ type: FASES.TRAMO, startsAt: 0, duration: 10_000 }], pausedAt: 4000 });
  assert.equal(g.pausada, true);
  assert.equal(g.tiempo(9000), 4000);
  assert.equal(g.faseEn(g.tiempo(20_000)).restante, 6000);
  const sigue = new Guion({ ...g.datos, pausedAt: null });
  assert.equal(sigue.tiempo(9000), 9000);
});

// ---------- Controles del presentador ----------

test('pausar, seguir, saltar y terminar: el guion se corre igual para todos y la partida sigue', { timeout: 60_000 }, async () => {
  const servidor = await iniciarServidor({
    puerto: 0,
    archivos: 'ninguno',
    config: { duracionCuenta: 1, duracionTramo: 30, tiempoPorDefecto: 30, duracionSprint: 30, cantidadPreguntas: 3, preguntasEnRepaso: 3 },
  });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    const jugador = await conectar(servidor.url);
    const ajeno = await conectar(servidor.url);
    sockets.push(host, jugador, ajeno);
    const { code } = await host.emitWithAck('host:create_room', {});
    await jugador.emitWithAck('player:join', { code, groupId: 4 });
    // Solo el proyector de la sala puede usar los controles.
    assert.equal((await ajeno.emitWithAck('host:pause')).ok, false);
    assert.equal((await host.emitWithAck('host:pause')).ok, false, 'sin partida no hay nada que pausar');

    host.emit('host:start', {});
    const original = structuredClone(await jugador.esperar('game:script'));
    const partida = [...servidor.salas][0].partida;
    await espera(2800); // ya en el primer tramo (1,5 s de margen + 1 s de cuenta)
    jugador.emit('run:progress', { runDistance: 10, speed: 9.4 });

    // Pausa: el guion vuelve con la hora de la pausa y el mapa no predice avance.
    assert.equal((await host.emitWithAck('host:pause')).ok, true);
    const pausado = await jugador.esperar('game:script', (g) => g.pausedAt);
    assert.equal(pausado.id, original.id);
    assert.equal((await host.emitWithAck('host:pause')).ok, false, 'no se pausa dos veces');
    await espera(1200);
    assert.equal(partida.posiciones()[0][1], 10, 'en pausa la ficha no avanza');
    // En pausa no se usan poderes.
    partida.sala.grupos.get(4).poder = 'hype';
    assert.equal((await jugador.emitWithAck('player:use_power', { powerId: 'hype', useId: 'x' })).motivo, 'paused');

    // Seguir: todo lo que faltaba se corre lo que duró la pausa.
    assert.equal((await host.emitWithAck('host:resume')).ok, true);
    const seguido = await jugador.esperar('game:script', (g) => g.revision === 2);
    assert.equal(seguido.pausedAt, null);
    const corrido = faseDe(seguido, FASES.PREGUNTA, 0).startsAt - faseDe(original, FASES.PREGUNTA, 0).startsAt;
    assert.ok(corrido >= 1150 && corrido < 2500, `la pregunta se corrió ${corrido} ms`);
    assert.deepEqual(seguido.shifts.map((s) => s.from), [pausado.pausedAt]);
    assert.equal(seguido.phases.at(-1).startsAt - faseDe(original, FASES.PREGUNTA, 0).startsAt, original.phases.at(-1).startsAt - faseDe(original, FASES.PREGUNTA, 0).startsAt + corrido);

    // Saltar un tramo: la pregunta empieza enseguida.
    const antes = Date.now();
    assert.equal((await host.emitWithAck('host:skip')).ok, true);
    const q0 = await jugador.esperar('question:start', (q) => q.index === 0);
    assert.ok(Date.now() - antes < 600, 'la pregunta 0 empezó al saltar el tramo');
    assert.ok(Math.abs(q0.startsAt - antes) < 600);

    // Saltar la pregunta: se cierra ya y se revela con la respuesta dada a la hora nueva.
    const correcta = partida.preguntas[0].correctIndex;
    assert.equal((await host.emitWithAck('host:skip')).ok, true);
    const recortado = await jugador.esperar('game:script', (g) => g.revision === 4);
    const p0 = faseDe(recortado, FASES.PREGUNTA, 0);
    const finNuevo = p0.startsAt + p0.duration;
    assert.ok(finNuevo < q0.endsAt - 20_000, 'la pregunta terminó antes');
    const ack = await jugador.emitWithAck('question:answer', { index: 0, lane: correcta, serverTime: finNuevo, since: q0.startsAt });
    assert.equal(ack.ok, true);
    const resultado = await jugador.esperar('question:result', (r) => r.index === 0);
    assert.equal(resultado.correct, true);
    assert.equal(resultado.speedBonus, 100, 'eligió el carril al empezar: rapidez máxima');
    // La ventaja dura hasta el final del tramo que empieza, con las horas nuevas.
    const tramo1 = faseDe(recortado, FASES.TRAMO, 1);
    assert.equal(resultado.advantageUntil, tramo1.startsAt + tramo1.duration);

    // Un celular que no recibió el guion nuevo responde con la hora original: también vale.
    const otro = await conectar(servidor.url);
    sockets.push(otro);
    await otro.emitWithAck('player:join', { code, groupId: 5 });
    const tarde = await otro.emitWithAck('question:answer', { index: 0, lane: correcta, serverTime: q0.endsAt, since: q0.endsAt });
    assert.equal(tarde.ok, true);

    // Terminar ahora: gana quien va primero; solo cuenta la pregunta revelada.
    await espera(200);
    assert.equal((await host.emitWithAck('host:finish')).ok, true);
    const final = await host.esperar('game:end');
    assert.equal(final.questions, 1);
    assert.equal(final.winner, 4, 'acertó con rapidez máxima: va primero');
    await jugador.esperar('game:end');
    const ultimo = jugador.guion();
    assert.equal(ultimo.phases.at(-1).type, FASES.FIN);
    assert.ok(Math.abs(ultimo.phases.at(-1).startsAt - Date.now()) < 1500);
    assert.equal((await host.emitWithAck('host:skip')).ok, false, 'después del final no hay nada que saltar');
    const repaso = await host.emitWithAck('host:review', {});
    assert.deepEqual(repaso.map((r) => r.index), [0], 'las preguntas que no se jugaron no entran al repaso');
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});

test('terminar en plena pregunta: la pregunta sin revelar no cuenta y la partida no se rompe', { timeout: 30_000 }, async () => {
  const servidor = await iniciarServidor({
    puerto: 0,
    archivos: 'ninguno',
    config: { duracionCuenta: 1, duracionTramo: 1, tiempoPorDefecto: 30, cantidadPreguntas: 2 },
  });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    const jugador = await conectar(servidor.url);
    sockets.push(host, jugador);
    const { code } = await host.emitWithAck('host:create_room', {});
    await jugador.emitWithAck('player:join', { code, groupId: 1 });
    host.emit('host:start', {});
    await jugador.esperar('question:start', (q) => q.index === 0);
    // Pausada y terminada: termina igual, sin esperar a que se siga.
    assert.equal((await host.emitWithAck('host:pause')).ok, true);
    assert.equal((await host.emitWithAck('host:finish')).ok, true);
    const final = await jugador.esperar('game:end');
    assert.equal(final.questions, 0);
    assert.equal(final.winner, 1);
    assert.equal(jugador.guion().pausedAt, null);
    await espera(1500);
    assert.equal(jugador.eventos.filter(([n]) => n === 'question:result').length, 0, 'la pregunta cortada no se revela');
    assert.deepEqual(await host.emitWithAck('host:review', {}), []);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});

// ---------- Balanceo (sección 7) ----------

test('balanceo: con la configuración por defecto, saber del caso pesa más que esquivar', () => {
  const b = medirBalance({ semillas: 60 });
  for (const r of reglasDeBalance(b)) assert.ok(r.ok, `${r.regla}: ${r.detalle}`);
});

test('balanceo: en cualquier dificultad un choque cuesta poco y una respuesta vale más que un tramo', () => {
  for (const dificultad of ['normal', 'caotico']) {
    const b = medirBalance({ dificultad, semillas: 30 });
    assert.ok(b.costoPorChoque >= 5 && b.costoPorChoque <= 20, `${dificultad}: ${b.costoPorChoque} m por choque`);
    assert.ok(b.acierto.minimo >= b.tramoPrimero);
    assert.ok(b.peorPerdidaTramo < b.acierto.minimo / 2, `${dificultad}: el peor tramo cuesta ${b.peorPerdidaTramo} m`);
  }
});

// ---------- Archivos comprimidos ----------

test('el servidor manda la versión .br o .gz si el navegador la acepta, y nunca sale de la carpeta', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'drop-rush-'));
  mkdirSync(join(dir, 'assets'));
  const js = 'console.log("drop");'.repeat(100);
  writeFileSync(join(dir, 'assets', 'a.js'), js);
  writeFileSync(join(dir, 'assets', 'a.js.br'), brotliCompressSync(js));
  writeFileSync(join(dir, 'assets', 'a.js.gz'), gzipSync(js));
  writeFileSync(join(dir, 'index.html'), '<p>hola</p>');
  const app = express();
  app.use(servirComprimidos(dir));
  app.use(express.static(dir));
  const http = app.listen(0);
  const url = `http://localhost:${http.address().port}`;
  try {
    // fetch descomprime solo: se mira el encabezado y que el contenido llegue igual.
    const br = await fetch(`${url}/assets/a.js`, { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(br.headers.get('content-encoding'), 'br');
    assert.match(br.headers.get('content-type'), /javascript/);
    assert.match(br.headers.get('cache-control'), /immutable/);
    assert.equal(await br.text(), js);
    const gz = await fetch(`${url}/assets/a.js`, { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(gz.headers.get('content-encoding'), 'gzip');
    const plano = await fetch(`${url}/index.html`, { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(plano.headers.get('content-encoding'), null, 'sin .br al lado se manda el original');
    assert.equal((await fetch(`${url}/..%2f..%2fetc%2fpasswd`)).status, 404);
  } finally {
    http.close();
    rmSync(dir, { recursive: true });
  }
});
