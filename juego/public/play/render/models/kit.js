import {
  BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, Color, BufferAttribute,
  MeshLambertMaterial,
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
