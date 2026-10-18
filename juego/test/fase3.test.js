import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { Corredor } from '../public/play/runner.js';
import { Pista, TIPOS } from '../public/play/track.js';
import { CARRILES, FASES } from '../public/shared/constantes.js';
import { VENTAJAS, PODERES, TURBO, DURACION_ALGORITMO, TOPE_ALGORITMO, recibeImpulso } from '../public/shared/poderes.js';
import { Salas } from '../server/rooms.js';
import { Partida } from '../server/game.js';
import { cargarConfig, cargarPreguntas } from '../server/config.js';
import { iniciarServidor } from '../server/index.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function obstaculo(tipo, carril, z, extra = {}) {
  return { tipo, carril, z, ...TIPOS[tipo], golpeado: false, pasado: false, hundido: 0, ...extra };
}

function correrHasta(corredor, pista, distancia, alPaso) {
  corredor.corriendo = true;
  while (corredor.distancia < distancia) {
    alPaso?.(corredor);
    corredor.paso(1 / 60, pista);
  }
}

/** Metros que corre en `s` segundos (ya lanzado) con los modificadores que se le pongan. */
function metrosEn(s, modificar) {
  const c = new Corredor();
  modificar(c);
  c.corriendo = true;
  c.velocidad = 9.4 * c.multiplicador;
  for (let i = 0; i < 60 * s; i++) c.paso(1 / 60, null);
  return c.distancia;
}

// ---------- Corredor ----------

test('turbo (+40 %), impulso de emparejar (+10 %) y arranque lento después de errar', () => {
  const normal = metrosEn(10, () => {});
  const turbo = metrosEn(10, (c) => (c.turbo = true));
  const impulso = metrosEn(10, (c) => (c.impulso = true));
  const lento = metrosEn(10, (c) => (c.lenta = 2));
  assert.ok(Math.abs(turbo / normal - TURBO) < 0.03, `${turbo} vs ${normal}`);
  assert.ok(Math.abs(impulso / normal - 1.1) < 0.02);
  assert.ok(lento < normal - 2 && lento > normal - 8, `arranque lento: ${lento} vs ${normal}`);
});

test('el escudo absorbe el primer choque sin frenar; el segundo frena', () => {
  const pista = new Pista();
  pista.obstaculos.push(obstaculo('fan', 1, 30), obstaculo('fan', 1, 60));
  const c = new Corredor();
  c.escudos = 1;
  let velocidadTrasEscudo = null;
  correrHasta(c, pista, 33, (x) => {
    if (x.eventos.includes('escudo')) velocidadTrasEscudo = x.velocidad;
    x.eventos.length = 0;
  });
  assert.equal(c.choques, 0);
  assert.equal(c.escudos, 0);
  assert.equal(c.frenado, 0);
  assert.ok(velocidadTrasEscudo > 9);
  correrHasta(c, pista, 62);
  assert.equal(c.choques, 1);
});

test('con el imán se juntan los likes de otro carril y en el aire', () => {
  const crear = () => {
    const p = new Pista();
    p.likes.push({ carril: 0, z: 20, y: 0.6, tomado: false, hundido: 0 }, { carril: 2, z: 30, y: 2.4, tomado: false, hundido: 0 });
    return p;
  };
  const sin = new Corredor();
  correrHasta(sin, crear(), 40);
  assert.equal(sin.likes, 0);
  const con = new Corredor();
  con.iman = true;
  correrHasta(con, crear(), 40);
  assert.equal(con.likes, 2);
});

test('Pase 50/50: no se puede entrar al carril cerrado y quien estaba ahí pasa a uno abierto', () => {
  const c = new Corredor();
  c.carril = 1;
  c.cerrarCarril(1);
  assert.notEqual(c.carril, 1);
  c.carril = 0;
  c.gesto('der');
  c.paso(1 / 60, null);
  assert.equal(c.carril, 2, 'saltea el carril cerrado');
  c.cerrarCarril(0);
  c.carril = 1;
  c.gesto('izq');
  c.paso(1 / 60, null);
  assert.equal(c.carril, 1, 'a la izquierda no hay otro carril abierto');
  c.cerrarCarril(null);
  c.gesto('izq');
  c.paso(1 / 60, null);
  assert.equal(c.carril, 0);
});

test('Ruta VIP despeja una de cada dos filas; los obstáculos del Cambio de algoritmo salen del piso lejos de los demás', () => {
  const pista = new Pista();
  pista.agregarTramo(77, 30, 400, 'normal');
  const filas = new Set(pista.obstaculos.map((o) => o.z)).size;
  pista.aclarar(10);
  const quedan = new Set(pista.obstaculos.filter((o) => !o.hundido).map((o) => o.z)).size;
  assert.equal(quedan, Math.floor(filas / 2));

  const otra = new Pista();
  otra.obstaculos.push(obstaculo('fan', 1, 50));
  otra.agregarExtra(5, 30, 120);
  const extra = otra.obstaculos.filter((o) => o.surgiendo);
  assert.ok(extra.length >= 5);
  for (const o of extra) assert.ok(o.z < 44 || o.z > 56.6, `extra pegado a la fila existente (${o.z})`);
  assert.equal(new Set(extra.map((o) => o.z)).size, extra.length, 'uno por fila');
  // Mientras sale del piso no se choca; después sí.
  const c = new Corredor();
  c.carril = extra[0].carril;
  c.x = CARRILES[c.carril];
  c.distancia = extra[0].z - 0.2;
  otra.obstaculos = [extra[0]];
  c.colisiones(otra);
  assert.equal(c.choques, 0);
  for (let i = 0; i < 30; i++) otra.limpiar(c.distancia, 1 / 60);
  assert.equal(extra[0].hundido, 0);
  c.colisiones(otra);
  assert.equal(c.choques, 1);
});

// ---------- Servidor: ventajas, rachas y poderes ----------

const largada = (partida) => partida.guion.phases.find((f) => f.type === FASES.TRAMO).startsAt;

function partidaDePrueba(extra = {}) {
  let reloj = 1_000_000;
  const enviados = [];
  const sala = new Salas().crear(40);
  const config = cargarConfig({ cantidadPreguntas: 4, ordenAleatorio: false, ...extra });
  const partida = new Partida({ config, banco: cargarPreguntas(), sala, enviar: (destino, evento, datos) => enviados.push({ destino, evento, datos }), ahora: () => reloj });
  sala.partida = partida;
  const grupos = [1, 2, 3, 4, 5, 6].map((n) => sala.unir(n, null).grupo);
  partida.iniciar({});
  for (const t of partida.temporizadores) clearTimeout(t);
  return {
    partida,
    grupos,
    enviados,
    get reloj() {
      return reloj;
    },
    set reloj(v) {
      reloj = v;
    },
    /** El grupo responde la pregunta `index` (bien o mal) eligiendo el carril al principio. */
    responder(g, index, bien) {
      const fase = partida.faseDePregunta(index);
      reloj = fase.startsAt + fase.duration + 200;
      const p = partida.preguntas[index];
      const lane = bien ? p.correctIndex : (p.correctIndex + 1) % p.options.length;
      return partida.registrarRespuesta(g, { index, lane, serverTime: fase.startsAt + fase.duration, since: fase.startsAt }) && g.respuestas.get(index);
    },
  };
}

test('acertar da una ventaja que dura el tramo siguiente; errar corta la racha y da arranque lento', () => {
  const t = partidaDePrueba();
  const [g] = t.grupos;
  const r = t.responder(g, 0, true);
  assert.ok(VENTAJAS[r.advantageId]);
  const tramo = t.partida.guion.phases.find((f) => f.type === FASES.TRAMO && f.index === 1);
  assert.equal(r.advantageUntil, tramo.startsAt + tramo.duration);
  assert.equal(g.racha, 1);
  assert.equal(r.powerId, undefined);

  const mal = t.responder(g, 1, false);
  assert.equal(mal.correct, false);
  assert.equal(mal.slowStart, 2);
  assert.equal(mal.advantageId, undefined);
  assert.equal(g.racha, 0);
});

test('2 aciertos seguidos dan un poder; solo se guarda uno a la vez', () => {
  const t = partidaDePrueba();
  const [g] = t.grupos;
  t.responder(g, 0, true);
  const segunda = t.responder(g, 1, true);
  assert.ok(PODERES[segunda.powerId]);
  assert.equal(g.poder, segunda.powerId);
  assert.equal(g.racha, 0);
  t.responder(g, 2, true);
  const cuarta = t.responder(g, 3, true);
  assert.equal(cuarta.powerId, undefined, 'ya tenía uno guardado');
  // En la última pregunta solo sirve el Cambio de algoritmo (Hype y 50/50 necesitan preguntas por delante).
  assert.equal(t.partida.sortearPoder(3), 'algoritmo');

  const sinPoderes = partidaDePrueba({ poderesActivos: false });
  sinPoderes.responder(sinPoderes.grupos[0], 0, true);
  assert.equal(sinPoderes.responder(sinPoderes.grupos[0], 1, true).powerId, undefined);
});

test('Hype duplica el bonus de la próxima correcta y el mismo uso no se aplica dos veces', () => {
  const t = partidaDePrueba();
  const [g, otro] = t.grupos;
  assert.deepEqual(t.partida.usarPoder(g, { powerId: 'hype', useId: 'x' }), { ok: false, motivo: 'no_power' });
  g.poder = 'hype';
  t.reloj = t.partida.faseDePregunta(0).startsAt - 2000;
  assert.equal(t.partida.usarPoder(g, { powerId: 'hype', useId: 'u1' }).ok, true);
  assert.equal(t.partida.usarPoder(g, { powerId: 'hype', useId: 'u1' }).repetida, true, 'el reintento del celular');
  assert.equal(g.poderesUsados, 1);
  assert.ok(t.enviados.some((e) => e.destino === 'hosts' && e.evento === 'power:used' && e.datos.group === g.numero));

  const mal = t.responder(g, 0, false);
  assert.equal(mal.hype, undefined);
  assert.equal(g.hype, true, 'sigue esperando una correcta');
  const normal = t.responder(otro, 1, true);
  const doble = t.responder(g, 1, true);
  assert.equal(doble.hype, true);
  assert.equal(doble.bonus, normal.bonus * 2);
  assert.equal(g.hype, false);
});

test('Pase 50/50: cierra un arco incorrecto de la pregunta en curso o de la próxima', () => {
  const t = partidaDePrueba();
  const [g, h] = t.grupos;
  // Usado durante un tramo: queda pendiente hasta que empieza la pregunta.
  g.poder = 'cincuenta';
  t.reloj = t.partida.faseDePregunta(0).startsAt - 3000;
  const r = t.partida.usarPoder(g, { powerId: 'cincuenta', useId: 'a' });
  assert.equal(r.closed, undefined);
  assert.equal(g.cincuenta, true);
  t.reloj = t.partida.faseDePregunta(0).startsAt;
  t.partida.empezarPregunta(0);
  const cierre = t.enviados.find((e) => e.evento === 'question:closed' && e.destino === g.numero);
  assert.ok(cierre);
  assert.notEqual(cierre.datos.lane, t.partida.preguntas[0].correctIndex);
  assert.equal(g.cincuenta, false);
  assert.deepEqual(t.partida.estadoDe(g).closed, { index: 0, lane: cierre.datos.lane });
  // Elegir el carril cerrado nunca es correcto.
  const fase = t.partida.faseDePregunta(0);
  t.reloj = fase.startsAt + fase.duration;
  assert.equal(t.partida.registrarRespuesta(g, { index: 0, lane: cierre.datos.lane, serverTime: t.reloj }).ok, true);
  assert.equal(g.respuestas.get(0).correct, false);

  // Usado en plena pregunta: se cierra enseguida y vuelve en el ack.
  h.poder = 'cincuenta';
  const p1 = t.partida.faseDePregunta(1);
  t.reloj = p1.startsAt + 1000;
  t.partida.empezarPregunta(1);
  const ya = t.partida.usarPoder(h, { powerId: 'cincuenta', useId: 'b' });
  assert.equal(ya.closed.index, 1);
  assert.notEqual(ya.closed.lane, t.partida.preguntas[1].correctIndex);
});

test('Cambio de algoritmo: más obstáculos para el top 3 (sin contar a quien lo usa), se extiende con un tope', () => {
  const t = partidaDePrueba();
  t.grupos.forEach((g, i) => (g.distanciaCorrida = 600 - i * 100));
  const [primero, , , , quinto, sexto] = t.grupos;
  t.reloj = largada(t.partida) + 5000;
  const ahora = t.reloj;

  primero.poder = 'algoritmo';
  assert.deepEqual(t.partida.usarPoder(primero, { powerId: 'algoritmo', useId: '1' }).targets, [2, 3, 4]);
  sexto.poder = 'algoritmo';
  assert.deepEqual(t.partida.usarPoder(sexto, { powerId: 'algoritmo', useId: '2' }).targets, [1, 2, 3]);
  assert.equal(t.grupos[1].algoritmoHasta, ahora + 2 * DURACION_ALGORITMO);
  assert.equal(primero.algoritmoHasta, ahora + DURACION_ALGORITMO);
  quinto.poder = 'algoritmo';
  t.partida.usarPoder(quinto, { powerId: 'algoritmo', useId: '3' });
  assert.equal(t.grupos[1].algoritmoHasta, ahora + TOPE_ALGORITMO, 'no se acumula más allá del tope');
  const avisos = t.enviados.filter((e) => e.evento === 'run:modifiers' && e.destino === 2);
  assert.equal(avisos.length, 3);
  assert.equal(avisos.at(-1).datos.extraObstacles, ahora + TOPE_ALGORITMO);
  assert.equal(t.partida.estadoDe(t.grupos[1]).extraObstacles, ahora + TOPE_ALGORITMO);
});

test('emparejar: el último cuarto de la tabla recibe el impulso (se puede desactivar)', () => {
  assert.equal(recibeImpulso(40, 40), true);
  assert.equal(recibeImpulso(31, 40), true);
  assert.equal(recibeImpulso(30, 40), false);
  assert.equal(recibeImpulso(3, 3), false, 'con menos de 4 grupos no hay cuarto');
  const t = partidaDePrueba();
  assert.equal(t.partida.rango(6, 6).catchUp, true);
  assert.equal(t.partida.rango(4, 6).catchUp, false);
  assert.equal(partidaDePrueba({ emparejar: false }).partida.rango(6, 6).catchUp, false);
});

test('predicción en el proyector: un grupo sin datos sigue avanzando unos segundos y después se atenúa', () => {
  const t = partidaDePrueba();
  const [g, h] = t.grupos;
  t.reloj = largada(t.partida) + 10_000;
  for (const x of t.grupos) {
    x.ultimoDato = t.reloj;
    x.velocidad = 10;
    x.conectado = true;
  }
  g.distanciaCorrida = 100;
  h.distanciaCorrida = 100;
  g.ultimoDato = t.reloj - 2000;
  h.ultimoDato = t.reloj - 8000;
  const pos = new Map(t.partida.posiciones().map((p) => [p[0], p]));
  assert.equal(pos.get(g.numero)[1], 120);
  assert.equal(pos.get(g.numero)[3], 1);
  assert.equal(pos.get(h.numero)[1], 140, 'la predicción tiene tope');
  assert.equal(pos.get(h.numero)[3], 0, 'sin datos hace rato: atenuado');
  assert.equal(t.partida.posiciones()[0][0], h.numero, 'ordenadas por lo que se muestra');
  // La distancia oficial no cambia: la predicción es solo para el mapa.
  assert.equal(g.distanciaTotal, 100);
});

test('la ventaja se ve en el mapa del proyector recién desde el revelado', () => {
  const t = partidaDePrueba();
  const [g] = t.grupos;
  const r = t.responder(g, 0, true);
  const fase = t.partida.faseDePregunta(0);
  t.reloj = fase.startsAt + fase.duration + 300;
  assert.equal(t.partida.posiciones().find((p) => p[0] === 1)[2], 0);
  t.reloj = fase.startsAt + fase.duration + 1500;
  assert.equal(t.partida.posiciones().find((p) => p[0] === 1)[2], r.advantageId);
  t.reloj = r.advantageUntil + 1;
  assert.equal(t.partida.posiciones().find((p) => p[0] === 1)[2], 0);
});

// ---------- Por sockets ----------

function conectar(url) {
  const s = io(url, { transports: ['websocket'], forceNew: true });
  const eventos = [];
  s.onAny((nombre, datos) => eventos.push([nombre, datos]));
  s.esperar = async (nombre, filtro = () => true, ms = 10_000) => {
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

test('un grupo usa su poder: ack, aviso al proyector, efecto en los rivales y state:sync al reconectar', { timeout: 30_000 }, async () => {
  const servidor = await iniciarServidor({ puerto: 0, archivos: 'ninguno', config: { duracionCuenta: 1, duracionTramo: 20 } });
  const sockets = [];
  try {
    const host = await conectar(servidor.url);
    const a = await conectar(servidor.url);
    const b = await conectar(servidor.url);
    sockets.push(host, a, b);
    const { code } = await host.emitWithAck('host:create_room', {});
    await a.emitWithAck('player:join', { code, groupId: 1 });
    const unidoB = await b.emitWithAck('player:join', { code, groupId: 2 });
    host.emit('host:start', {});
    await a.esperar('game:script');
    await espera(1200);
    a.emit('run:progress', { runDistance: 10, speed: 9 });
    b.emit('run:progress', { runDistance: 50, speed: 9 });
    await espera(100);

    const sala = [...servidor.salas][0];
    sala.grupos.get(1).poder = 'algoritmo';
    const r = await a.emitWithAck('player:use_power', { powerId: 'algoritmo', useId: 'z' });
    assert.equal(r.ok, true);
    assert.deepEqual(r.targets, [2]);
    assert.deepEqual((await host.esperar('power:used')).targets, [2]);
    const mod = await b.esperar('run:modifiers');
    assert.equal(mod.by, 1);
    // Reintento del mismo uso (por ejemplo, después de un corte): no vuelve a aplicarse.
    assert.equal((await a.emitWithAck('player:use_power', { powerId: 'algoritmo', useId: 'z' })).repetida, true);

    // El grupo 2 recarga: el estado trae el efecto que todavía dura.
    b.disconnect();
    const b2 = await conectar(servidor.url);
    sockets.push(b2);
    await b2.emitWithAck('player:join', { code, groupId: null, deviceToken: unidoB.deviceToken });
    const estado = await b2.esperar('state:sync');
    assert.equal(estado.extraObstacles, mod.extraObstacles);
    assert.equal(estado.power, null);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});
