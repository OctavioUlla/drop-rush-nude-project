import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarTramo, Pista } from '../public/play/track.js';
import { Corredor } from '../public/play/runner.js';
import { iniciarServidor } from '../server/index.js';
import { correrBots } from '../tools/bots.js';

test('la misma semilla genera exactamente la misma calle', () => {
  const a = generarTramo(1234, 30, 500, 'normal');
  const b = generarTramo(1234, 30, 500, 'normal');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, generarTramo(4321, 30, 500, 'normal'));
});

test('nunca se bloquean los 3 carriles con obstáculos altos', () => {
  for (let semilla = 0; semilla < 300; semilla++) {
    const { obstaculos } = generarTramo(semilla, 0, 400, 'caotico');
    const filas = new Map();
    for (const o of obstaculos) filas.set(o.z, [...(filas.get(o.z) ?? []), o]);
    for (const fila of filas.values()) {
      assert.ok(fila.length <= 3);
      if (fila.length === 3) assert.ok(fila.some((o) => !o.alto), `fila sin salida en la semilla ${semilla}`);
    }
  }
});

function correrHasta(corredor, pista, distancia, alPaso) {
  corredor.corriendo = true;
  while (corredor.distancia < distancia) {
    alPaso?.(corredor);
    corredor.paso(1 / 60, pista);
  }
}

test('un obstáculo bajo se salta y uno alto hace tropezar', () => {
  const pista = new Pista();
  pista.obstaculos.push({ tipo: 'valla', carril: 1, z: 30, alto: false, altura: 0.9, largo: 0.5, golpeado: false, pasado: false, hundido: 0 });
  const saltando = new Corredor();
  correrHasta(saltando, pista, 40, (c) => c.distancia > 27.5 && c.saltos === 0 && c.gesto('saltar'));
  assert.equal(saltando.choques, 0);
  assert.equal(saltando.esquivados, 1);

  const pista2 = new Pista();
  pista2.obstaculos.push({ tipo: 'fan', carril: 1, z: 30, alto: true, altura: 2, largo: 0.6, golpeado: false, pasado: false, hundido: 0 });
  const quieto = new Corredor();
  correrHasta(quieto, pista2, 40, (c) => c.distancia > 27.5 && c.saltos === 0 && c.gesto('saltar'));
  assert.equal(quieto.choques, 1);
  assert.ok(quieto.invulnerable > 0 || quieto.frenado >= 0);
});

test('40 bots con microcortes: todas las respuestas llegan y se cuentan una sola vez', { timeout: 90_000 }, async () => {
  const servidor = await iniciarServidor({
    puerto: 0,
    archivos: 'ninguno',
    config: { duracionCuenta: 1, duracionSprint: 2, toleranciaRespuestaTardia: 10 },
  });
  try {
    const resumen = await correrBots({
      url: servidor.url,
      bots: 40,
      empezar: true,
      preguntas: 3,
      tramo: 3,
      pregunta: 3,
      cortes: 1,
      corteMin: 1,
      corteMax: 4,
      log: () => {},
    });
    assert.equal(resumen.respuestasOk, 120, JSON.stringify(resumen));
    assert.equal(resumen.resultadosRecibidos, 120, JSON.stringify(resumen));
    assert.equal(resumen.respuestasRechazadas, 0);
    assert.ok(resumen.cortes >= 40);
    // Los poderes ganados por racha también se usan con reintento hasta el ack (Fase 3).
    assert.equal(resumen.poderesUsados + resumen.poderesRechazados, resumen.poderesGanados, JSON.stringify(resumen));
    // Ningún grupo quedó contado dos veces ni perdido.
    const [sala] = servidor.salas;
    for (const g of sala.grupos.values()) assert.equal(g.respuestas.size, 3);
  } finally {
    await servidor.cerrar();
  }
});
