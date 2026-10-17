import { colores, grupos as coloresGrupos } from '../../../design-system/tokens.js';
import { crearRng } from '../shared/rng.js';
import { proyectarMeta } from '../shared/carrera.js';

// Mapa de la carrera en el proyector (sección 4.1): una calle de Madrid vista de costado,
// de la salida a la tienda Nude Project, con una ficha por grupo (número grande y su color).
// Canvas 2D: con 40 grupos se lee mejor que una vista 3D y no le pide nada a la compu del aula.
// El fondo (cielo, fachadas, vereda, calle y tienda) se dibuja una sola vez por tamaño en un
// lienzo aparte; en cada cuadro solo se dibujan las marcas de distancia y las fichas.
// Las fichas que quedan muy juntas se apilan en filas; si no entran, se agrupan en "+N".

const C = colores;
const FUENTE = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
const FILAS = 5;
const PASOS_REGLA = [50, 100, 200, 250, 500, 1000];

export class Mapa {
  /** `elementos`: { lienzo, falta, progreso } — la cabecera es HTML para usar la tipografía del design system. */
  constructor({ lienzo, falta, progreso }) {
    this.lienzo = lienzo;
    this.ctx = lienzo.getContext('2d');
    this.elFalta = falta;
    this.elProgreso = progreso;
    this.fondo = document.createElement('canvas');
    this.marcadores = new Map(); // número → { x, y, fila, vx, conectado, oculto } (posición dibujada, animada)
    this.meta = null; // distancia de la tienda (animada)
    this.textoFalta = '';
    this.ancho = 0;
    this.alto = 0;
    this.dpr = 1;
    new ResizeObserver(() => this.redimensionar()).observe(lienzo);
    // Si la tipografía termina de cargar después, se redibuja el fondo con ella.
    document.fonts?.ready.then(() => this.dibujarFondo());
  }

  redimensionar() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.ancho = this.lienzo.clientWidth;
    this.alto = this.lienzo.clientHeight;
    for (const l of [this.lienzo, this.fondo]) {
      l.width = Math.round(this.ancho * this.dpr);
      l.height = Math.round(this.alto * this.dpr);
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dibujarFondo();
  }

  /** Olvida las fichas (nueva partida). */
  reiniciar() {
    this.marcadores.clear();
    this.meta = null;
    this.textoFalta = '';
  }

  /** Medidas de la escena, en proporción al tamaño del lienzo. */
  get geometria() {
    const w = this.ancho;
    const h = this.alto;
    const vereda = h * 0.42; // borde de arriba de la vereda (debajo de las fachadas)
    const calle = vereda + h * 0.06;
    const regla = Math.max(22, h * 0.07);
    const abajo = h - regla;
    const anchoTienda = Math.min(w * 0.2, h * 0.62);
    const x0 = Math.max(48, w * 0.06);
    const x1 = w - anchoTienda - Math.max(12, w * 0.015);
    // Las filas tienen que quedar separadas al menos una ficha y un poco.
    const lado = Math.max(14, Math.min((abajo - calle) / (1.8 + (FILAS - 1) * 1.15), w / 24));
    return { w, h, vereda, calle, abajo, regla, anchoTienda, x0, x1, lado };
  }

  /**
   * Dibuja un cuadro. `posiciones`: [[número, distancia, ventaja, conectado]] ordenadas
   * de la primera a la última; `guion`: datos del guion; `t`: hora del servidor.
   */
  dibujar(posiciones, guion, t, dt) {
    const { ctx } = this;
    const g = this.geometria;
    if (!g.w || !g.h) return;
    const suave = Math.min(1, dt * 6);

    const primero = posiciones[0]?.[1] ?? 0;
    const objetivo = Math.max(primero, guion ? proyectarMeta(guion, t, primero) : primero, 1);
    this.meta = this.meta == null ? objetivo : this.meta + (objetivo - this.meta) * Math.min(1, dt * 2);
    this.actualizarCabecera(posiciones[0]);

    ctx.clearRect(0, 0, g.w, g.h);
    ctx.drawImage(this.fondo, 0, 0, g.w, g.h);
    this.dibujarRegla(g);

    // Fichas: x según la distancia; filas estables para que no salten de una a otra.
    const { calle, abajo, lado, x0, x1 } = g;
    const filaY = (f) => calle + lado * 0.85 + f * ((abajo - calle - lado * 1.7) / (FILAS - 1));
    const ultimaX = new Array(FILAS).fill(Infinity);
    const agrupados = new Map(); // número de la ficha visible → cuántas se agruparon en ella
    const ubicados = [];
    for (const [numero, distancia, , conectado] of posiciones) {
      const x = x0 + Math.min(1, distancia / this.meta) * (x1 - x0);
      let m = this.marcadores.get(numero);
      if (!m) {
        m = { x, y: filaY(0), fila: 0, vx: 0 };
        this.marcadores.set(numero, m);
      }
      m.conectado = conectado;
      const antes = m.x;
      m.x += (x - m.x) * suave;
      m.vx += ((m.x - antes) / Math.max(dt, 1e-3) - m.vx) * Math.min(1, dt * 3);

      const cabe = (f) => ultimaX[f] - x >= lado * 1.12;
      let fila = cabe(m.fila) ? m.fila : -1;
      for (let f = 0; fila < 0 && f < FILAS; f++) if (cabe(f)) fila = f;
      if (fila < 0) {
        // No entra en ninguna fila: se suma a la ficha más cercana que se ve.
        const cercano = ubicados.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
        agrupados.set(cercano.numero, (agrupados.get(cercano.numero) ?? 0) + 1);
        m.oculto = true;
        continue;
      }
      m.oculto = false;
      m.fila = fila;
      ultimaX[fila] = x;
      m.y += (filaY(fila) - m.y) * suave;
      ubicados.push({ numero, x });
    }

    // Primero sombras y estelas, después las fichas del último al primero (el que va adelante queda encima).
    for (let i = posiciones.length - 1; i >= 0; i--) {
      const m = this.marcadores.get(posiciones[i][0]);
      if (!m.oculto) this.dibujarEstela(posiciones[i][0], m, lado);
    }
    for (let i = posiciones.length - 1; i >= 0; i--) {
      const numero = posiciones[i][0];
      const m = this.marcadores.get(numero);
      if (!m.oculto) this.dibujarFicha(numero, m, lado, i === 0, agrupados.get(numero));
    }
  }

  actualizarCabecera(primero) {
    const falta = primero ? Math.max(0, Math.round(this.meta - primero[1])) : null;
    const texto = primero ? `${primero[0]}:${falta}` : '';
    if (texto !== this.textoFalta) {
      this.textoFalta = texto;
      if (!primero) this.elFalta.replaceChildren();
      else {
        const c = coloresGrupos[primero[0] - 1];
        const ficha = document.createElement('span');
        ficha.className = 'np-ficha';
        ficha.style.setProperty('--g', c.color);
        ficha.style.setProperty('--gt', c.texto);
        ficha.textContent = primero[0];
        const resto = document.createElement('span');
        resto.innerHTML = falta > 0 ? `va primero · le faltan <b>${falta} m</b>` : 'llega a la tienda';
        this.elFalta.replaceChildren(ficha, resto);
      }
    }
    const avance = primero ? Math.min(1, primero[1] / this.meta) : 0;
    this.elProgreso.style.width = `${avance * 100}%`;
    if (primero) this.elProgreso.style.background = coloresGrupos[primero[0] - 1].color;
  }

  // ---------- Fondo (una vez por tamaño) ----------
  dibujarFondo() {
    const g = this.geometria;
    if (!g.w || !g.h) return;
    const ctx = this.fondo.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, g.w, g.h);
    const rng = crearRng(1906);

    // Cielo con degradado, como el del runner.
    const cielo = ctx.createLinearGradient(0, 0, 0, g.vereda);
    cielo.addColorStop(0, C.juego['cielo-arriba']);
    cielo.addColorStop(1, C.marca.crema);
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, g.w, g.vereda);

    // Dos planos de edificios: los del fondo esfumados por la niebla, los de adelante con detalle.
    ctx.globalAlpha = 0.45;
    for (let x = -10; x < g.w; ) {
      const ancho = rng.entre(0.05, 0.1) * g.w;
      const alto = rng.entre(0.55, 0.9) * g.vereda;
      ctx.fillStyle = C.juego.niebla;
      ctx.fillRect(x, g.vereda - alto, ancho + 1, alto);
      ctx.fillStyle = C.juego['fachada-2'];
      ctx.fillRect(x, g.vereda - alto, ancho + 1, 3);
      x += ancho;
    }
    ctx.globalAlpha = 1;
    const tonos = [C.juego['fachada-1'], C.juego['fachada-2'], C.juego['fachada-3'], C.juego['fachada-4']];
    for (let x = -rng.entre(0, 40); x < g.x1 + 10; ) {
      const ancho = rng.entre(0.07, 0.12) * g.w;
      const alto = rng.entre(0.42, 0.72) * g.vereda;
      fachada(ctx, x, g.vereda, Math.min(ancho, g.x1 + 30 - x), alto, rng.elegir(tonos), rng);
      x += ancho;
    }

    // Vereda con cordón, faroles y árboles.
    ctx.fillStyle = C.juego.vereda;
    ctx.fillRect(0, g.vereda, g.w, g.calle - g.vereda);
    ctx.fillStyle = C.marca.piedra;
    ctx.fillRect(0, g.calle - 4, g.w, 4);
    const paso = Math.max(90, g.w * 0.09);
    for (let x = g.x0 + paso * 0.5, i = 0; x < g.x1 - 30; x += paso / 2, i++) {
      if (i % 2) arbol(ctx, x, g.vereda + (g.calle - g.vereda) * 0.6, g.vereda * 0.075);
      else farol(ctx, x, g.vereda + (g.calle - g.vereda) * 0.55, g.vereda * 0.3);
    }

    // Calle: asfalto con un leve degradado y líneas de carril.
    const asfalto = ctx.createLinearGradient(0, g.calle, 0, g.abajo);
    asfalto.addColorStop(0, C.juego.asfalto);
    asfalto.addColorStop(1, mezclar(C.juego.asfalto, C.marca['cacao-profundo'], 0.35));
    ctx.fillStyle = asfalto;
    ctx.fillRect(0, g.calle, g.w, g.abajo - g.calle);
    ctx.strokeStyle = C.juego['linea-carril'];
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.28;
    ctx.setLineDash([26, 22]);
    for (const k of [1 / 3, 2 / 3]) {
      const y = Math.round(g.calle + (g.abajo - g.calle) * k);
      ctx.beginPath();
      ctx.moveTo(g.x0, y);
      ctx.lineTo(g.x1, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // Cordón de abajo y franja de la regla.
    ctx.fillStyle = C.marca.piedra;
    ctx.fillRect(0, g.abajo, g.w, 4);
    ctx.fillStyle = C.marca.arena;
    ctx.fillRect(0, g.abajo + 4, g.w, g.regla - 4);

    // Salida y llegada a cuadros, cruzando la calle.
    cuadros(ctx, g.x0 - 14, g.calle, 14, g.abajo - g.calle);
    cuadros(ctx, g.x1, g.calle, 14, g.abajo - g.calle);
    cartelito(ctx, 'SALIDA', g.x0 - 7, g.calle - 10, Math.max(11, g.h * 0.03), C.marca.cacao, C.marca.crema);

    tienda(ctx, g);
  }

  /** Marcas de distancia debajo de la calle (cambian con la escala, por eso van en cada cuadro). */
  dibujarRegla(g) {
    const { ctx } = this;
    const largo = g.x1 - g.x0;
    const paso = PASOS_REGLA.find((p) => (p / this.meta) * largo >= 90) ?? PASOS_REGLA.at(-1);
    const tamano = Math.max(11, g.regla * 0.42);
    ctx.font = `700 ${tamano}px ${FUENTE}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.marca['cacao-suave'];
    for (let d = paso; d < this.meta * 0.97; d += paso) {
      const x = g.x0 + (d / this.meta) * largo;
      if (x > g.x1 - 90) break;
      ctx.fillRect(x - 1, g.abajo + 4, 2, g.regla * 0.22);
      ctx.fillText(`${d} m`, x, g.abajo + g.regla * 0.62);
    }
    ctx.fillStyle = C.marca.cacao;
    ctx.font = `900 ${tamano}px ${FUENTE}`;
    ctx.fillText('0', g.x0, g.abajo + g.regla * 0.62);
    ctx.fillText(`${Math.round(this.meta)} m`, g.x1 + 7, g.abajo + g.regla * 0.62);
  }

  // ---------- Fichas ----------
  dibujarEstela(numero, m, lado) {
    const { ctx } = this;
    const c = coloresGrupos[numero - 1];
    ctx.globalAlpha = m.conectado ? 1 : 0.35;
    // Sombra en el asfalto.
    ctx.fillStyle = 'rgba(46, 25, 20, 0.35)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + lado * 0.58, lado * 0.5, lado * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Estela de velocidad en el color del grupo, más larga cuanto más rápido se mueve la ficha.
    const largo = Math.min(lado * 2.4, Math.max(0, m.vx) * 0.9);
    if (largo > 4) {
      const grad = ctx.createLinearGradient(m.x - largo - lado / 2, 0, m.x, 0);
      grad.addColorStop(0, transparente(c.color));
      grad.addColorStop(1, c.color);
      ctx.fillStyle = grad;
      ctx.globalAlpha *= 0.55;
      ctx.fillRect(m.x - largo - lado / 2, m.y - lado * 0.16, largo + lado / 2, lado * 0.12);
      ctx.fillRect(m.x - largo * 0.7 - lado / 2, m.y + lado * 0.08, largo * 0.7 + lado / 2, lado * 0.1);
    }
    ctx.globalAlpha = 1;
  }

  dibujarFicha(numero, m, lado, primero, agrupados) {
    const { ctx } = this;
    const c = coloresGrupos[numero - 1];
    const s = lado * (primero ? 1.12 : 1);
    const x = m.x - s / 2;
    const y = m.y - s / 2;
    ctx.globalAlpha = m.conectado ? 1 : 0.35;
    // Ficha cuadrada como np-ficha, con borde crema (o mostaza para el primero).
    ctx.fillStyle = primero ? C.acento.mostaza : C.marca.crema;
    redondeado(ctx, x - 3, y - 3, s + 6, s + 6, s * 0.16);
    ctx.fill();
    ctx.fillStyle = c.color;
    redondeado(ctx, x, y, s, s, s * 0.12);
    ctx.fill();
    ctx.fillStyle = c.texto;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${s * (numero > 9 ? 0.56 : 0.66)}px ${FUENTE}`;
    ctx.fillText(String(numero), m.x, m.y + s * 0.04);
    if (primero) {
      // "1.º" pegado a la derecha de la ficha (arriba lo taparía la fila de encima).
      const tamano = Math.max(11, s * 0.34);
      ctx.font = `900 ${tamano}px ${FUENTE}`;
      const ancho = ctx.measureText('1.º').width + tamano * 0.9;
      cartelito(ctx, '1.º', x + s + 3 + ancho / 2, m.y + tamano * 0.72, tamano, C.acento.mostaza, C.marca.cacao);
    }
    if (agrupados) {
      const r = s * 0.3;
      const bx = x + s;
      const by = y;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = C.marca.cacao;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.marca.crema;
      ctx.stroke();
      ctx.fillStyle = C.marca.crema;
      ctx.font = `800 ${r * 0.95}px ${FUENTE}`;
      ctx.fillText(`+${agrupados}`, bx, by + r * 0.06);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Piezas del fondo ----------

/** Fachada de Madrid: planta baja comercial con toldo, ventanas con balcón y cornisa. */
function fachada(ctx, x, base, ancho, alto, color, rng) {
  const y = base - alto;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, ancho + 1, alto);
  // Cornisa y medianera.
  ctx.fillStyle = C.marca.crema;
  ctx.fillRect(x - 2, y, ancho + 4, Math.max(3, alto * 0.035));
  ctx.fillStyle = 'rgba(46, 25, 20, 0.12)';
  ctx.fillRect(x + ancho - 2, y, 2, alto);
  // Planta baja: vidriera oscura y toldo a rayas.
  const pb = alto * 0.2;
  ctx.fillStyle = C.marca['cacao-suave'];
  ctx.fillRect(x + ancho * 0.1, base - pb * 0.85, ancho * 0.8, pb * 0.85);
  const toldo = rng() < 0.5 ? C.marca.crema : C.acento.mostaza;
  const rayas = Math.max(3, Math.round(ancho / 12));
  for (let i = 0; i < rayas; i++) {
    ctx.fillStyle = i % 2 ? toldo : C.marca.cacao;
    ctx.fillRect(x + ancho * 0.08 + (i * ancho * 0.84) / rayas, base - pb, (ancho * 0.84) / rayas + 0.5, pb * 0.22);
  }
  // Pisos de ventanas altas con balcón.
  const columnas = Math.max(2, Math.round(ancho / 26));
  const anchoVentana = (ancho * 0.7) / columnas;
  const altoPiso = Math.max(18, alto * 0.16);
  for (let py = y + alto * 0.08; py + altoPiso < base - pb - 4; py += altoPiso) {
    for (let c = 0; c < columnas; c++) {
      const vx = x + ancho * 0.15 + c * (ancho * 0.7) / columnas + anchoVentana * 0.18;
      const vw = anchoVentana * 0.64;
      ctx.fillStyle = C.juego.ventana;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(vx, py + altoPiso * 0.12, vw, altoPiso * 0.62);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.marca.crema;
      ctx.fillRect(vx - 2, py + altoPiso * 0.74, vw + 4, 2);
    }
  }
}

function farol(ctx, x, y, alto) {
  ctx.fillStyle = C.marca['cacao-profundo'];
  ctx.fillRect(x - 1.5, y - alto, 3, alto);
  ctx.fillRect(x - 1.5, y - alto, alto * 0.18, 3);
  ctx.fillStyle = C.acento.mostaza;
  ctx.beginPath();
  ctx.arc(x + alto * 0.18, y - alto + 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function arbol(ctx, x, y, r) {
  ctx.fillStyle = C.marca['cacao-suave'];
  ctx.fillRect(x - 2, y - r * 1.4, 4, r * 1.4);
  ctx.fillStyle = mezclar(C.acento.bosque, C.marca.crema, 0.25);
  ctx.beginPath();
  ctx.arc(x, y - r * 1.7, r, 0, Math.PI * 2);
  ctx.arc(x - r * 0.6, y - r * 1.35, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.6, y - r * 1.35, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function cuadros(ctx, x, y, ancho, alto) {
  const lado = ancho / 2;
  const filas = Math.ceil(alto / lado);
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? C.marca.crema : C.marca['cacao-profundo'];
      ctx.fillRect(x + j * lado, y + i * lado, lado, Math.min(lado, y + alto - (y + i * lado)));
    }
  }
}

/** Etiqueta chica con fondo, centrada en x y apoyada en y (abajo). */
function cartelito(ctx, texto, x, y, tamano, fondo, tinta) {
  ctx.font = `900 ${tamano}px ${FUENTE}`;
  const w = ctx.measureText(texto).width + tamano * 0.9;
  const h = tamano * 1.45;
  ctx.fillStyle = fondo;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = tinta;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x, y - h / 2 + tamano * 0.06);
}

/** Tienda Nude Project a la derecha, como en el runner: fachada blanca y negra, vidriera y cartel. */
function tienda(ctx, g) {
  const izq = g.x1 + 14;
  const ancho = g.w - izq;
  const base = g.calle - 4;
  // El cartel "Queda 1" va arriba de la fachada: se reserva su lugar para que no se corte.
  const tamanoQueda = Math.max(14, Math.min(ancho * 0.11, g.h * 0.045));
  const altoQueda = tamanoQueda * 1.45;
  const alto = Math.min(g.vereda * 0.9 + (g.calle - g.vereda), base - altoQueda - 18);
  const y = base - alto;
  // Sombra suave sobre la vereda.
  ctx.fillStyle = 'rgba(46, 25, 20, 0.15)';
  ctx.fillRect(izq - 6, y + 8, 6, alto - 8);
  // Fachada.
  ctx.fillStyle = C.marca.blanco;
  ctx.fillRect(izq, y, ancho, alto);
  ctx.fillStyle = C.juego.tienda;
  ctx.fillRect(izq - 4, y, ancho + 8, alto * 0.05);
  ctx.fillRect(izq, base - alto * 0.04, ancho, alto * 0.04);
  // Cartel con el nombre.
  const cartelY = y + alto * 0.12;
  const cartelAlto = alto * 0.13;
  ctx.fillRect(izq + ancho * 0.08, cartelY, ancho * 0.84, cartelAlto);
  ctx.fillStyle = C.juego['tienda-cartel'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${cartelAlto * 0.52}px ${FUENTE}`;
  ctx.fillText('NUDE PROJECT', izq + ancho / 2, cartelY + cartelAlto * 0.54, ancho * 0.76);
  // Ventanas del primer piso.
  ctx.fillStyle = C.juego.tienda;
  for (let i = 0; i < 3; i++) ctx.fillRect(izq + ancho * (0.12 + i * 0.28), y + alto * 0.31, ancho * 0.2, alto * 0.13);
  // Vidriera con la última sudadera y puerta.
  const pbY = y + alto * 0.55;
  const pbAlto = base - alto * 0.04 - pbY;
  ctx.fillStyle = C.juego.tienda;
  ctx.fillRect(izq + ancho * 0.08, pbY, ancho * 0.5, pbAlto);
  ctx.fillStyle = C.juego['cielo-arriba'];
  ctx.fillRect(izq + ancho * 0.11, pbY + pbAlto * 0.07, ancho * 0.44, pbAlto * 0.86);
  sudadera(ctx, izq + ancho * 0.33, pbY + pbAlto * 0.5, pbAlto * 0.5);
  ctx.fillStyle = C.juego.tienda;
  ctx.fillRect(izq + ancho * 0.64, pbY, ancho * 0.28, pbAlto);
  ctx.fillStyle = C.marca['cacao-suave'];
  ctx.fillRect(izq + ancho * 0.775, pbY + pbAlto * 0.08, 2, pbAlto * 0.92);
  // "Queda 1" colgado, como el cartel del design system.
  ctx.save();
  ctx.translate(izq + ancho / 2, y - 4);
  ctx.rotate(-0.04);
  cartelito(ctx, 'QUEDA 1', 0, 0, tamanoQueda, C.acento.mostaza, C.marca.cacao);
  ctx.restore();
}

function sudadera(ctx, x, y, alto) {
  const w = alto * 0.8;
  ctx.fillStyle = C.marca.cacao;
  ctx.beginPath(); // capucha
  ctx.arc(x, y - alto * 0.32, w * 0.24, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - w / 2, y - alto * 0.32, w, alto * 0.62); // cuerpo
  ctx.save(); // mangas, un poco abiertas
  ctx.translate(x - w / 2, y - alto * 0.3);
  ctx.rotate(0.25);
  ctx.fillRect(-w * 0.22, 0, w * 0.22, alto * 0.55);
  ctx.restore();
  ctx.save();
  ctx.translate(x + w / 2, y - alto * 0.3);
  ctx.rotate(-0.25);
  ctx.fillRect(0, 0, w * 0.22, alto * 0.55);
  ctx.restore();
  ctx.fillStyle = C.marca['cacao-profundo'];
  ctx.fillRect(x - w * 0.25, y + alto * 0.08, w * 0.5, alto * 0.12); // bolsillo canguro
  ctx.fillStyle = C.marca['cacao-suave'];
  ctx.fillRect(x - 1.5, y + alto * 0.3, 3, alto * 0.22); // pie del maniquí
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function hex(c) {
  const n = Number.parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mezclar(a, b, t) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)}, ${Math.round(g1 + (g2 - g1) * t)}, ${Math.round(b1 + (b2 - b1) * t)})`;
}

function transparente(c) {
  const [r, g, b] = hex(c);
  return `rgba(${r}, ${g}, ${b}, 0)`;
}
