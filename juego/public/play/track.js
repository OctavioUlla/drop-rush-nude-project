import { crearRng, mezclarSemilla } from '../shared/rng.js';
import { CARRILES } from '../shared/constantes.js';

// Obstáculos y likes generados a partir de una semilla: todos los grupos
// enfrentan la misma calle en cada tramo (sección 3.3).

export const TIPOS = {
  valla: { alto: false, altura: 0.9, largo: 0.5 },
  caja: { alto: false, altura: 1.0, largo: 1.0 },
  bache: { alto: false, altura: 0.5, largo: 1.4 },
  fan: { alto: true, altura: 2.0, largo: 0.6 },
  bot: { alto: true, altura: 2.2, largo: 0.8 },
  camion: { alto: true, altura: 3.0, largo: 6.0 },
};

// `bots`: probabilidad de que una fila de un solo obstáculo sea un bot revendedor que cruza de carril.
const DIFICULTAD = {
  facil: { separacion: [17, 23], dobles: 0.25, triples: 0, bots: 0.15 },
  normal: { separacion: [13, 18], dobles: 0.45, triples: 0.1, bots: 0.25 },
  caotico: { separacion: [10, 14], dobles: 0.55, triples: 0.25, bots: 0.35 },
};

const BAJOS = ['valla', 'caja', 'bache'];
const ALTOS = ['fan', 'fan', 'camion'];

// El bot revendedor cruza al carril vecino mientras el corredor está entre 28 y 14 m de él:
// se lo ve venir y queda ~1,5 s para esquivarlo.
const CRUCE_DESDE = 28;
const CRUCE_LARGO = 14;

/**
 * Posición lateral de un obstáculo cuando el corredor está en la distancia `d`.
 * Depende solo de la distancia (no del tiempo ni de los FPS): todos los grupos ven
 * al bot moverse igual, y el choque se calcula igual que el dibujo.
 */
export function xObstaculo(o, d) {
  const x = CARRILES[o.carril];
  if (o.destino == null) return x;
  const t = Math.min(1, Math.max(0, (d - (o.z - CRUCE_DESDE)) / CRUCE_LARGO));
  return x + (CARRILES[o.destino] - x) * t * t * (3 - 2 * t);
}

/**
 * Genera las filas de un tramo entre dos distancias. Reglas:
 * - nunca los 3 carriles bloqueados por obstáculos altos (siempre hay uno libre o saltable);
 * - separación mínima entre filas, contada desde el final del obstáculo más largo.
 */
export function generarTramo(semilla, desde, hasta, dificultad = 'facil') {
  const reglas = DIFICULTAD[dificultad] ?? DIFICULTAD.facil;
  const obstaculos = [];
  const likes = [];
  let z = desde;
  let fila = 0;

  while (z < hasta) {
    const rng = crearRng(mezclarSemilla(semilla, fila++));
    const r = rng();
    const cantidad = r < reglas.triples ? 3 : r < reglas.triples + reglas.dobles ? 2 : 1;
    const carriles = barajar([0, 1, 2], rng).slice(0, cantidad);

    let largoFila = 0;
    let altos = 0;
    // Un bot revendedor va siempre solo en su fila: mientras cruza ocupa dos carriles y el tercero queda libre.
    if (cantidad === 1 && rng() < reglas.bots) {
      const carril = carriles[0];
      const destino = carril === 1 ? rng.elegir([0, 2]) : 1;
      obstaculos.push({ tipo: 'bot', carril, destino, z, ...TIPOS.bot });
      carriles.push(destino);
      largoFila = TIPOS.bot.largo;
    } else {
      for (const carril of carriles) {
        // En una fila de 3, al menos uno tiene que ser bajo (saltable).
        const debeSerBajo = cantidad === 3 && altos === 2;
        const tipo = debeSerBajo || rng() < 0.5 ? rng.elegir(BAJOS) : rng.elegir(ALTOS);
        if (TIPOS[tipo].alto) altos++;
        obstaculos.push({ tipo, carril, z, ...TIPOS[tipo] });
        largoFila = Math.max(largoFila, TIPOS[tipo].largo);
      }
    }

    // Likes en un carril libre o sobre un obstáculo bajo (para atraparlos saltando).
    const libres = [0, 1, 2].filter((c) => !carriles.includes(c));
    if (rng() < 0.7) {
      const sobreBajo = obstaculos.filter((o) => o.z === z && !o.alto);
      if (sobreBajo.length && rng() < 0.4) {
        const o = rng.elegir(sobreBajo);
        for (let i = -1; i <= 1; i++) likes.push({ carril: o.carril, z: z + i * 1.2, y: 1.2 + (1 - Math.abs(i)) * 0.6 });
      } else if (libres.length) {
        const carril = rng.elegir(libres);
        for (let i = 0; i < 5; i++) likes.push({ carril, z: z - 4 + i * 1.6, y: 0.6 });
      }
    }

    z += largoFila + rng.entre(...reglas.separacion);
  }
  return { obstaculos, likes };
}

// Fisher-Yates: un sort() con comparador aleatorio daría calles distintas según el navegador.
function barajar(lista, rng) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

/** Estado de la pista que ve un corredor: lo que tiene adelante y lo que ya pasó. */
export class Pista {
  constructor() {
    this.obstaculos = [];
    this.likes = [];
  }

  agregarTramo(semilla, desde, hasta, dificultad) {
    const t = generarTramo(semilla, desde, hasta, dificultad);
    for (const o of t.obstaculos) this.obstaculos.push({ ...o, golpeado: false, pasado: false, hundido: 0 });
    for (const l of t.likes) this.likes.push({ ...l, tomado: false, hundido: 0 });
  }

  /** Los obstáculos que todavía no se alcanzaron se hunden en el piso (al empezar una pregunta). */
  hundirDesde(distancia) {
    for (const o of this.obstaculos) if (o.z > distancia && !o.hundido) o.hundido = 0.0001;
    for (const l of this.likes) if (l.z > distancia && !l.hundido) l.hundido = 0.0001;
  }

  vaciar() {
    this.obstaculos.length = 0;
    this.likes.length = 0;
  }

  /** Descarta lo que quedó muy atrás o terminó de hundirse. */
  limpiar(distancia, dt) {
    for (const o of this.obstaculos) if (o.hundido) o.hundido = Math.min(1, o.hundido + dt * 2.5);
    for (const l of this.likes) if (l.hundido) l.hundido = Math.min(1, l.hundido + dt * 2.5);
    compactar(this.obstaculos, (o) => o.z + o.largo > distancia - 15 && o.hundido < 1);
    compactar(this.likes, (l) => l.z > distancia - 15 && l.hundido < 1);
  }
}

/** Filtra en el lugar, sin crear arreglos nuevos en cada paso (evita trabones del recolector). */
function compactar(lista, seQueda) {
  let j = 0;
  for (let i = 0; i < lista.length; i++) if (seQueda(lista[i])) lista[j++] = lista[i];
  lista.length = j;
}
