import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, SRGBColorSpace } from 'three';
import { colores3d, colores } from '../../../../../design-system/tokens.js';
import { caja, unir, materialMundo, curvarMaterial } from './kit.js';
import { fan } from './obstacles.js';

// Tienda Nude Project al final de la calle: fachada minimalista blanca y negra con vidrieras,
// cartel del drop y la cola de fans en la vereda. Origen: centro de la fachada a nivel del piso,
// mirando hacia +z (hacia el corredor que llega); ocupa z ∈ [−fondo, 0].

const { juego: J, marca: M, acento: A } = colores3d;
const ANCHO = 25; // tapa la calle, las veredas y los edificios: la calle termina en la tienda
const ALTO = 9;
const FONDO = 4;
const FUENTE = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

function fachada() {
  const negro = J.tienda;
  const blanco = M.blanco;
  const p = [
    caja(ANCHO, ALTO, FONDO, blanco, { y: ALTO / 2, z: -FONDO / 2 }),
    caja(ANCHO + 0.2, 0.5, FONDO + 0.2, negro, { y: ALTO + 0.25, z: -FONDO / 2 }), // cornisa
    caja(ANCHO, 0.6, 0.3, negro, { y: 0.3, z: 0.1 }), // zócalo
    // Puerta en el centro (carril del medio) con marco negro.
    caja(3.2, 4.0, 0.12, negro, { y: 2.0, z: 0.06 }),
    caja(2.6, 3.6, 0.14, M['cacao-profundo'], { y: 1.85, z: 0.08 }),
    caja(0.1, 3.6, 0.16, M['cacao-suave'], { y: 1.85, z: 0.09 }),
  ];
  // Vidrieras a los dos lados, cada una con una sudadera en un maniquí.
  for (const lado of [-1, 1]) {
    const x = lado * 4.6;
    p.push(caja(4.4, 3.4, 0.12, negro, { x, y: 2.3, z: 0.06 }));
    p.push(caja(4.0, 3.0, 0.14, J['cielo-arriba'], { x, y: 2.3, z: 0.08 }));
    p.push(caja(1.1, 1.2, 0.3, lado < 0 ? M.cacao : A.rosa, { x, y: 2.5, z: -0.1 })); // sudadera
    p.push(caja(0.4, 0.3, 0.3, lado < 0 ? M.cacao : A.rosa, { x, y: 3.2, z: -0.1 })); // capucha
    p.push(caja(0.1, 1.4, 0.1, negro, { x, y: 1.2, z: -0.1 }));
  }
  // Ventanas del primer piso, negras y simples.
  for (let i = -3; i <= 3; i++) p.push(caja(1.6, 1.6, 0.1, negro, { x: i * 3.2, y: 7.3, z: 0.05 }));
  return unir(p);
}

/** Fans haciendo la cola en la vereda izquierda, mirando hacia la puerta. */
function cola() {
  const partes = [];
  for (let i = 0; i < 6; i++) {
    const g = fan({ simple: true });
    g.rotateY(Math.PI / 2 + (i % 2 ? 0.2 : -0.15)); // de costado, mirando hacia la puerta
    g.translate(-2.2 - i * 0.95, 0.2, 1.4 + (i % 2) * 0.25);
    partes.push(g);
  }
  return unir(partes);
}

function cartel() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 1024;
  lienzo.height = 160;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = colores.juego.tienda;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = colores.juego['tienda-cartel'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 104px ${FUENTE}`;
  ctx.fillText('NUDE PROJECT', lienzo.width / 2, lienzo.height * 0.54, lienzo.width * 0.92);
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  const malla = new Mesh(new PlaneGeometry(10, 1.56), curvarMaterial(new MeshBasicMaterial({ map: textura })));
  malla.position.set(0, 5.7, 0.08); // entre las ventanas del primer piso y el cartel del drop
  return malla;
}

/** Cartel "DROP · QUEDA 1" colgado sobre la puerta. */
function cartelDrop() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 512;
  lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = colores.acento.mostaza;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = colores.marca.cacao;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 72px ${FUENTE}`;
  ctx.fillText('DROP · QUEDA 1', lienzo.width / 2, lienzo.height * 0.55, lienzo.width * 0.92);
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  const malla = new Mesh(new PlaneGeometry(3.2, 0.8), curvarMaterial(new MeshBasicMaterial({ map: textura })));
  malla.position.set(0, 4.45, 0.2); // justo arriba de la puerta, sin tocar el cartel con el nombre
  return malla;
}

export function crearTienda() {
  const raiz = new Group();
  raiz.add(new Mesh(fachada(), materialMundo), new Mesh(cola(), materialMundo), cartel(), cartelDrop());
  return raiz;
}
