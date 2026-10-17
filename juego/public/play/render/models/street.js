import { colores3d } from '../../../../../design-system/tokens.js';
import { caja, cilindro, unir } from './kit.js';

// Bloque de calle de Madrid: asfalto, líneas de carril, cordón, veredas, faroles y fachadas.
// Una sola geometría por bloque. Origen al principio del bloque; ocupa z ∈ [−largo, 0].

const { juego: J, marca: M } = colores3d;
const FACHADAS = [J['fachada-1'], J['fachada-2'], J['fachada-3'], J['fachada-4']];
const BORDE_CALLE = 7.1;

export function bloqueCalle(rng, largo, detalle = 1) {
  const p = [
    caja(7.6, 0.1, largo, J.asfalto, { y: -0.05, z: -largo / 2 }),
    caja(0.3, 0.25, largo, M.piedra, { x: -3.95, y: 0.08, z: -largo / 2 }),
    caja(0.3, 0.25, largo, M.piedra, { x: 3.95, y: 0.08, z: -largo / 2 }),
    caja(3.0, 0.2, largo, J.vereda, { x: -5.6, y: 0.1, z: -largo / 2 }),
    caja(3.0, 0.2, largo, J.vereda, { x: 5.6, y: 0.1, z: -largo / 2 }),
  ];
  for (let z = -1; z > -largo; z -= 4) {
    for (const x of [-1.1, 1.1]) p.push(caja(0.12, 0.02, 1.8, J['linea-carril'], { x, y: 0.01, z: z - 0.9 }));
  }
  // Un farol por vereda en el medio del bloque.
  const z = -largo / 2;
  for (const lado of [-1, 1]) {
    p.push(cilindro(0.06, 0.08, 4, 5, M['cacao-profundo'], { x: lado * 4.4, y: 2.2, z }));
    p.push(caja(0.7, 0.12, 0.25, M['cacao-profundo'], { x: lado * 4.15, y: 4.2, z }));
    p.push(caja(0.4, 0.06, 0.18, M.crema, { x: lado * 4.0, y: 4.12, z }));
  }
  for (const lado of [-1, 1]) {
    let z = 0;
    while (z > -largo + 0.5) {
      const ancho = Math.min(rng.entre(4, 8), largo + z);
      p.push(...edificio(rng, lado, z, ancho, detalle));
      z -= ancho;
    }
  }
  return unir(p);
}

/** Fachada con planta baja comercial, ventanas con balcón y cornisa. */
function edificio(rng, lado, z0, ancho, detalle) {
  const alto = rng.entre(7, 15);
  const fondo = 5;
  const color = rng.elegir(FACHADAS);
  const x = lado * (BORDE_CALLE + fondo / 2);
  const frente = lado * BORDE_CALLE;
  const zc = z0 - ancho / 2;
  const p = [
    caja(fondo, alto, ancho - 0.1, color, { x, y: alto / 2, z: zc }),
    caja(0.3, 0.3, ancho - 0.1, M.crema, { x: frente - lado * 0.1, y: alto, z: zc }),
    caja(0.1, 2.4, ancho - 0.6, M['cacao-suave'], { x: frente - lado * 0.04, y: 1.4, z: zc }),
  ];
  if (detalle <= 0) return p;

  const columnas = Math.max(1, Math.floor((ancho - 0.6) / 1.7));
  const paso = (ancho - 0.6) / columnas;
  for (let y = 3.6; y < alto - 1.2; y += 2.6) {
    for (let c = 0; c < columnas; c++) {
      const z = z0 - 0.3 - paso * (c + 0.5);
      p.push(caja(0.1, 1.4, 0.8, J.ventana, { x: frente - lado * 0.04, y, z }));
      if (detalle > 1 && rng() < 0.35) p.push(caja(0.45, 0.08, 1.1, M.crema, { x: frente - lado * 0.22, y: y - 0.72, z }));
    }
  }
  return p;
}
