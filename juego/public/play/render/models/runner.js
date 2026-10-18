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

/** Miembro de dos tramos (brazo o pierna): pivote superior → tramo → pivote medio → tramo. */
function miembro(x, y, largo, ancho, colorArriba, colorAbajo, extremo) {
  const arriba = parte(caja(ancho, largo, ancho, colorArriba, { y: -largo / 2 }), x, y, 0);
  const medio = parte(unir([caja(ancho * 0.9, largo, ancho * 0.9, colorAbajo, { y: -largo / 2 }), extremo]), 0, -largo, 0);
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
      caja(0.62, 0.66, 0.34, buzo, { y: 0.33 }),
      caja(0.5, 0.14, 0.06, M['cacao-profundo'], { y: 0.12, z: -0.18 }), // bolsillo canguro
      caja(0.56, 0.12, 0.32, M.cacao, { y: -0.02 }), // cintura del pantalón
      caja(0.64, 0.08, 0.36, M.crema, { y: 0.05 }), // puño elástico del buzo
      // Cordones de la capucha.
      caja(0.03, 0.2, 0.03, M.crema, { x: -0.08, y: 0.55, z: -0.18 }),
      caja(0.03, 0.2, 0.03, M.crema, { x: 0.08, y: 0.55, z: -0.18 }),
    ]),
    0, 0, 0,
  );
  cadera.add(torso);

  // Cabeza redonda con la capucha puesta: una esfera abierta hacia adelante (−z) que la envuelve,
  // con el pelo asomando en la frente y la capucha cayendo sobre la espalda.
  const cabeza = parte(
    unir([
      cilindro(0.08, 0.09, 0.12, 6, PIEL, { y: 0.02 }), // cuello
      esfera(0.18, 10, PIEL, { y: 0.24 }),
      casquete(0.187, 10, M['cacao-profundo'], { abertura: 1.5, rx: 0.9, y: 0.25, z: 0.005, ry: Math.PI }),
      casquete(0.235, 12, buzo, { abertura: 1.05, rx: 0.4, y: 0.25, z: 0.03, ry: Math.PI }),
      caja(0.36, 0.2, 0.1, buzo, { y: 0.04, z: 0.15 }),
    ]),
    0, 0.66, 0,
  );
  torso.add(cabeza);

  const mano = esfera(0.08, 5, PIEL, { y: -0.36 });
  const brazoI = miembro(-0.38, 0.6, 0.32, 0.16, buzo, buzo, mano.clone());
  const brazoD = miembro(0.38, 0.6, 0.32, 0.16, buzo, buzo, mano);
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
  numero.position.set(0, 0.36, 0.175);
  torso.add(numero);

  return { raiz, cadera, torso, cabeza, brazoI, brazoD, piernaI, piernaD };
}
