import {
  BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, PlaneGeometry, ExtrudeGeometry, Shape,
  Color, BufferAttribute, MeshLambertMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Utilidades para armar modelos low-poly por código: primitivas con color por vértice
// que se unen en una sola geometría por modelo (una sola llamada de dibujo, sin texturas).

const color = new Color();

/** Pinta una geometría con un color plano por vértice y le saca las UV (no se usan). */
export function pintar(geometria, hex) {
  color.set(hex);
  const n = geometria.attributes.position.count;
  const colores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colores.set([color.r, color.g, color.b], i * 3);
  geometria.setAttribute('color', new BufferAttribute(colores, 3));
  geometria.deleteAttribute('uv');
  return geometria;
}

function ubicar(g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s } = {}) {
  if (s) g.scale(...(Array.isArray(s) ? s : [s, s, s]));
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export const caja = (w, h, d, hex, pos) => ubicar(pintar(new BoxGeometry(w, h, d), hex), pos);
export const cilindro = (rArriba, rAbajo, h, lados, hex, pos) =>
  ubicar(pintar(new CylinderGeometry(rArriba, rAbajo, h, lados), hex), pos);
export const cono = (r, h, lados, hex, pos) => ubicar(pintar(new ConeGeometry(r, h, lados), hex), pos);
export const esfera = (r, lados, hex, pos) => ubicar(pintar(new SphereGeometry(r, lados, Math.max(2, lados - 2)), hex), pos);

/**
 * Esfera con una abertura redonda hacia +z (capucha, pelo): `abertura` es el medio ángulo del hueco,
 * en radianes. Con `rx` positivo el hueco mira un poco hacia abajo (la cara y el cuello).
 */
export function casquete(r, lados, hex, { abertura, rx = 0, ...pos }) {
  const g = new SphereGeometry(r, lados, Math.max(2, lados - 2), 0, Math.PI * 2, abertura, Math.PI - abertura);
  g.rotateX(Math.PI / 2);
  return ubicar(pintar(g, hex), { rx, ...pos });
}

/** Plano de una sola cara (mira hacia +z antes de girarlo): calcos, letras, ventanillas. */
export const placa = (w, h, hex, pos) => ubicar(pintar(new PlaneGeometry(w, h), hex), pos);

/** Corazón de las redes sociales, extruido y con bisel. Ancho ≈ `ancho`, centrado en el origen, de frente a +z. */
export function corazon(ancho, profundidad, hex, pos) {
  const forma = new Shape();
  const puntos = 22;
  for (let i = 0; i < puntos; i++) {
    const t = (i / puntos) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) forma.moveTo(x, y);
    else forma.lineTo(x, y);
  }
  const k = ancho / 32;
  const bisel = profundidad * 0.35;
  const g = new ExtrudeGeometry(forma, {
    depth: (profundidad - bisel * 2) / k, bevelEnabled: true, bevelThickness: bisel / k, bevelSize: bisel / k, bevelSegments: 1,
  });
  g.scale(k, k, k);
  g.center();
  return ubicar(pintar(g, hex), pos);
}

// Letras de 5 píxeles de alto (3 de ancho, la N 5) para escribir con placas (sin texturas, así entran en una InstancedMesh).
const LETRAS = {
  N: ['1...1', '11..1', '1.1.1', '1..11', '1...1'],
  U: ['1.1', '1.1', '1.1', '1.1', '111'],
  D: ['11.', '1.1', '1.1', '1.1', '11.'],
  E: ['111', '1..', '11.', '1..', '111'],
  P: ['111', '1.1', '111', '1..', '1..'],
  R: ['111', '1.1', '11.', '1.1', '1.1'],
  O: ['111', '1.1', '1.1', '1.1', '111'],
  J: ['..1', '..1', '..1', '1.1', '111'],
  C: ['111', '1..', '1..', '1..', '111'],
  T: ['111', '.1.', '.1.', '.1.', '.1.'],
  ' ': ['...', '...', '...', '...', '...'],
};

/**
 * Texto en mayúsculas armado con placas: una por tramo horizontal de píxeles seguidos.
 * `px` es el lado de un píxel; queda centrado en el origen, de frente a +z.
 */
export function letrero(texto, px, hex, pos) {
  const glifos = [...texto].map((letra) => {
    if (!LETRAS[letra]) throw new Error(`Letra sin dibujar: ${letra}`);
    return LETRAS[letra];
  });
  const ancho = glifos.reduce((suma, g) => suma + g[0].length + 1, -1);
  const partes = [];
  let x0 = -ancho / 2;
  for (const filas of glifos) {
    filas.forEach((fila, f) => {
      for (let c = 0; c < fila.length; c++) {
        if (fila[c] !== '1') continue;
        let fin = c;
        while (fila[fin + 1] === '1') fin++;
        const largo = fin - c + 1;
        partes.push(placa(largo * px, px, hex, { x: (x0 + c + largo / 2) * px, y: (2 - f) * px }));
        c = fin;
      }
    });
    x0 += filas[0].length + 1;
  }
  return ubicar(unir(partes), pos);
}

/** Une varias partes en una sola geometría. */
export function unir(partes) {
  const lista = partes.flat().filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  const unida = mergeGeometries(lista, false);
  for (const g of lista) g.dispose();
  unida.computeBoundingSphere();
  return unida;
}

export function triangulos(geometria) {
  return (geometria.index ? geometria.index.count : geometria.attributes.position.count) / 3;
}

/**
 * Uniforme compartido de la curvatura del mundo (estilo Subway Surfers): los vértices
 * lejanos bajan en el vertex shader, sin costo extra.
 */
export const curvatura = { value: 0.0028 };

export function curvarMaterial(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCurvatura = curvatura;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float uCurvatura;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        mvPosition.y -= mvPosition.z * mvPosition.z * uCurvatura;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  material.customProgramCacheKey = () => 'curvo';
  return material;
}

/** El único material del mundo: Lambert con colores por vértice y curvatura. */
export const materialMundo = curvarMaterial(new MeshLambertMaterial({ vertexColors: true }));
