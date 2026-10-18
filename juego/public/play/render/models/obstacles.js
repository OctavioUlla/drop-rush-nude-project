import { colores3d } from '../../../../../design-system/tokens.js';
import { caja, cilindro, esfera, cono, unir } from './kit.js';

// Obstáculos y likes. Origen: centro del frente, a nivel del piso; el modelo ocupa z ∈ [−largo, 0].
// Alto = ladrillo, bajo = mostaza, like = rosa (se reconocen por color y por silueta).

const { juego: J, marca: M, acento: A } = colores3d;

export function valla() {
  const partes = [
    caja(0.1, 0.9, 0.1, M.cacao, { x: -0.85, y: 0.45, z: -0.25 }),
    caja(0.1, 0.9, 0.1, M.cacao, { x: 0.85, y: 0.45, z: -0.25 }),
    caja(0.5, 0.06, 0.5, M.cacao, { x: -0.85, y: 0.03, z: -0.25 }),
    caja(0.5, 0.06, 0.5, M.cacao, { x: 0.85, y: 0.03, z: -0.25 }),
  ];
  // Barras con franjas mostaza y cacao.
  for (const y of [0.55, 0.8]) {
    for (let i = 0; i < 4; i++) {
      partes.push(caja(0.425, 0.16, 0.08, i % 2 ? M.cacao : J['obstaculo-bajo'], { x: -0.6375 + i * 0.425, y, z: -0.25 }));
    }
  }
  return unir(partes);
}

export function cajaStock() {
  const c = J['obstaculo-bajo'];
  return unir([
    caja(0.9, 0.55, 0.9, c, { x: -0.35, y: 0.275, z: -0.5 }),
    caja(0.8, 0.5, 0.85, c, { x: 0.45, y: 0.25, z: -0.5, ry: 0.15 }),
    caja(0.75, 0.45, 0.75, c, { x: 0.0, y: 0.775, z: -0.5, ry: -0.2 }),
    caja(0.92, 0.04, 0.12, M.cacao, { x: -0.35, y: 0.56, z: -0.5 }),
    caja(0.12, 0.04, 0.77, M.cacao, { x: 0.0, y: 1.0, z: -0.5, ry: -0.2 }),
  ]);
}

export function fan() {
  const piel = J.piel;
  const buzo = J['obstaculo-alto'];
  return unir([
    caja(0.22, 0.85, 0.24, M.cacao, { x: -0.13, y: 0.425, z: -0.3 }),
    caja(0.22, 0.85, 0.24, M.cacao, { x: 0.13, y: 0.425, z: -0.3 }),
    caja(0.24, 0.1, 0.34, M.crema, { x: -0.13, y: 0.05, z: -0.28 }), // zapatillas
    caja(0.24, 0.1, 0.34, M.crema, { x: 0.13, y: 0.05, z: -0.28 }),
    caja(0.6, 0.75, 0.34, buzo, { y: 1.22, z: -0.3 }),
    caja(0.16, 0.6, 0.18, buzo, { x: -0.38, y: 1.25, z: -0.3 }),
    caja(0.16, 0.45, 0.18, buzo, { x: 0.36, y: 1.38, z: -0.12, rx: 1.0 }),
    esfera(0.2, 6, piel, { y: 1.8, z: -0.3 }),
    caja(0.46, 0.3, 0.42, buzo, { y: 1.86, z: -0.36 }),
    caja(0.12, 0.2, 0.03, M['cacao-profundo'], { x: 0.36, y: 1.55, z: 0.02 }), // celular
    caja(0.09, 0.15, 0.01, M.crema, { x: 0.36, y: 1.55, z: 0.04 }), // pantalla (está filmando el drop)
  ]);
}

export function camion() {
  const carga = J['obstaculo-alto'];
  const partes = [
    caja(2.0, 2.4, 4.4, carga, { y: 1.75, z: -2.2 }),
    caja(2.02, 0.35, 4.42, M.crema, { y: 2.2, z: -2.2 }),
    caja(1.9, 1.8, 1.5, M.crema, { y: 1.45, z: -5.2 }),
    caja(1.7, 0.7, 0.05, M['cacao-profundo'], { y: 1.95, z: -5.97 }),
    caja(2.0, 0.3, 6.0, M['cacao-profundo'], { y: 0.5, z: -3.0 }),
    // Puertas traseras de la caja (lo que ve el corredor): franja crema y manijas.
    caja(0.04, 2.2, 0.06, M['cacao-profundo'], { y: 1.75, z: 0.02 }),
    caja(1.9, 0.3, 0.05, M.crema, { y: 1.2, z: 0.02 }),
    caja(0.08, 0.35, 0.08, M.crema, { x: -0.15, y: 1.75, z: 0.05 }),
    caja(0.08, 0.35, 0.08, M.crema, { x: 0.15, y: 1.75, z: 0.05 }),
    caja(2.1, 0.18, 0.2, M['cacao-profundo'], { y: 0.45, z: 0.05 }), // paragolpes
    caja(0.25, 0.12, 0.05, A.ladrillo, { x: -0.8, y: 0.62, z: 0.06 }), // luces traseras
    caja(0.25, 0.12, 0.05, A.ladrillo, { x: 0.8, y: 0.62, z: 0.06 }),
  ];
  for (const z of [-0.9, -4.9]) {
    for (const x of [-0.95, 0.95]) {
      partes.push(cilindro(0.42, 0.42, 0.3, 8, M['cacao-profundo'], { x, y: 0.42, z, rz: Math.PI / 2 }));
    }
  }
  return unir(partes);
}

/**
 * Bache del algoritmo: pozo en el piso del que asoma un gráfico de barras que baja, cruzado por
 * una flecha roja que se hunde en el pozo (bajo: se salta). Las barras y la flecha están paradas
 * de frente al corredor para que se lean desde lejos y no solo un manchón en el piso.
 */
export function bache() {
  const borde = J['obstaculo-bajo'];
  const partes = [
    caja(1.5, 0.04, 1.2, M['cacao-profundo'], { y: 0.02, z: -0.7 }),
    caja(1.7, 0.12, 0.14, borde, { y: 0.06, z: -0.07 }),
    caja(1.7, 0.12, 0.14, borde, { y: 0.06, z: -1.33 }),
  ];
  // Barras del gráfico, cada una más baja que la anterior.
  for (const [x, alto] of [[-0.48, 0.62], [0, 0.42], [0.48, 0.22]]) {
    partes.push(caja(0.34, alto, 0.2, M.crema, { x, y: alto / 2, z: -0.8 }));
  }
  // Flecha que cae de arriba a la izquierda hacia el pozo, delante de las barras.
  const [x0, y0, x1, y1] = [-0.68, 0.78, 0.36, 0.34];
  const largo = Math.hypot(x1 - x0, y1 - y0);
  const angulo = Math.atan2(y1 - y0, x1 - x0);
  const [dx, dy] = [Math.cos(angulo), Math.sin(angulo)];
  partes.push(caja(largo, 0.11, 0.08, A.ladrillo, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: -0.5, rz: angulo }));
  partes.push(cono(0.17, 0.28, 4, A.ladrillo, {
    x: x1 + dx * 0.12, y: y1 + dy * 0.12, z: -0.5, rz: angulo - Math.PI / 2, s: [1, 1, 0.45],
  }));
  return unir(partes);
}

/** Bot revendedor: robot de cajas con antena, ojos que brillan y muchas bolsas (alto: se esquiva). */
export function bot() {
  const cuerpo = J['obstaculo-alto'];
  const metal = M['cacao-profundo'];
  return unir([
    caja(0.9, 0.3, 0.6, metal, { y: 0.15, z: -0.4 }), // base con orugas
    caja(0.75, 0.9, 0.5, cuerpo, { y: 0.75, z: -0.4 }),
    caja(0.5, 0.3, 0.04, M.crema, { y: 0.85, z: -0.13 }), // pantalla del pecho
    caja(0.12, 0.2, 0.3, metal, { y: 1.3, z: -0.4 }), // cuello
    caja(0.7, 0.5, 0.5, cuerpo, { y: 1.6, z: -0.4 }),
    caja(0.16, 0.1, 0.04, A.mostaza, { x: -0.15, y: 1.65, z: -0.13 }),
    caja(0.16, 0.1, 0.04, A.mostaza, { x: 0.15, y: 1.65, z: -0.13 }),
    cilindro(0.025, 0.025, 0.35, 4, metal, { y: 2.02, z: -0.4 }),
    esfera(0.07, 5, A.mostaza, { y: 2.22, z: -0.4 }),
    // Brazos abiertos cargando bolsas de compras (las que revende).
    caja(0.14, 0.6, 0.14, metal, { x: -0.5, y: 0.95, z: -0.4, rz: -0.35 }),
    caja(0.14, 0.6, 0.14, metal, { x: 0.5, y: 0.95, z: -0.4, rz: 0.35 }),
    caja(0.32, 0.38, 0.14, M.crema, { x: -0.68, y: 0.5, z: -0.4 }),
    caja(0.3, 0.34, 0.14, M.cacao, { x: -0.62, y: 0.42, z: -0.22 }),
    caja(0.32, 0.38, 0.14, M.crema, { x: 0.68, y: 0.5, z: -0.4 }),
    caja(0.3, 0.34, 0.14, A.rosa, { x: 0.62, y: 0.42, z: -0.22 }),
  ]);
}

export function like() {
  const c = J.like;
  return unir([
    esfera(0.2, 6, c, { x: -0.14, y: 0.08 }),
    esfera(0.2, 6, c, { x: 0.14, y: 0.08 }),
    cono(0.3, 0.42, 6, c, { y: -0.16, rz: Math.PI, s: [1.08, 1, 0.75] }),
  ]);
}

export const MODELOS_OBSTACULOS = { valla, caja: cajaStock, bache, fan, bot, camion };
