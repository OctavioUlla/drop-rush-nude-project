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
  const piel = 0xc68863;
  const buzo = J['obstaculo-alto'];
  return unir([
    caja(0.22, 0.85, 0.24, M.cacao, { x: -0.13, y: 0.425, z: -0.3 }),
    caja(0.22, 0.85, 0.24, M.cacao, { x: 0.13, y: 0.425, z: -0.3 }),
    caja(0.6, 0.75, 0.34, buzo, { y: 1.22, z: -0.3 }),
    caja(0.16, 0.6, 0.18, buzo, { x: -0.38, y: 1.25, z: -0.3 }),
    caja(0.16, 0.45, 0.18, buzo, { x: 0.36, y: 1.38, z: -0.12, rx: 1.0 }),
    esfera(0.2, 6, piel, { y: 1.8, z: -0.3 }),
    caja(0.46, 0.3, 0.42, buzo, { y: 1.86, z: -0.36 }),
    caja(0.12, 0.2, 0.03, M['cacao-profundo'], { x: 0.36, y: 1.55, z: 0.02 }), // celular
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
  ];
  for (const z of [-0.9, -4.9]) {
    for (const x of [-0.95, 0.95]) {
      partes.push(cilindro(0.42, 0.42, 0.3, 8, M['cacao-profundo'], { x, y: 0.42, z, rz: Math.PI / 2 }));
    }
  }
  return unir(partes);
}

export function like() {
  const c = J.like;
  return unir([
    esfera(0.2, 6, c, { x: -0.14, y: 0.08 }),
    esfera(0.2, 6, c, { x: 0.14, y: 0.08 }),
    cono(0.3, 0.42, 6, c, { y: -0.16, rz: Math.PI, s: [1.08, 1, 0.75] }),
  ]);
}

export const MODELOS_OBSTACULOS = { valla, caja: cajaStock, fan, camion };
