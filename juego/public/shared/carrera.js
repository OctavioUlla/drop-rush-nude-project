import { FASES, VELOCIDAD_BASE, VELOCIDAD_MAX, ACELERACION } from './constantes.js';

// Cuentas de la carrera que comparten el celular y el proyector.

// Margen hasta que el servidor revela una pregunta (ESPERA_REVELADO + red): mientras tanto
// el bonus de esa pregunta todavía no está sumado en ninguna distancia.
const MARGEN_REVELADO = 1500;

/** Metros que corre un corredor sin chocar en sus primeros `s` segundos de carrera (la velocidad objetivo de runner.js). */
export function recorridoIdeal(s) {
  const tope = (VELOCIDAD_MAX - VELOCIDAD_BASE) / ACELERACION;
  const hasta = Math.min(Math.max(0, s), tope);
  return VELOCIDAD_BASE * hasta + 0.5 * ACELERACION * hasta * hasta + VELOCIDAD_MAX * Math.max(0, s - tope);
}

/**
 * Dónde va a terminar el que va primero si sigue así: su distancia de ahora, lo que le falta
 * correr y un bonus típico por cada pregunta que falta revelar. Ubica la tienda en el mapa del
 * proyector; cuando termina la carrera coincide con la distancia del primero.
 */
export function proyectarMeta(guion, t, distanciaPrimero) {
  const fases = guion.phases;
  const largada = fases.find((f) => f.type !== FASES.CUENTA).startsAt;
  const fin = fases.find((f) => f.type === FASES.FIN).startsAt;
  const total = (fin - largada) / 1000;
  const corrido = Math.min(total, Math.max(0, (t - largada) / 1000));
  const { base = 150, speedMax = 100 } = guion.bonus ?? {};
  const pendientes = fases.filter((f) => f.type === FASES.PREGUNTA && f.startsAt + f.duration + MARGEN_REVELADO > t).length;
  return distanciaPrimero + recorridoIdeal(total) - recorridoIdeal(corrido) + pendientes * (base + speedMax * 0.6);
}
