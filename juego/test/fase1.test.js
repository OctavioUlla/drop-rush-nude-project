import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { Salas, normalizarCodigo } from '../server/rooms.js';
import { elegirRepaso, ordenarLlegada } from '../server/stats.js';
import { prepararPreguntas } from '../server/game.js';
import { cargarConfig, cargarPreguntas } from '../server/config.js';
import { iniciarServidor } from '../server/index.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

test('cada sala tiene un código de 4 letras distinto y se encuentra aunque se escriba en minúsculas', () => {
  const salas = new Salas();
  const codigos = new Set();
  for (let i = 0; i < 200; i++) {
    const { codigo } = salas.crear(40);
    assert.match(codigo, /^[A-Z]{4}$/);
    assert.doesNotMatch(codigo, /[ILOQ]/);
    codigos.add(codigo);
  }
  assert.equal(codigos.size, 200);
  const [primera] = salas;
  assert.equal(salas.get(` ${primera.codigo.toLowerCase()} `), primera);
  assert.equal(normalizarCodigo('ab-cd9'), 'ABCD');
  assert.equal(salas.get('ZZZZZ'), null);
});

test('un celular por grupo: el token vuelve a su grupo y otro celular es rechazado', () => {
  const sala = new Salas().crear(40);
  const a = sala.unir(7, null);
  assert.ok(a.ok);
  assert.deepEqual(sala.unir(7, null), { ok: false, motivo: 'taken' });
  assert.deepEqual(sala.unir(41, null), { ok: false, motivo: 'invalid_group' });
  // Con su token vuelve a su grupo aunque pida otro número.
  assert.equal(sala.unir(3, a.grupo.token).grupo.numero, 7);
});

test('liberar un grupo en plena partida conserva su distancia para el celular que lo retoma', () => {
  const sala = new Salas().crear(40);
  sala.partida = { guion: {} };
  const { grupo } = sala.unir(5, null);
  const tokenViejo = grupo.token;
  grupo.distanciaCorrida = 120;
  grupo.bonus = 200;
  sala.liberar(5);
  assert.equal(sala.resumen()[4].taken, false);
  assert.equal(sala.unir(null, tokenViejo).ok, false, 'el token viejo ya no sirve');
  const nuevo = sala.unir(5, null);
  assert.ok(nuevo.ok);
  assert.equal(nuevo.grupo, grupo);
  assert.equal(nuevo.grupo.distanciaTotal, 320);
  assert.notEqual(nuevo.grupo.token, tokenViejo);

  // Sin partida, liberar deja el número como nuevo.
  sala.partida = { guion: null };
  sala.liberar(5);
  assert.equal(sala.grupos.has(5), false);
});

function grupoFalso(numero, distancia, respuestas) {
  const r = new Map(respuestas.map((x, i) => [i, { index: i, ...x }]));
  return {
    numero,
    distanciaTotal: distancia,
    respuestas: r,
    get aciertos() {
      return [...r.values()].filter((x) => x.correct).length;
    },
    get demoraTotal() {
      return [...r.values()].reduce((s, x) => s + (x.correct ? x.demora : 0), 0);
    },
  };
}

test('el repaso elige las preguntas con menos aciertos (no responder cuenta como error)', () => {
  const preguntas = [0, 1, 2].map((i) => ({ text: `P${i}`, options: ['a', 'b', 'c'], correctIndex: 0, topic: 't', explanation: `E${i}` }));
  const grupos = [
    grupoFalso(1, 0, [{ lane: 0, correct: true }, { lane: 1, correct: false }, { lane: 0, correct: true }]),
    grupoFalso(2, 0, [{ lane: 0, correct: true }, { lane: 2, correct: false }]),
    grupoFalso(3, 0, [{ lane: 1, correct: false }, { lane: 0, correct: true }]),
  ];
  // P1 y P2 tienen 1 acierto de 3; P1 va primero porque más grupos eligieron mal.
  const repaso = elegirRepaso(preguntas, grupos, 2);
  assert.deepEqual(repaso.map((r) => r.index), [1, 2]);
  assert.deepEqual(repaso[0].distribution, [1, 1, 1]);
  assert.equal(repaso[0].explanation, 'E1');
  assert.equal(repaso[1].correctCount, 1);
  assert.equal(repaso[1].answered, 1);
  assert.equal(repaso[1].total, 3);
});

test('llegada: gana la mayor distancia; si empatan, más aciertos y después el más rápido', () => {
  const orden = ordenarLlegada([
    grupoFalso(1, 500, [{ correct: true, demora: 5000 }]),
    grupoFalso(2, 500, [{ correct: true, demora: 2000 }]),
    grupoFalso(3, 500, [{ correct: true, demora: 1000 }, { correct: true, demora: 9000 }]),
    grupoFalso(4, 600, []),
  ]);
  assert.deepEqual(orden.map((g) => g.numero), [4, 3, 2, 1]);
});

test('con 6 preguntas se usa una por tema; las de reserva solo si se piden más', () => {
  const banco = cargarPreguntas();
  const config = cargarConfig();
  const seis = prepararPreguntas(banco, { ...config, cantidadPreguntas: 6 });
  assert.equal(new Set(seis.map((p) => p.topic)).size, 6);
  assert.ok(seis.every((p) => !banco.find((b) => b.id === p.id).reserva));
  assert.equal(prepararPreguntas(banco, { ...config, cantidadPreguntas: 9 }).length, 9);
  // La opción correcta sigue siendo la misma después de mezclar.
  for (const p of seis) {
    const original = banco.find((b) => b.id === p.id);
    assert.equal(p.options[p.correctIndex], original.opciones[original.correcta]);
  }
});

test('el banco de preguntas entra en el proyector y en los arcos del celular', () => {
  for (const p of cargarPreguntas()) {
    assert.ok(p.pregunta.length <= 120, `pregunta ${p.id} demasiado larga`);
    assert.ok(p.explicacion, `pregunta ${p.id} sin explicación`);
    for (const corta of p.opcionesCortas ?? []) assert.ok(corta.length <= 20, `opción corta "${corta}" de más de 20 letras`);
  }
});

// ---------- Partida completa por sockets ----------

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
  return new Promise((resolve) => s.on('connect', () => resolve(s)));
}

test('sala con código: entrar, preguntas con revelado, ganador, repaso y vuelta al lobby', { timeout: 60_000 }, async () => {
  const servidor = await iniciarServidor({
    puerto: 0,
    archivos: 'ninguno',
    config: { duracionCuenta: 1, duracionSprint: 1, duracionTramo: 1, tiempoPorDefecto: 2, cantidadPreguntas: 2, preguntasEnRepaso: 1 },
  });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    sockets.push(host);
    const sala = await host.emitWithAck('host:create_room', {});
    assert.ok(sala.ok);
    assert.match(sala.code, /^[A-Z]{4}$/);
    assert.equal((await host.emitWithAck('host:hello', { code: sala.code, hostKey: 'otra' })).ok, false);
    assert.equal((await host.emitWithAck('host:hello', { code: sala.code, hostKey: sala.hostKey })).ok, true);

    const sabe = await conectar(servidor.url);
    const noSabe = await conectar(servidor.url);
    const intruso = await conectar(servidor.url);
    sockets.push(sabe, noSabe, intruso);

    assert.deepEqual(await sabe.emitWithAck('room:enter', { code: 'ZZZZ' }), { ok: false, reason: 'room_not_found' });
    const entrada = await sabe.emitWithAck('room:enter', { code: sala.code.toLowerCase() });
    assert.equal(entrada.groups.filter((g) => !g.teacher).length, 40);
    assert.equal(entrada.groups.filter((g) => g.teacher).length, 5, 'más los lugares de los profes (P1 a P5)');

    const unido = await sabe.emitWithAck('player:join', { code: sala.code, groupId: 1 });
    assert.ok(unido.ok);
    assert.ok((await noSabe.emitWithAck('player:join', { code: sala.code, groupId: 2 })).ok);
    assert.equal((await intruso.emitWithAck('player:join', { code: sala.code, groupId: 1 })).reason, 'taken');
    await host.esperar('room:groups', (g) => g.filter((x) => x.taken).length === 2);

    host.emit('host:start', {});
    const guion = await sabe.esperar('game:script');
    const partida = [...servidor.salas][0].partida;

    for (let index = 0; index < 2; index++) {
      const q = await sabe.esperar('question:start', (d) => d.index === index);
      assert.equal(q.correctIndex, undefined, 'el celular nunca recibe la respuesta correcta');
      const correcta = partida.preguntas[index].correctIndex;
      const incorrecta = (correcta + 1) % q.options.length;
      sabe.emit('question:lane', { index, lane: correcta });
      await host.esperar('question:positioned', (p) => p.index === index && p.count === 1);
      const fin = q.endsAt;
      await sabe.emitWithAck('question:answer', { index, lane: correcta, serverTime: fin, since: q.startsAt });
      await noSabe.emitWithAck('question:answer', { index, lane: incorrecta, serverTime: fin, since: q.startsAt });
      const resultado = await sabe.esperar('question:result', (r) => r.index === index);
      assert.equal(resultado.correct, true);
      assert.ok(resultado.bonus >= 150);
      assert.equal((await noSabe.esperar('question:result', (r) => r.index === index)).correct, false);
      const revelado = await host.esperar('question:reveal', (r) => r.index === index);
      assert.equal(revelado.correctIndex, correcta);
      assert.equal(revelado.correctCount, 1);
      assert.equal(revelado.total, 2);
    }

    const final = await host.esperar('game:end');
    assert.equal(final.winner, 1);
    assert.deepEqual(final.queue, [2]);
    assert.equal(final.stats[0].correct, 2);
    assert.equal(final.stats[1].correct, 0);
    assert.ok(guion.phases.at(-1).startsAt <= Date.now());

    const repaso = await host.emitWithAck('host:review', {});
    assert.equal(repaso.length, 1);
    assert.equal(repaso[0].correctCount, 1);
    assert.ok(repaso[0].explanation);

    host.emit('host:end');
    await sabe.esperar('game:reset');
    assert.equal(partida.guion, null);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});

test('el presentador libera un grupo en plena partida y otro celular lo retoma con su distancia', { timeout: 30_000 }, async () => {
  const servidor = await iniciarServidor({ puerto: 0, archivos: 'ninguno', config: { duracionCuenta: 1, duracionTramo: 20 } });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    const viejo = await conectar(servidor.url);
    const nuevo = await conectar(servidor.url);
    sockets.push(host, viejo, nuevo);
    const { code } = await host.emitWithAck('host:create_room', {});
    await viejo.emitWithAck('player:join', { code, groupId: 9 });
    host.emit('host:start', {});
    await viejo.esperar('game:script');
    await espera(1200);
    viejo.emit('run:progress', { runDistance: 42 });
    await espera(100);

    host.emit('host:release_group', { groupId: 9 });
    await viejo.esperar('player:released');
    await host.esperar('room:groups', (g) => !g[8].taken);

    const r = await nuevo.emitWithAck('player:join', { code, groupId: 9 });
    assert.ok(r.ok);
    const estado = await nuevo.esperar('state:sync');
    assert.equal(estado.runDistance, 42);
    // El celular viejo ya no manda en el grupo.
    viejo.emit('run:progress', { runDistance: 999 });
    await espera(100);
    assert.equal([...servidor.salas][0].grupos.get(9).distanciaCorrida, 42);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});

test('antes de la presentación un celular suelta su grupo para elegir otro; con el hype lanzado ya no puede', { timeout: 30_000 }, async () => {
  const servidor = await iniciarServidor({ puerto: 0, archivos: 'ninguno' });
  const sockets = [];
  try {
    const pres = await conectar(servidor.url);
    const celu = await conectar(servidor.url);
    const otro = await conectar(servidor.url);
    sockets.push(pres, celu, otro);
    const { code } = await pres.emitWithAck('host:create_room', {});
    assert.ok((await pres.emitWithAck('pres:conectar', {})).ok);
    await celu.emitWithAck('player:join', { code, groupId: 4 });
    await pres.esperar('room:groups', (g) => g[3].taken);

    // En la espera de la portada todavía se puede corregir el número.
    const r = await celu.emitWithAck('player:leave', {});
    assert.ok(r.ok);
    assert.equal(r.groups[3].taken, false);
    await pres.esperar('room:groups', (g) => !g[3].taken);
    assert.ok((await otro.emitWithAck('player:join', { code, groupId: 4 })).ok);
    assert.equal((await celu.emitWithAck('player:join', { code, groupId: 5 })).groupId, 5);

    // Con el hype de apertura arranca la presentación: el grupo queda fijo.
    assert.ok((await pres.emitWithAck('pres:hype:preparar', { segundos: 0 })).ok);
    assert.deepEqual(await celu.emitWithAck('player:leave', {}), { ok: false, reason: 'started' });
    assert.equal([...servidor.salas][0].grupos.get(5).libre, false);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});

test('en una sala sin presentación el grupo se puede cambiar hasta que arranca la partida', { timeout: 30_000 }, async () => {
  const servidor = await iniciarServidor({ puerto: 0, archivos: 'ninguno', config: { duracionCuenta: 1, duracionTramo: 20 } });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    const celu = await conectar(servidor.url);
    sockets.push(host, celu);
    const { code } = await host.emitWithAck('host:create_room', {});
    await celu.emitWithAck('player:join', { code, groupId: 4 });
    assert.ok((await celu.emitWithAck('player:leave', {})).ok);
    await celu.emitWithAck('player:join', { code, groupId: 5 });

    host.emit('host:start', {});
    await celu.esperar('game:script');
    assert.deepEqual(await celu.emitWithAck('player:leave', {}), { ok: false, reason: 'started' });
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});
