// Generador aleatorio con semilla (mulberry32). Lo usan el celular y el servidor,
// así todos los grupos ven exactamente la misma calle a partir de la misma semilla.

export function crearRng(semilla) {
  let a = semilla >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.entre = (min, max) => min + rng() * (max - min);
  rng.entero = (min, max) => Math.floor(rng.entre(min, max + 1));
  rng.elegir = (lista) => lista[Math.floor(rng() * lista.length)];
  return rng;
}

/** Combina dos números en una semilla nueva (para derivar semillas por fila o por tramo). */
export function mezclarSemilla(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b >>> 0, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}
