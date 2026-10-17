import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarTramo, xObstaculo, Pista, TIPOS } from '../public/play/track.js';
import { Corredor } from '../public/play/runner.js';
import { recorridoIdeal, proyectarMeta } from '../public/shared/carrera.js';
import { CARRILES, FASES, VALOR_LIKE } from '../public/shared/constantes.js';
import { Grupo } from '../server/rooms.js';
import { crearGuion } from '../server/game.js';
import { cargarConfig } from '../server/config.js';

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

test('aparecen los 6 obstáculos del plan, altos y bajos', () => {
  const tipos = new Set();
  for (let semilla = 0; semilla < 50; semilla++) for (const o of generarTramo(semilla, 0, 400, 'normal').obstaculos) tipos.add(o.tipo);
  assert.deepEqual([...tipos].sort(), ['bache', 'bot', 'caja', 'camion', 'fan', 'valla']);
  assert.equal(TIPOS.bache.alto, false);
  assert.equal(TIPOS.bot.alto, true);
});

test('el bot revendedor va solo en su fila y cruza al carril vecino: siempre queda un carril libre', () => {
  let bots = 0;
  for (let semilla = 0; semilla < 300; semilla++) {
    const { obstaculos } = generarTramo(semilla, 0, 400, 'caotico');
    for (const bot of obstaculos.filter((o) => o.tipo === 'bot')) {
      bots++;
      assert.equal(obstaculos.filter((o) => o.z === bot.z).length, 1, `bot acompañado en la semilla ${semilla}`);
      assert.equal(Math.abs(bot.destino - bot.carril), 1);
    }
  }
  assert.ok(bots > 50);
});

test('el bot se mueve según la distancia del corredor (igual en todos los celulares, a cualquier FPS)', () => {
  const bot = obstaculo('bot', 0, 100, { destino: 1 });
  assert.equal(xObstaculo(bot, 0), CARRILES[0]);
  assert.equal(xObstaculo(bot, 100), CARRILES[1]);
  const medio = xObstaculo(bot, 79);
  assert.ok(medio > CARRILES[0] && medio < CARRILES[1]);
  assert.equal(xObstaculo(obstaculo('fan', 2, 50), 49), CARRILES[2]);
});

test('el bot choca a quien se queda en el carril al que cruza y deja pasar a quien lo esquiva', () => {
  const casos = [
    { nombre: 'se queda en el carril de destino', choques: 1 },
    { nombre: 'se corre al carril libre', choques: 0, gesto: (c) => c.distancia > 20 && c.carril === 1 && c.gesto('der') },
  ];
  for (const caso of casos) {
    const pista = new Pista();
    pista.obstaculos.push(obstaculo('bot', 0, 40, { destino: 1 }));
    const corredor = new Corredor();
    correrHasta(corredor, pista, 50, caso.gesto);
    assert.equal(corredor.choques, caso.choques, caso.nombre);
  }
  // Quien estaba en el carril de donde sale el bot tampoco choca: el bot ya se fue.
  const pista = new Pista();
  pista.obstaculos.push(obstaculo('bot', 0, 40, { destino: 1 }));
  const corredor = new Corredor();
  corredor.carril = 0;
  corredor.x = CARRILES[0];
  correrHasta(corredor, pista, 50);
  assert.equal(corredor.choques, 0);
});

test('el bache del algoritmo se salta', () => {
  const pista = new Pista();
  pista.obstaculos.push(obstaculo('bache', 1, 30));
  const saltando = new Corredor();
  correrHasta(saltando, pista, 40, (c) => c.distancia > 27.5 && c.saltos === 0 && c.gesto('saltar'));
  assert.equal(saltando.choques, 0);

  const pista2 = new Pista();
  pista2.obstaculos.push(obstaculo('bache', 1, 30));
  const quieto = new Corredor();
  correrHasta(quieto, pista2, 40);
  assert.equal(quieto.choques, 1);
});

test('los likes suman poca distancia en el total oficial', () => {
  const g = new Grupo(1, 'token');
  g.distanciaCorrida = 140;
  g.bonus = 200;
  g.likes = 12;
  assert.equal(g.distanciaTotal, 340 + 12 * VALOR_LIKE);
  // Un tramo entero de likes vale mucho menos que una respuesta correcta.
  assert.ok(15 * VALOR_LIKE < cargarConfig().bonusAcierto / 5);
});

test('recorridoIdeal coincide con lo que corre el corredor sin chocar', () => {
  const corredor = new Corredor();
  corredor.corriendo = true;
  corredor.velocidad = recorridoIdeal(1 / 60) * 60; // ya lanzado, como en plena carrera
  for (let i = 0; i < 60 * 30; i++) corredor.paso(1 / 60, null);
  const ideal = recorridoIdeal(30);
  assert.ok(Math.abs(corredor.distancia - ideal) / ideal < 0.02, `${corredor.distancia} vs ${ideal}`);
  // Un tramo de 15 s ≈ 140 m (sección 7).
  assert.ok(Math.abs(recorridoIdeal(15) - 140) < 6);
});

test('la tienda del mapa queda adelante del primero y coincide con él al llegar', () => {
  const config = cargarConfig();
  const preguntas = Array.from({ length: 6 }, () => ({ timeLimit: 15, options: ['a', 'b', 'c'] }));
  const guion = crearGuion(config, preguntas, 1_000_000);
  const largada = guion.phases.find((f) => f.type !== FASES.CUENTA).startsAt;
  const fin = guion.phases.find((f) => f.type === FASES.FIN).startsAt;

  const alPrincipio = proyectarMeta(guion, largada, 0);
  // 6 × 30 s + 10 s de sprint corriendo, más 6 respuestas correctas típicas.
  assert.ok(alPrincipio > recorridoIdeal(190) + 6 * config.bonusAcierto);
  assert.ok(proyectarMeta(guion, (largada + fin) / 2, 600) > 600);
  assert.equal(proyectarMeta(guion, fin + 5000, 1234), 1234);
});
