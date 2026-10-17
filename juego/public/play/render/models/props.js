import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, SRGBColorSpace } from 'three';
import { colores3d, colores } from '../../../../../design-system/tokens.js';
import { caja, cilindro, unir, materialMundo, curvarMaterial } from './kit.js';

// Arcos de respuesta: uno por carril, con la letra y el texto corto de la opción.
// El texto se dibuja en un CanvasTexture que se regenera solo cuando cambia (al empezar
// cada pregunta o al cambiar de carril), nunca en cada cuadro.

const { juego: J } = colores3d;
const ANCHO = 2.0;
const ALTO = 3.7;
const PANEL = { ancho: 1.9, alto: 0.95 };
const FUENTE = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

function marco() {
  const borde = J['arco-borde'];
  return unir([
    caja(0.16, ALTO, 0.16, J.arco, { x: -ANCHO / 2, y: ALTO / 2 }),
    caja(0.16, ALTO, 0.16, J.arco, { x: ANCHO / 2, y: ALTO / 2 }),
    caja(0.3, 0.1, 0.3, borde, { x: -ANCHO / 2, y: 0.05 }),
    caja(0.3, 0.1, 0.3, borde, { x: ANCHO / 2, y: 0.05 }),
    caja(ANCHO + 0.16, 0.14, 0.2, borde, { y: ALTO }),
    caja(ANCHO + 0.16, 0.1, 0.2, borde, { y: ALTO - PANEL.alto - 0.12 }),
  ]);
}

/** Cruz que cierra el carril en las preguntas de 2 opciones (el tercer carril es una pared). */
function cruz() {
  const c = J['obstaculo-alto'];
  const largo = Math.hypot(ANCHO, ALTO - PANEL.alto - 0.2);
  const angulo = Math.atan2(ALTO - PANEL.alto - 0.2, ANCHO);
  const yMedio = (ALTO - PANEL.alto - 0.2) / 2;
  return unir([
    caja(largo, 0.18, 0.08, c, { y: yMedio, rz: angulo }),
    caja(largo, 0.18, 0.08, c, { y: yMedio, rz: -angulo }),
    cilindro(0.05, 0.05, 0.1, 6, c, { y: 0.05 }),
  ]);
}

function dibujarPanel(ctx, { letra, texto, activo, cerrado }) {
  const { width: w, height: h } = ctx.canvas;
  const fondo = cerrado ? colores.acento.ladrillo : activo ? colores.acento.mostaza : colores.marca.cacao;
  const tinta = cerrado ? colores.marca.crema : activo ? colores.marca.cacao : colores.marca.crema;
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = tinta;
  ctx.textBaseline = 'middle';
  if (cerrado) {
    ctx.textAlign = 'center';
    ctx.font = `900 ${h * 0.7}px ${FUENTE}`;
    ctx.fillText('✕', w / 2, h * 0.54);
    return;
  }
  ctx.textAlign = 'center';
  ctx.font = `900 ${texto ? h * 0.62 : h * 0.8}px ${FUENTE}`;
  ctx.fillText(letra, texto ? h * 0.42 : w / 2, h * 0.55);
  if (!texto) return;
  // Texto corto (hasta 20 letras) en 1 o 2 renglones a la derecha de la letra.
  ctx.textAlign = 'left';
  const x = h * 0.82;
  const max = w - x - h * 0.08;
  let tamano = h * 0.3;
  ctx.font = `800 ${tamano}px ${FUENTE}`;
  const renglones = partir(ctx, texto, max);
  if (renglones.length > 2 || renglones.some((r) => ctx.measureText(r).width > max)) {
    tamano = h * 0.22;
    ctx.font = `800 ${tamano}px ${FUENTE}`;
  }
  const finales = partir(ctx, texto, max).slice(0, 3);
  const alto = tamano * 1.1;
  finales.forEach((r, i) => ctx.fillText(r, x, h / 2 + (i - (finales.length - 1) / 2) * alto, max));
}

function partir(ctx, texto, max) {
  const renglones = [];
  let actual = '';
  for (const palabra of String(texto).split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(prueba).width > max) {
      renglones.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) renglones.push(actual);
  return renglones;
}

/** Un arco de respuesta. Origen: centro del carril a nivel del piso. */
export function crearArco() {
  const raiz = new Group();
  raiz.add(new Mesh(marco(), materialMundo));
  const pared = new Mesh(cruz(), materialMundo);
  raiz.add(pared);

  const lienzo = document.createElement('canvas');
  lienzo.width = 512;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  const panel = new Mesh(new PlaneGeometry(PANEL.ancho, PANEL.alto), curvarMaterial(new MeshBasicMaterial({ map: textura })));
  panel.position.set(0, ALTO - PANEL.alto / 2 - 0.07, 0.02);
  raiz.add(panel);

  const ultimo = { letra: null, texto: null, activo: null, cerrado: null };
  return {
    raiz,
    /** Redibuja el cartel solo si cambió algo (se llama en cada cuadro). */
    mostrar(datos) {
      pared.visible = Boolean(datos.cerrado);
      if (ultimo.letra === datos.letra && ultimo.texto === datos.texto && ultimo.activo === datos.activo && ultimo.cerrado === datos.cerrado) return;
      Object.assign(ultimo, datos);
      dibujarPanel(ctx, datos);
      textura.needsUpdate = true;
    },
  };
}
