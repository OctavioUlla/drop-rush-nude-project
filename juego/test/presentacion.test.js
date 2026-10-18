import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { Presentacion } from '../server/presentacion.js';
import { CONFIG_POR_DEFECTO } from '../server/config.js';
import { iniciarServidor } from '../server/index.js';
import { correrPresentacion } from '../tools/bots.js';

// Fase 4 de la presentación: hype colectivo, votación en vivo y la etapa de la sala (PLANIFICACION de la
// presentación, secciones 2.1, 2.3 y 6.4).

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Presentación con un reloj que se mueve a mano y una sala con `conectados` grupos. */
function crear(conectados = 4) {
  const enviados = [];
  let t = 1_000_000;
  const grupos = Array.from({ length: conectados }, (_, i) => ({ numero: i + 1 }));
  const sala = { conectados: () => conectados };
  const p = new Presentacion({ config: CONFIG_POR_DEFECTO, sala, enviar: (destino, evento, datos) => enviados.push({ destino, evento, datos }), ahora: () => t });
  return { p, grupos, enviados, avanzar: (ms) => (t += ms), ahora: () => t, ultimo: (evento) => enviados.filter((e) => e.evento === evento).at(-1)?.datos };
}

/** Lanza el hype y lo pone a llenarse (sin esperar la cuenta regresiva). */
function lanzar(c) {
  const r = c.p.prepararHype(3);
  c.avanzar(r.empiezaEn - c.ahora());
  c.p.empezarHype();
  return r;
}

test('la meta del hype sale de los grupos conectados y la cuenta regresiva es la misma para todos', () => {
  const c = crear(12);
  const r = c.p.prepararHype(3);
  assert.equal(r.ok, true);
  assert.equal(r.meta, 12 * CONFIG_POR_DEFECTO.hypeToquesPorGrupo);
  assert.ok(r.empiezaEn >= c.ahora() + 3000, 'la cuenta dura al menos los 3 s pedidos');
  assert.deepEqual(c.ultimo('pres:hype:cuenta'), { empiezaEn: r.empiezaEn, meta: r.meta, conectados: 12 });
  assert.equal(c.p.prepararHype(3).ok, false, 'no se lanza dos veces a la vez');
  // Antes de que termine la cuenta, los toques no suman.
  assert.equal(c.p.registrarToques(c.grupos[0], { total: 5 }).ok, false);
  c.p.detener();
});

test('cada celular suma como máximo 8 toques por segundo, con el total acumulado', () => {
  const c = crear(4);
  lanzar(c);
  const [g] = c.grupos;
  // Un auto-clicker que manda 100 toques de golpe solo suma la ráfaga.
  assert.equal(c.p.registrarToques(g, { total: 100 }).aceptados, CONFIG_POR_DEFECTO.hypeRafaga);
  // Lo que se pasó del tope se pierde: el siguiente envío cuenta desde 100.
  c.avanzar(1000);
  assert.equal(c.p.registrarToques(g, { total: 110 }).aceptados, 8);
  // El mismo total repetido (o uno viejo fuera de orden) no suma dos veces.
  c.avanzar(1000);
  assert.equal(c.p.registrarToques(g, { total: 110 }).aceptados, 0);
  assert.equal(c.p.registrarToques(g, { total: 104 }).aceptados, 0);
  // Un envío perdido lo corrige el siguiente (el total es absoluto).
  c.avanzar(500);
  assert.equal(c.p.registrarToques(g, { total: 116 }).aceptados, 6);
  assert.equal(c.p.hype.toques, 16 + 8 + 6);
  assert.deepEqual(c.p.sumando(), [1]);
  assert.equal(c.p.estadoCelular(g).hype.aporte, 30);
  assert.equal(c.p.estadoCelular(g).hype.informados, 116, 'el celular que recarga sigue desde el total que mandó');
  c.p.detener();
});

test('al llegar a la meta sale el drop con el aporte de cada grupo, y el presentador lo puede completar', () => {
  const c = crear(2);
  lanzar(c);
  const [a, b] = c.grupos;
  for (let s = 0; s < 4; s++) {
    c.avanzar(1000);
    c.p.registrarToques(a, { total: (s + 1) * 8 });
    c.p.registrarToques(b, { total: (s + 1) * 2 });
  }
  assert.equal(c.p.hype.fase, 'llenando');
  assert.deepEqual(c.p.sumando(), [1, 2]);
  c.avanzar(1000);
  c.p.registrarToques(a, { total: 42 });
  // 42 + 8 = 50 de 50: drop, y los toques que llegan después ya no suman.
  const drop = c.ultimo('pres:hype:drop');
  assert.equal(c.p.hype.fase, 'drop');
  assert.deepEqual(drop.aportes, { 1: 42, 2: 8 });
  assert.equal(drop.grupos, 2);
  assert.equal(c.p.registrarToques(b, { total: 30 }).ok, false);
  assert.deepEqual(c.p.estadoProyector().hype.resultado, drop, 'el resultado queda guardado para el debate');

  // Hype estancado: el presentador lo completa y el drop sale igual.
  const d = crear(40);
  lanzar(d);
  d.p.registrarToques(d.grupos[0], { total: 3 });
  assert.equal(d.p.completarHype(), true);
  assert.equal(d.ultimo('pres:hype:drop').toques, 1000);
  assert.equal(d.ultimo('pres:hype:drop').grupos, 1);
  assert.equal(d.p.completarHype(), false);
  // Se puede volver a lanzar (ensayos); el resultado anterior se conserva hasta el nuevo drop.
  assert.equal(d.p.prepararHype(3).ok, true);
  assert.equal(d.p.estadoProyector().hype.resultado.toques, 1000);
  d.p.detener();
});

test('votación: un voto por grupo que se puede cambiar mientras está abierta, y el resultado queda guardado', () => {
  const c = crear(3);
  const [a, b, x] = c.grupos;
  const datos = { id: 'precio', pregunta: '¿Pagarías 90 €?', opciones: ['Sí', 'No', 'Depende'] };
  assert.equal(c.p.votar(a, { id: 'precio', opcion: 0 }).ok, false, 'sin abrir no se vota');
  assert.equal(c.p.abrirVotacion({ ...datos, opciones: ['Sí'] }).ok, false, 'hacen falta al menos 2 opciones');
  assert.equal(c.p.abrirVotacion(datos).ok, true);
  assert.deepEqual(c.ultimo('pres:votacion:pregunta'), { ...datos, abierta: true });

  assert.equal(c.p.votar(a, { id: 'precio', opcion: 0, seq: 1 }).ok, true);
  assert.equal(c.p.votar(b, { id: 'precio', opcion: 1, seq: 1 }).ok, true);
  assert.equal(c.p.votar(x, { id: 'precio', opcion: 3, seq: 1 }).ok, false, 'opción inválida');
  assert.equal(c.p.votar(x, { id: 'otra', opcion: 0, seq: 1 }).ok, false, 'otra votación');
  // Cambia su voto; un reintento viejo que llega después no lo pisa.
  c.p.votar(b, { id: 'precio', opcion: 2, seq: 5 });
  assert.equal(c.p.votar(b, { id: 'precio', opcion: 1, seq: 3 }).vieja, true);
  assert.deepEqual(c.p.conteo().votos, [1, 0, 1]);
  assert.equal(c.p.conteo().votaron, 2);
  assert.equal(c.ultimo('pres:votacion:conteo').votaron, 2, 'el proyector recibe el conteo en vivo');
  assert.equal(c.p.estadoCelular(b).votacion.voto, 2, 'el celular que recarga ve su voto');

  assert.equal(c.p.cerrarVotacion(), true);
  assert.equal(c.p.votar(x, { id: 'precio', opcion: 0, seq: 9 }).motivo, 'closed');
  assert.equal(c.ultimo('pres:votacion:pregunta').abierta, false);
  // Reabrir la misma pregunta conserva los votos; otra pregunta empieza de cero.
  c.p.abrirVotacion(datos);
  assert.equal(c.p.conteo().votaron, 2);
  c.p.abrirVotacion({ ...datos, id: 'otra' });
  assert.equal(c.p.conteo().votaron, 0);
  c.p.reiniciar();
  assert.equal(c.p.conteo(), null);
});

test('la presentación pasa los celulares a su etapa, se los devuelve al juego y solo el proyector la maneja', { timeout: 30_000 }, async () => {
  const servidor = await iniciarServidor({ puerto: 0, archivos: 'ninguno', config: { duracionCuenta: 1 } });
  const sockets = [];
  const conectar = async () => {
    const s = io(servidor.url, { transports: ['websocket'], forceNew: true });
    s.eventos = [];
    s.onAny((n, d) => s.eventos.push([n, d]));
    sockets.push(s);
    await new Promise((r) => s.on('connect', r));
    return s;
  };
  const ultimo = (s, evento) => s.eventos.filter(([n]) => n === evento).at(-1)?.[1];
  try {
    const pres = await conectar();
    const celular = await conectar();
    const { code } = await pres.emitWithAck('host:create_room', {});
    // Un celular que entra a una sala del juego (sin presentación) va directo al juego.
    await celular.emitWithAck('player:join', { code, groupId: 3 });
    assert.equal(ultimo(celular, 'pres:estado').etapa, 'juego');

    assert.equal((await celular.emitWithAck('pres:hype:preparar', {})).ok, false, 'un celular no lanza el hype');
    const estado = await pres.emitWithAck('pres:conectar', { etapa: 'presentacion' });
    assert.equal(estado.etapa, 'presentacion');
    await espera(100);
    assert.equal(ultimo(celular, 'pres:etapa').etapa, 'presentacion');

    // Hype con un solo grupo: el celular recibe la cuenta y el proyector, el drop con su aporte.
    const r = await pres.emitWithAck('pres:hype:preparar', { segundos: 0 });
    assert.equal(r.meta, CONFIG_POR_DEFECTO.hypeToquesPorGrupo);
    await espera(r.empiezaEn - Date.now() + 150);
    celular.emit('pres:hype:toques', { total: 10 });
    await espera(150);
    assert.equal(ultimo(pres, 'pres:hype:nivel').toques, 10);
    assert.deepEqual(ultimo(pres, 'pres:hype:nivel').grupos, [3]);
    assert.equal((await pres.emitWithAck('pres:hype:completar')).ok, true);
    await espera(100);
    assert.deepEqual(ultimo(celular, 'pres:hype:drop').aportes, { 3: 10 });

    // Votación: el voto llega con ack y el proyector recibe el conteo.
    await pres.emitWithAck('pres:votacion:abrir', { id: 'v', pregunta: '¿Sí o no?', opciones: ['Sí', 'No'] });
    assert.equal((await celular.emitWithAck('pres:votacion:votar', { id: 'v', opcion: 1, seq: 1 })).ok, true);
    await espera(100);
    assert.deepEqual(ultimo(pres, 'pres:votacion:conteo').votos, [0, 1]);

    // Un celular que recarga recibe la etapa, el resultado del hype y su voto.
    const otro = await conectar();
    const { deviceToken } = ultimo(celular, 'player:joined');
    celular.disconnect();
    await otro.emitWithAck('player:join', { code, deviceToken });
    const sync = ultimo(otro, 'pres:estado');
    assert.equal(sync.etapa, 'presentacion');
    assert.equal(sync.hype.resultado.aportes[3], 10);
    assert.equal(sync.votacion.voto, 1);

    // El proyector del juego que vuelve a la sala (/host/ con la misma clave) recibe lo guardado para el debate.
    const host = await conectar();
    assert.equal((await host.emitWithAck('host:hello', { code, hostKey: 'otra' })).ok, false, 'otra clave no sirve');
    await host.emitWithAck('host:hello', { code, hostKey: [...servidor.salas][0].claveHost });
    assert.equal(ultimo(host, 'pres:estado').hype.resultado.toques, CONFIG_POR_DEFECTO.hypeToquesPorGrupo);
    // Al arrancar la partida, los celulares vuelven al juego aunque la presentación no lo haya pedido.
    host.emit('host:start', {});
    await espera(150);
    assert.equal(ultimo(otro, 'pres:etapa').etapa, 'juego');
  } finally {
    sockets.forEach((s) => s.disconnect());
    await servidor.cerrar();
  }
});

test('40 bots: el hype se llena entre todos sin pasar el tope y la votación cuenta el último voto de cada uno', { timeout: 60_000 }, async () => {
  const servidor = await iniciarServidor({ puerto: 0, archivos: 'ninguno' });
  try {
    const r = await correrPresentacion({ url: servidor.url, bots: 40, log: () => {} });
    assert.equal(r.toquesHype >= r.metaHype, true, 'salió el drop');
    assert.equal(r.gruposSumando, 40);
    assert.ok(r.botsMasRapidosQueElTope > 0, 'algunos bots tocan más rápido que el tope');
    assert.ok(r.aporteMaximo <= r.topeAporte, `ningún celular pasa el tope (${r.aporteMaximo} de ${r.topeAporte})`);
    assert.equal(r.votaron, 40);
    assert.equal(r.votos, r.votosEsperados);
    assert.equal(r.ok, true);
  } finally {
    await servidor.cerrar();
  }
});
