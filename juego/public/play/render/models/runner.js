import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, SRGBColorSpace } from 'three';
import { colores3d, colorDeGrupo } from '../../../../../design-system/tokens.js';
import { caja, cilindro, esfera, casquete, unir, materialMundo, curvarMaterial } from './kit.js';

// Corredor articulado: cada parte es un grupo con el pivote en la articulación,
// para animarlo con funciones seno (sin esqueleto). Buzo con capucha en el color del grupo
// y número en la espalda. Mira hacia −z.

const { marca: M, juego: J } = colores3d;
const PIEL = J.piel;

function parte(geometria, x, y, z) {
  const pivote = new Group();
  pivote.position.set(x, y, z);
  const malla = new Mesh(geometria, materialMundo);
  pivote.add(malla);
  return pivote;
}

/**
 * Miembro de dos tramos (brazo o pierna): pivote superior → tramo → pivote medio → tramo.
 * Los tramos son cilindros y la articulación del medio (codo, rodilla) es una esfera, así al
 * doblarse no queda un hueco ni una esquina.
 */
function miembro(x, y, largo, ancho, colorArriba, colorAbajo, extremo) {
  const r = ancho / 2;
  const arriba = parte(cilindro(r, r * 0.92, largo, 8, colorArriba, { y: -largo / 2 }), x, y, 0);
  const medio = parte(
    unir([
      esfera(r * 0.92, 6, colorArriba),
      cilindro(r * 0.9, r * 0.8, largo, 8, colorAbajo, { y: -largo / 2 }),
      extremo,
    ]),
    0, -largo, 0,
  );
  arriba.add(medio);
  return { arriba, medio };
}

function texturaNumero(numero, colorTexto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = colorTexto;
  ctx.font = '800 96px "Inter Tight", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(numero), 64, 70);
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function crearCorredor(numeroGrupo) {
  const g = colorDeGrupo(numeroGrupo);
  const buzo = g.color3d;

  const raiz = new Group();
  const cadera = new Group();
  cadera.position.y = 0.95;
  raiz.add(cadera);

  const torso = parte(
    unir([
      // Buzo holgado: cilindro achatado (más ancho que profundo) con hombros redondos.
      cilindro(0.3, 0.29, 0.56, 12, buzo, { y: 0.36, s: [1, 1, 0.58] }),
      cilindro(0.21, 0.3, 0.12, 12, buzo, { y: 0.7, s: [1, 1, 0.58] }),
      esfera(0.13, 6, buzo, { x: -0.25, y: 0.6 }),
      esfera(0.13, 6, buzo, { x: 0.25, y: 0.6 }),
      caja(0.46, 0.14, 0.05, M['cacao-profundo'], { y: 0.16, z: -0.17 }), // bolsillo canguro
      cilindro(0.27, 0.27, 0.12, 12, M.cacao, { y: -0.02, s: [1, 1, 0.6] }), // cintura del pantalón
      cilindro(0.305, 0.305, 0.08, 12, M.crema, { y: 0.07, s: [1, 1, 0.6] }), // puño elástico del buzo
      // Cordones de la capucha.
      caja(0.03, 0.2, 0.03, M.crema, { x: -0.07, y: 0.58, z: -0.17 }),
      caja(0.03, 0.2, 0.03, M.crema, { x: 0.07, y: 0.58, z: -0.17 }),
    ]),
    0, 0, 0,
  );
  cadera.add(torso);

  // Cabeza redonda con la capucha puesta: una esfera abierta hacia adelante (−z) que la envuelve,
  // rellena por dentro con el pelo, y la capucha cayendo sobre la espalda.
  const cabeza = parte(
    unir([
      cilindro(0.08, 0.09, 0.12, 6, PIEL, { y: 0.02 }), // cuello
      esfera(0.18, 9, PIEL, { y: 0.24 }),
      esfera(0.205, 9, M['cacao-profundo'], { y: 0.25, z: 0.05 }), // pelo y sombra dentro de la capucha
      casquete(0.235, 12, buzo, { abertura: 1.05, rx: 0.4, y: 0.25, z: 0.03, ry: Math.PI }),
      esfera(0.15, 8, buzo, { y: 0.05, z: 0.14, s: [1.25, 0.75, 0.55] }), // capucha cayendo sobre la espalda
    ]),
    0, 0.66, 0,
  );
  torso.add(cabeza);

  const mano = () => unir([
    cilindro(0.075, 0.075, 0.05, 8, M.crema, { y: -0.31 }), // puño del buzo
    esfera(0.07, 6, PIEL, { y: -0.38 }),
  ]);
  const brazoI = miembro(-0.33, 0.6, 0.3, 0.15, buzo, buzo, mano());
  const brazoD = miembro(0.33, 0.6, 0.3, 0.15, buzo, buzo, mano());
  torso.add(brazoI.arriba, brazoD.arriba);

  // Zapatilla crema con suela cacao (se lee bien desde la cámara de atrás).
  const zapatilla = () =>
    unir([caja(0.2, 0.12, 0.34, M.crema, { y: -0.44, z: -0.06 }), caja(0.21, 0.04, 0.36, M['cacao-profundo'], { y: -0.52, z: -0.06 })]);
  const piernaI = miembro(-0.15, 0, 0.45, 0.2, M.cacao, M.cacao, zapatilla());
  const piernaD = miembro(0.15, 0, 0.45, 0.2, M.cacao, M.cacao, zapatilla());
  cadera.add(piernaI.arriba, piernaD.arriba);

  // Número del grupo en la espalda (la cámara lo ve desde atrás).
  const numero = new Mesh(
    new PlaneGeometry(0.42, 0.42),
    curvarMaterial(new MeshBasicMaterial({ map: texturaNumero(numeroGrupo, g.texto), transparent: true })),
  );
  numero.position.set(0, 0.38, 0.185);
  torso.add(numero);

  return { raiz, cadera, torso, cabeza, brazoI, brazoD, piernaI, piernaD };
}
