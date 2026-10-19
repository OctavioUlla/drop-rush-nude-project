import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Reloj } from '../public/shared/reloj.js';

// El reloj del celular se apoya en performance.now(), que en Android y iOS no avanza mientras el equipo duerme
// (pantalla bloqueada durante la presentación). Al desbloquearlo, la hora del servidor tiene que seguir bien.

/** Relojes falsos: `pared` es la hora real (Date.now y la del servidor) y `mono` la de performance.now(). */
function conRelojesFalsos(t, fn) {
  const reales = { now: performance.now, dateNow: Date.now };
  const r = { pared: 1_800_000_000_000, mono: 5_000 };
  performance.now = () => r.mono;
  Date.now = () => r.pared;
  t.after(() => {
    performance.now = reales.now;
    Date.now = reales.dateNow;
  });
  const avanzar = (ms) => {
    r.pared += ms;
    r.mono += ms;
  };
  // El servidor contesta la hora real a mitad del viaje de ida y vuelta (40 ms).
  const socket = {
    connected: true,
    timeout: () => ({
      emit: (_evento, _t0, ack) => {
        avanzar(20);
        const hora = r.pared;
        avanzar(20);
        ack(null, hora);
      },
    }),
  };
  return fn({ r, avanzar, reloj: new Reloj(socket) });
}

test('el reloj sigue la hora del servidor después de que el celular durmió', (t) =>
  conRelojesFalsos(t, async ({ r, avanzar, reloj }) => {
    await reloj.sincronizar();
    avanzar(15_000);
    await reloj.sincronizar(3);
    assert.ok(Math.abs(reloj.ahora() - r.pared) < 5);

    // 5 minutos con la pantalla bloqueada: la hora real avanza y performance.now() no.
    r.pared += 5 * 60_000;
    assert.ok(Math.abs(reloj.ahora() - r.pared) < 5, 'sin red, apenas despierta');
    await reloj.sincronizar();
    assert.ok(Math.abs(reloj.ahora() - r.pared) < 5, 'después de volver a sincronizar');
    avanzar(15_000);
    await reloj.sincronizar(3);
    assert.ok(Math.abs(reloj.ahora() - r.pared) < 5, 'en las sincronizaciones siguientes');
  }));
