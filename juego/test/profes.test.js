import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { Salas } from '../server/rooms.js';
import { iniciarServidor } from '../server/index.js';
import { PRIMER_PROFE, esProfe, etiquetaGrupo } from '../public/shared/constantes.js';

// Issue #35: los profes entran con su celular como P1 a P5, juegan, pero no pueden ganar.

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Igual que en fase1.test.js: guarda los eventos para no perder uno que llegó antes de esperarlo.
function conectar(url) {
  const s = io(url, { transports: ['websocket'], forceNew: true });
  const eventos = [];
  s.onAny((nombre, datos) => eventos.push([nombre, datos]));
  s.esperar = async (nombre, filtro = () => true, ms = 15_000) => {
    const limite = Date.now() + ms;
    for (;;) {
      const e = eventos.find(([n, d]) => n === nombre && filtro(d));
      if (e) return e[1];
      if (Date.now() > limite) throw new Error(`No llegó ${nombre}`);
      await espera(20);
    }
  };
  return new Promise((resolve) => s.on('connect', () => resolve(s)));
}

test('los profes son P1 a P5: un celular cada uno, aparte de los grupos de alumnos', () => {
  const sala = new Salas().crear(12);
  assert.equal(etiquetaGrupo(PRIMER_PROFE), 'P1');
  assert.equal(etiquetaGrupo(PRIMER_PROFE + 4), 'P5');
  assert.equal(etiquetaGrupo(7), '7');
  assert.equal(esProfe(PRIMER_PROFE + 5), false);

  const profe = sala.unir(PRIMER_PROFE, null);
  assert.ok(profe.ok);
  assert.equal(profe.grupo.profe, true);
  assert.deepEqual(sala.unir(PRIMER_PROFE, null), { ok: false, motivo: 'taken' });
  assert.deepEqual(sala.unir(PRIMER_PROFE + 5, null), { ok: false, motivo: 'invalid_group' });
  assert.equal(sala.unir(3, null).grupo.profe, false);

  const resumen = sala.resumen();
  assert.equal(resumen.filter((g) => !g.teacher).length, 12);
  const profes = resumen.filter((g) => g.teacher);
  assert.deepEqual(profes.map((g) => g.number), [101, 102, 103, 104, 105]);
  assert.equal(profes[0].taken, true);
  assert.deepEqual(sala.alumnos.map((g) => g.numero), [3]);
});

test('un profe juega y puede ir primero, pero gana el mejor grupo de alumnos y no cuenta en las estadísticas', { timeout: 60_000 }, async () => {
  const servidor = await iniciarServidor({
    puerto: 0,
    archivos: 'ninguno',
    config: { duracionCuenta: 1, duracionSprint: 1, duracionTramo: 1, tiempoPorDefecto: 2, cantidadPreguntas: 1, preguntasEnRepaso: 1 },
  });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    const profe = await conectar(servidor.url);
    const alumno = await conectar(servidor.url);
    sockets.push(host, profe, alumno);
    const { code } = await host.emitWithAck('host:create_room', {});
    assert.ok((await profe.emitWithAck('player:join', { code, groupId: PRIMER_PROFE })).ok);
    assert.ok((await alumno.emitWithAck('player:join', { code, groupId: 4 })).ok);

    host.emit('host:start', {});
    await alumno.esperar('game:script');
    const partida = [...servidor.salas][0].partida;

    const q = await alumno.esperar('question:start');
    const correcta = partida.preguntas[0].correctIndex;
    // El profe sabe la respuesta y corre mucho más; el grupo de alumnos se equivoca.
    await profe.emitWithAck('question:answer', { index: 0, lane: correcta, serverTime: q.endsAt, since: q.startsAt });
    await alumno.emitWithAck('question:answer', { index: 0, lane: (correcta + 1) % q.options.length, serverTime: q.endsAt, since: q.startsAt });
    profe.emit('run:progress', { runDistance: 500 });
    alumno.emit('run:progress', { runDistance: 50 });
    await espera(50);

    // El grupo de alumnos ve que va primero entre los alumnos aunque el profe vaya adelante.
    assert.deepEqual(partida.rangoDe(partida.sala.grupos.get(4)), { position: 1, total: 1, catchUp: false });
    assert.equal(partida.rangoDe(partida.sala.grupos.get(PRIMER_PROFE)).position, 1);
    assert.equal(partida.ranking()[0].numero, PRIMER_PROFE, 'en la carrera el profe va adelante');

    const revelado = await host.esperar('question:reveal', (r) => r.index === 0);
    assert.equal(revelado.total, 1, 'los profes no cuentan en "X de Y grupos acertaron"');
    assert.equal(revelado.correctCount, 0);

    const final = await host.esperar('game:end');
    assert.equal(final.winner, 4);
    assert.deepEqual(final.queue, []);
    assert.deepEqual(
      final.stats.map((s) => [s.group, s.position, Boolean(s.teacher)]),
      [[4, 1, false], [PRIMER_PROFE, null, true]],
    );

    const repaso = await host.emitWithAck('host:review', {});
    assert.equal(repaso[0].total, 1);
    assert.equal(repaso[0].correctCount, 0);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});
