import { colores, grupos as coloresGrupos } from '../../../design-system/tokens.js';
import { crearRng } from '../shared/rng.js';
import { proyectarMeta } from '../shared/carrera.js';

// Mapa de la carrera en el proyector (sección 4.1): una calle de Madrid vista de costado,
// de la salida a la tienda Nude Project, con un marcador por grupo (número grande y su color).
// Canvas 2D: con 40 grupos se lee mejor que una vista 3D y no le pide nada a la compu del aula.
// Los marcadores que quedan muy juntos se apilan en filas; si no entran, se agrupan en "+N".

const C = colores;
const FUENTE = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
const FILAS = 5;

export class Mapa {
  constructor(lienzo) {
    this.lienzo = lienzo;
    this.ctx = lienzo.getContext('2d');
    this.marcadores = new Map(); // número → { x, y, fila, conectado } (posición dibujada, animada)
    this.meta = null; // distancia de la tienda (animada)
    this.edificios = edificios();
    this.ancho = 0;
    this.alto = 0;
    new ResizeObserver(() => this.redimensionar()).observe(lienzo);
  }

  redimensionar() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.ancho = this.lienzo.clientWidth;
    this.alto = this.lienzo.clientHeight;
    this.lienzo.width = Math.round(this.ancho * dpr);
    this.lienzo.height = Math.round(this.alto * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Olvida los marcadores (nueva partida). */
  reiniciar() {
    this.marcadores.clear();
    this.meta = null;
  }

  /**
   * Dibuja un cuadro. `posiciones`: [[número, distancia, ventaja, conectado]] ordenadas
   * de la primera a la última; `guion`: datos del guion; `t`: hora del servidor.
   */
  dibujar(posiciones, guion, t, dt) {
    const { ctx, ancho: w, alto: h } = this;
    if (!w || !h) return;
    const suave = Math.min(1, dt * 6);

    const primero = posiciones[0]?.[1] ?? 0;
    const objetivo = Math.max(primero, guion ? proyectarMeta(guion, t, primero) : primero, 1);
    this.meta = this.meta == null ? objetivo : this.meta + (objetivo - this.meta) * Math.min(1, dt * 2);

    // Geometría de la calle.
    const margen = Math.max(16, w * 0.03);
    const anchoTienda = Math.min(w * 0.16, h * 0.55);
    const x0 = margen + 26;
    const x1 = w - margen - anchoTienda;
    const calleArriba = h * 0.38;
    const calleAbajo = h - margen * 0.6;
    const r = Math.max(10, Math.min((calleAbajo - calleArriba) / (FILAS * 2.3), w / 38));

    ctx.clearRect(0, 0, w, h);
    this.dibujarFondo(calleArriba, calleAbajo, x0);
    this.dibujarTienda(x1, calleArriba, calleAbajo, anchoTienda, margen);
    this.dibujarFalta(posiciones, x0, x1, margen);

    // Marcadores: x según la distancia; filas estables para que no salten de una a otra.
    const filaY = (f) => calleArriba + r * 1.3 + f * ((calleAbajo - calleArriba - r * 2.6) / (FILAS - 1));
    const ultimaX = new Array(FILAS).fill(Infinity);
    const grupos = new Map(); // número del marcador visible → cuántos se agruparon en él
    const ubicados = [];
    for (const [numero, distancia, , conectado] of posiciones) {
      const x = x0 + Math.min(1, distancia / this.meta) * (x1 - x0);
      let m = this.marcadores.get(numero);
      if (!m) {
        m = { x, y: filaY(0), fila: 0 };
        this.marcadores.set(numero, m);
      }
      m.conectado = conectado;
      const cabe = (f) => ultimaX[f] - x >= r * 1.9;
      let fila = cabe(m.fila) ? m.fila : -1;
      for (let f = 0; fila < 0 && f < FILAS; f++) if (cabe(f)) fila = f;
      if (fila < 0) {
        // No entra en ninguna fila: se suma al marcador más cercano que se ve.
        const cercano = ubicados.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
        grupos.set(cercano.numero, (grupos.get(cercano.numero) ?? 0) + 1);
        m.oculto = true;
        m.x += (x - m.x) * suave;
        continue;
      }
      m.oculto = false;
      m.fila = fila;
      ultimaX[fila] = x;
      m.x += (x - m.x) * suave;
      m.y += (filaY(fila) - m.y) * suave;
      ubicados.push({ numero, x });
    }

    // Se dibujan del último al primero, así el que va adelante queda encima.
    for (let i = posiciones.length - 1; i >= 0; i--) {
      const numero = posiciones[i][0];
      const m = this.marcadores.get(numero);
      if (m.oculto) continue;
      this.dibujarMarcador(numero, m, r, i === 0, grupos.get(numero));
    }
  }

  dibujarFondo(arriba, abajo, x0) {
    const { ctx, ancho: w } = this;
    // Fachadas de Madrid detrás de la calle.
    for (const e of this.edificios) {
      ctx.fillStyle = e.color;
      const ancho = e.ancho * w;
      const alto = e.alto * arriba;
      ctx.fillRect(e.x * w, arriba - alto, ancho + 1, alto);
      ctx.fillStyle = C.juego.ventana;
      ctx.globalAlpha = 0.18;
      for (let y = arriba - alto + 10; y < arriba - 14; y += 18) {
        for (let x = e.x * w + 6; x < e.x * w + ancho - 10; x += 14) ctx.fillRect(x, y, 6, 9);
      }
      ctx.globalAlpha = 1;
    }
    // Vereda y asfalto.
    ctx.fillStyle = C.juego.vereda;
    ctx.fillRect(0, arriba - 8, w, 8);
    ctx.fillStyle = C.juego.asfalto;
    ctx.fillRect(0, arriba, w, abajo - arriba);
    ctx.strokeStyle = C.juego['linea-carril'];
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    for (const k of [1 / 3, 2 / 3]) {
      const y = arriba + (abajo - arriba) * k;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // Línea de salida a cuadros.
    const lado = (abajo - arriba) / 10;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? C.marca.crema : C.marca['cacao-profundo'];
        ctx.fillRect(x0 - lado * (2 - j) - 4, arriba + i * lado, lado, lado);
      }
    }
  }

  dibujarTienda(x, arriba, abajo, ancho, margen) {
    const { ctx } = this;
    const alto = (abajo - arriba) * 0.5 + arriba * 0.75;
    const y = abajo - alto;
    const izq = x + margen * 0.4;
    const w = ancho;
    ctx.fillStyle = C.marca.blanco;
    ctx.fillRect(izq, y, w, alto);
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.juego.tienda;
    ctx.strokeRect(izq, y, w, alto);
    // Cartel con el nombre.
    ctx.fillStyle = C.juego.tienda;
    const cartelAlto = alto * 0.16;
    ctx.fillRect(izq, y, w, cartelAlto);
    ctx.fillStyle = C.juego['tienda-cartel'];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${cartelAlto * 0.5}px ${FUENTE}`;
    ctx.fillText('NUDE PROJECT', izq + w / 2, y + cartelAlto * 0.55, w * 0.9);
    // Puerta y vidriera con la última sudadera.
    ctx.fillStyle = C.marca['cacao-profundo'];
    ctx.fillRect(izq + w * 0.12, abajo - alto * 0.42, w * 0.3, alto * 0.42);
    ctx.fillStyle = C.juego['cielo-arriba'];
    ctx.fillRect(izq + w * 0.52, abajo - alto * 0.5, w * 0.38, alto * 0.32);
    ctx.fillStyle = C.marca.cacao;
    ctx.fillRect(izq + w * 0.64, abajo - alto * 0.44, w * 0.14, alto * 0.16);
    // "Queda 1", como el cartel del design system.
    ctx.font = `900 ${Math.max(14, w * 0.13)}px ${FUENTE}`;
    const texto = 'QUEDA 1';
    const tw = ctx.measureText(texto).width + 20;
    const th = Math.max(14, w * 0.13) * 1.5;
    ctx.save();
    ctx.translate(izq + w / 2, y - th * 0.7);
    ctx.rotate(-0.05);
    ctx.fillStyle = C.acento.mostaza;
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    ctx.fillStyle = C.marca.cacao;
    ctx.fillText(texto, 0, 2);
    ctx.restore();
  }

  /** Barra de arriba: cuánto le falta al primero para llegar a la tienda. */
  dibujarFalta(posiciones, x0, x1, margen) {
    const { ctx } = this;
    const primero = posiciones[0];
    if (!primero) return;
    const falta = Math.max(0, Math.round(this.meta - primero[1]));
    const y = margen * 0.9;
    ctx.fillStyle = C.marca.cacao;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 ${Math.max(14, this.alto * 0.055)}px ${FUENTE}`;
    ctx.fillText(falta > 0 ? `Al grupo ${primero[0]} le faltan ${falta} m para la tienda` : `¡El grupo ${primero[0]} llega a la tienda!`, x0 - 26, y, x1 - x0);
    const yb = y + Math.max(14, this.alto * 0.055) * 1.35;
    ctx.fillStyle = C.marca.arena;
    ctx.fillRect(x0 - 26, yb, x1 - x0 + 26, 8);
    ctx.fillStyle = coloresGrupos[primero[0] - 1].color;
    ctx.fillRect(x0 - 26, yb, (x1 - x0 + 26) * Math.min(1, primero[1] / this.meta), 8);
  }

  dibujarMarcador(numero, m, r, primero, agrupados) {
    const { ctx } = this;
    const c = coloresGrupos[numero - 1];
    ctx.globalAlpha = m.conectado ? 1 : 0.4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * (primero ? 1.15 : 1), 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.fill();
    ctx.lineWidth = primero ? 4 : 2;
    ctx.strokeStyle = primero ? C.acento.mostaza : C.marca.crema;
    ctx.stroke();
    ctx.fillStyle = c.texto;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${r * (numero > 9 ? 1.05 : 1.25)}px ${FUENTE}`;
    ctx.fillText(String(numero), m.x, m.y + r * 0.06);
    if (agrupados) {
      const bx = m.x + r * 0.85;
      const by = m.y - r * 0.85;
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = C.marca.cacao;
      ctx.fill();
      ctx.fillStyle = C.marca.crema;
      ctx.font = `800 ${r * 0.6}px ${FUENTE}`;
      ctx.fillText(`+${agrupados}`, bx, by + r * 0.04);
    }
    ctx.globalAlpha = 1;
  }
}

/** Siluetas de fachadas siempre iguales (con semilla fija), en proporción al ancho del mapa. */
function edificios() {
  const rng = crearRng(1906);
  const tonos = [C.juego['fachada-1'], C.juego['fachada-2'], C.juego['fachada-3'], C.juego['fachada-4']];
  const lista = [];
  for (let x = 0; x < 1; ) {
    const ancho = rng.entre(0.04, 0.08);
    lista.push({ x, ancho, alto: rng.entre(0.3, 0.62), color: rng.elegir(tonos) });
    x += ancho;
  }
  return lista;
}
