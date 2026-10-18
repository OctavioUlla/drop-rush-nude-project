import { colores3d } from '../../../../../design-system/tokens.js';
import { caja, cilindro, esfera, cono, casquete, placa, corazon, letrero, unir } from './kit.js';

// Obstáculos y likes. Origen: centro del frente, a nivel del piso; el modelo ocupa z ∈ [−largo, 0].
// Alto = ladrillo, bajo = mostaza, like = corazón rojo (se reconocen por color y por silueta).

const { juego: J, marca: M, acento: A } = colores3d;

export function valla() {
  const partes = [];
  // Postes redondos de cola de tienda, con base de disco y remate crema.
  for (const x of [-0.85, 0.85]) {
    partes.push(
      cilindro(0.06, 0.06, 1.2, 6, M.cacao, { x, y: 0.6, z: -0.25 }),
      cilindro(0.24, 0.27, 0.06, 8, M['cacao-profundo'], { x, y: 0.03, z: -0.25 }),
      esfera(0.09, 5, M.crema, { x, y: 1.24, z: -0.25 }),
    );
  }
  // Barras con franjas mostaza y cacao.
  for (const y of [0.75, 1.1]) {
    for (let i = 0; i < 4; i++) {
      partes.push(caja(0.425, 0.16, 0.08, i % 2 ? M.cacao : J['obstaculo-bajo'], { x: -0.6375 + i * 0.425, y, z: -0.25 }));
    }
  }
  return unir(partes);
}

/** Cajas del drop con cinta y el nombre de la marca estampado (bajo: se salta). */
export function cajaStock() {
  const c = J['obstaculo-bajo'];
  const tinta = M.cacao;
  const giro = 0.15;
  return unir([
    caja(0.9, 0.7, 0.9, c, { x: -0.35, y: 0.35, z: -0.5 }),
    caja(0.8, 0.65, 0.85, c, { x: 0.45, y: 0.325, z: -0.5, ry: giro }),
    caja(0.75, 0.6, 0.75, c, { x: 0.0, y: 1.0, z: -0.5, ry: -0.2 }),
    caja(0.92, 0.04, 0.12, tinta, { x: -0.35, y: 0.71, z: -0.5 }), // cinta
    caja(0.12, 0.04, 0.77, tinta, { x: 0.0, y: 1.3, z: -0.5, ry: -0.2 }),
    letrero('NP', 0.08, tinta, { x: -0.35, y: 0.34, z: -0.045 }),
    letrero('NP', 0.06, tinta, { x: 0.45 + 0.43 * Math.sin(giro), y: 0.34, z: -0.5 + 0.43 * Math.cos(giro), ry: giro }),
  ]);
}

/**
 * Fan filmando el drop con el celular (alto: se esquiva). Mira hacia +z, al corredor.
 * La capucha es una esfera abierta adelante que envuelve la cabeza, así la cara asoma entera.
 * `simple` baja las caras de las esferas y saca los detalles chicos (para la cola de la tienda).
 */
export function fan({ simple = false } = {}) {
  const piel = J.piel;
  const buzo = J['obstaculo-alto'];
  const z = -0.3;
  const yCabeza = 1.8;
  const lados = simple ? 6 : 8;
  const detalle = (...partes) => (simple ? [] : partes);
  return unir([
    // Piernas, zapatillas con suela y cintura.
    caja(0.2, 0.82, 0.22, M.cacao, { x: -0.12, y: 0.47, z }),
    caja(0.2, 0.82, 0.22, M.cacao, { x: 0.12, y: 0.47, z }),
    caja(0.22, 0.1, 0.32, M.crema, { x: -0.12, y: 0.09, z: z + 0.04 }),
    caja(0.22, 0.1, 0.32, M.crema, { x: 0.12, y: 0.09, z: z + 0.04 }),
    detalle(
      caja(0.23, 0.04, 0.34, M['cacao-profundo'], { x: -0.12, y: 0.02, z: z + 0.04 }),
      caja(0.23, 0.04, 0.34, M['cacao-profundo'], { x: 0.12, y: 0.02, z: z + 0.04 }),
    ),
    // Buzo: cuerpo, hombros redondeados, puño elástico, bolsillo canguro y cordones.
    caja(0.56, 0.68, 0.32, buzo, { y: 1.22, z }),
    esfera(0.15, 5, buzo, { x: -0.26, y: 1.48, z }),
    esfera(0.15, 5, buzo, { x: 0.26, y: 1.48, z }),
    caja(0.58, 0.07, 0.34, M.crema, { y: 0.9, z }),
    caja(0.38, 0.16, 0.03, M['cacao-profundo'], { y: 1.06, z: z + 0.17 }),
    detalle(
      caja(0.025, 0.18, 0.025, M.crema, { x: -0.06, y: 1.48, z: z + 0.17 }),
      caja(0.025, 0.18, 0.025, M.crema, { x: 0.06, y: 1.48, z: z + 0.17 }),
    ),
    // Brazo izquierdo colgando y el derecho levantado con el celular.
    caja(0.15, 0.58, 0.17, buzo, { x: -0.36, y: 1.2, z, rz: -0.08 }),
    esfera(0.075, 5, piel, { x: -0.38, y: 0.87, z }),
    caja(0.15, 0.42, 0.17, buzo, { x: 0.36, y: 1.36, z: z + 0.16, rx: 1.0 }),
    esfera(0.075, 5, piel, { x: 0.36, y: 1.52, z: z + 0.36 }),
    caja(0.12, 0.2, 0.03, M['cacao-profundo'], { x: 0.36, y: 1.6, z: z + 0.4 }), // celular
    placa(0.09, 0.15, M.crema, { x: 0.36, y: 1.6, z: z + 0.42 }), // pantalla (está filmando el drop)
    // Cuello, cabeza, pelo, ojos y la capucha alrededor.
    cilindro(0.07, 0.08, 0.14, 6, piel, { y: 1.6, z }),
    esfera(0.165, lados, piel, { y: yCabeza, z }),
    // Pelo y sombra dentro de la capucha: rellena el hueco entre la cabeza y la tela.
    esfera(0.19, lados, M['cacao-profundo'], { y: yCabeza + 0.01, z: z - 0.05 }),
    detalle(
      caja(0.04, 0.05, 0.02, M['cacao-profundo'], { x: -0.06, y: yCabeza + 0.01, z: z + 0.16 }),
      caja(0.04, 0.05, 0.02, M['cacao-profundo'], { x: 0.06, y: yCabeza + 0.01, z: z + 0.16 }),
    ),
    casquete(0.215, lados + 1, buzo, { abertura: 1.05, rx: 0.4, y: yCabeza + 0.01, z: z - 0.03 }),
    caja(0.34, 0.22, 0.1, buzo, { y: 1.58, z: z - 0.15 }), // capucha cayendo sobre la espalda
  ]);
}

/** Camión de reparto de Nude Project: caja cacao con el nombre de la marca atrás y a los costados. */
export function camion() {
  const carga = M.cacao;
  const tinta = M.crema;
  const oscuro = M['cacao-profundo'];
  const partes = [
    caja(2.0, 2.4, 4.4, carga, { y: 1.75, z: -2.2 }),
    caja(2.04, 0.18, 4.44, A.ladrillo, { y: 2.9, z: -2.2 }), // franjas de alto (se esquiva)
    caja(2.04, 0.18, 4.44, A.ladrillo, { y: 0.66, z: -2.2 }),
    // Cabina crema con ventanillas y parabrisas.
    caja(1.9, 1.8, 1.5, M.crema, { y: 1.45, z: -5.2 }),
    caja(1.92, 0.12, 1.52, oscuro, { y: 2.36, z: -5.2 }),
    caja(1.7, 0.7, 0.05, oscuro, { y: 1.95, z: -5.97 }),
    placa(0.8, 0.6, oscuro, { x: -0.955, y: 1.9, z: -5.3, ry: -Math.PI / 2 }),
    placa(0.8, 0.6, oscuro, { x: 0.955, y: 1.9, z: -5.3, ry: Math.PI / 2 }),
    caja(2.0, 0.3, 6.0, oscuro, { y: 0.5, z: -3.0 }),
    // Puertas traseras (lo que ve el corredor): ranura, manijas y el nombre de la marca.
    placa(0.03, 2.04, oscuro, { y: 1.75, z: 0.01 }),
    caja(0.08, 0.3, 0.06, tinta, { x: -0.14, y: 1.25, z: 0.03 }),
    caja(0.08, 0.3, 0.06, tinta, { x: 0.14, y: 1.25, z: 0.03 }),
    letrero('NUDE', 0.09, tinta, { y: 2.3, z: 0.02 }),
    letrero('PROJECT', 0.055, tinta, { y: 1.78, z: 0.02 }),
    // Costados: el nombre en grande y una línea fina, como en los camiones de reparto.
    letrero('NUDE PROJECT', 0.075, tinta, { x: -1.005, y: 1.95, z: -2.2, ry: -Math.PI / 2 }),
    letrero('NUDE PROJECT', 0.075, tinta, { x: 1.005, y: 1.95, z: -2.2, ry: Math.PI / 2 }),
    placa(3.6, 0.05, tinta, { x: -1.005, y: 1.5, z: -2.2, ry: -Math.PI / 2 }),
    placa(3.6, 0.05, tinta, { x: 1.005, y: 1.5, z: -2.2, ry: Math.PI / 2 }),
    caja(2.1, 0.18, 0.2, oscuro, { y: 0.45, z: 0.05 }), // paragolpes
    caja(0.25, 0.12, 0.05, A.ladrillo, { x: -0.8, y: 0.62, z: 0.08 }), // luces traseras
    caja(0.25, 0.12, 0.05, A.ladrillo, { x: 0.8, y: 0.62, z: 0.08 }),
  ];
  for (const z of [-0.9, -4.9]) {
    for (const x of [-0.95, 0.95]) {
      partes.push(cilindro(0.42, 0.42, 0.3, 10, oscuro, { x, y: 0.42, z, rz: Math.PI / 2 }));
      partes.push(cilindro(0.18, 0.18, 0.04, 8, M.piedra, { x: x + Math.sign(x) * 0.16, y: 0.42, z, rz: Math.PI / 2 })); // llanta
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

/** Corazón rojo de like, como el de las redes sociales (gira sobre sí mismo en el mundo). */
export function like() {
  return corazon(0.7, 0.2, J.like);
}

export const MODELOS_OBSTACULOS = { valla, caja: cajaStock, bache, fan, bot, camion };
