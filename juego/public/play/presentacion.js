import { grupos as coloresGrupos } from '../../../design-system/tokens.js';

// Pantallas del celular durante la presentación (PLANIFICACION de la presentación, secciones 2.1 y 2.3):
// espera quieta con el número del grupo, cuenta regresiva y botón HYPE del hype colectivo, y la votación en vivo.
// Se ven mientras la sala está en la etapa de la presentación y todavía no hay partida; mientras tanto el
// runner no se dibuja (el celular no distrae ni gasta batería). Al llegar al juego, el mismo celular sigue
// en su grupo sin elegir nada.

const TOQUES_POR_SEGUNDO = 8; // el mismo tope que el servidor: lo que se cuenta acá es lo que suma
const RAFAGA = 8;
const INTERVALO_ENVIO = 200; // ms: los toques viajan agrupados
const DURACION_DROP = 6000; // ms que se ve "¡Lo lograron entre todos!"
const DURACION_CERRADA = 5000; // ms que se ve "Votación cerrada"
const formato = new Intl.NumberFormat('es-AR');

export class PantallaPresentacion {
  /**
   * @param {object} p
   * @param {import('./net.js').Red} p.red
   * @param {HTMLElement} p.raiz     la sección #pres de index.html
   * @param {() => boolean} p.hayPartida  con partida (o guion) el celular vuelve al juego
   * @param {() => number|null} p.grupo
   */
  constructor({ red, raiz, hayPartida, grupo }) {
    this.red = red;
    this.raiz = raiz;
    this.hayPartida = hayPartida;
    this.grupo = grupo;
    this.etapa = 'juego';
    this.hype = { fase: 'reposo', empiezaEn: null, meta: 0, toques: 0 };
    this.dropHasta = 0; // performance.now() hasta el que se muestra el drop
    this.votacion = null; // { id, pregunta, opciones, abierta, voto }
    this.cerradaHasta = 0;
    // Toques de este celular en el hype en curso: contados (con el tope local) y ya enviados al servidor.
    this.toques = { empiezaEn: null, total: 0, enviados: 0, contados: 0, credito: RAFAGA, ultimo: 0 };
    this.fase = null;

    const $ = (s) => raiz.querySelector(s);
    this.el = {
      grupo: $('[data-pres="grupo"]'),
      cuenta: $('[data-pres="cuenta"]'),
      boton: $('[data-pres="boton"]'),
      aporte: $('[data-pres="aporte"]'),
      nivel: $('[data-pres="nivel"]'),
      final: $('[data-pres="final"]'),
      pregunta: $('[data-pres="pregunta"]'),
      opciones: $('[data-pres="opciones"]'),
      votoEstado: $('[data-pres="voto-estado"]'),
      cerrada: $('[data-pres="cerrada"]'),
    };

    red.addEventListener('pres:estado', (e) => this.sincronizar(e.detail));
    red.addEventListener('pres:etapa', (e) => (this.etapa = e.detail.etapa));
    red.addEventListener('pres:hype:cuenta', (e) => this.cuenta(e.detail));
    red.addEventListener('pres:hype:nivel', (e) => this.nivel(e.detail));
    red.addEventListener('pres:hype:drop', (e) => this.drop(e.detail));
    red.addEventListener('pres:votacion:pregunta', (e) => this.pregunta(e.detail));

    // Apenas se apoya el dedo (como el botón del poder): el click llega tarde y se pierde con varios dedos.
    this.el.boton.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      this.tocar();
    });
    this.el.opciones.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-opcion]');
      if (b) this.votar(Number(b.dataset.opcion));
    });

    setInterval(() => this.enviarToques(), INTERVALO_ENVIO);
    setInterval(() => this.actualizar(), 100);
  }

  /** ¿Tapa el juego? Mientras sea true, play.js no simula ni dibuja el runner. */
  get visible() {
    return this.etapa === 'presentacion' && !this.hayPartida() && this.grupo() != null;
  }

  // ---------- Eventos del servidor ----------

  /** Al entrar, reconectar o recargar: la etapa, el hype en curso y la votación con el voto del grupo. */
  sincronizar(s) {
    this.etapa = s.etapa;
    const h = s.hype;
    this.hype = { fase: h.fase, empiezaEn: h.empiezaEn, meta: h.meta, toques: h.toques };
    if (h.fase === 'cuenta' || h.fase === 'llenando') {
      // Retoma los toques donde los tenía el servidor (si recargó en pleno hype).
      if (this.toques.empiezaEn !== h.empiezaEn) this.reiniciarToques(h.empiezaEn, h.informados ?? h.aporte, h.aporte);
    }
    if (h.fase === 'drop' && h.resultado) {
      const hace = this.red.ahora() - h.resultado.at;
      this.dropHasta = performance.now() + Math.max(0, DURACION_DROP - hace);
      this.mostrarDrop(h.resultado);
    }
    this.pregunta(s.votacion);
  }

  cuenta({ empiezaEn, meta }) {
    this.hype = { fase: 'cuenta', empiezaEn, meta, toques: 0 };
    this.reiniciarToques(empiezaEn, 0, 0);
  }

  nivel({ toques, meta }) {
    if (this.hype.fase === 'cuenta') this.hype.fase = 'llenando';
    Object.assign(this.hype, { toques, meta });
  }

  drop(resultado) {
    Object.assign(this.hype, { fase: 'drop', toques: resultado.toques, meta: resultado.meta });
    this.dropHasta = performance.now() + DURACION_DROP;
    this.mostrarDrop(resultado);
    if (this.visible) navigator.vibrate?.([60, 40, 120]);
  }

  mostrarDrop(r) {
    const propio = r.aportes?.[this.grupo()] ?? this.toques.contados;
    this.el.final.textContent = `Sumaron ${formato.format(propio)} ${propio === 1 ? 'toque' : 'toques'} de ${formato.format(r.toques)}.`;
  }

  /** La votación se abrió, se cerró o se reabrió (null: no hay votación). */
  pregunta(v) {
    const antes = this.votacion;
    if (!v) {
      this.votacion = null;
      return;
    }
    const otra = antes?.id !== v.id;
    this.votacion = { ...v, voto: v.voto !== undefined ? v.voto : otra ? null : antes.voto };
    if (antes?.abierta && !v.abierta) this.cerradaHasta = performance.now() + DURACION_CERRADA;
    if (otra || antes?.opciones.join('\n') !== v.opciones.join('\n')) this.dibujarOpciones();
    this.marcarVoto();
  }

  // ---------- Hype ----------

  reiniciarToques(empiezaEn, enviados, contados) {
    Object.assign(this.toques, { empiezaEn, total: enviados, enviados, contados, credito: RAFAGA, ultimo: performance.now() });
  }

  tocar() {
    if (this.fase !== 'hype') return;
    const t = this.toques;
    const ahora = performance.now();
    // Tope de 8 toques por segundo: tocar con varios dedos no rinde más (el servidor aplica el mismo).
    t.credito = Math.min(RAFAGA, t.credito + ((ahora - t.ultimo) / 1000) * TOQUES_POR_SEGUNDO);
    t.ultimo = ahora;
    if (t.credito < 1) return;
    t.credito -= 1;
    t.total++;
    t.contados++;
    this.el.aporte.textContent = textoAporte(t.contados);
    const b = this.el.boton;
    b.classList.remove('np-hype-boton--toque');
    void b.offsetWidth; // reinicia el latido
    b.classList.add('np-hype-boton--toque');
    navigator.vibrate?.(8);
  }

  enviarToques() {
    const t = this.toques;
    if (t.total <= t.enviados || !this.red.conectado || this.red.grupo == null) return;
    // Hasta que el servidor no abre el medidor (su primer pres:hype:nivel), los toques esperan acá.
    if (this.hype.fase !== 'llenando') return;
    // Total acumulado (no incrementos): si un envío se pierde, el siguiente lo corrige.
    this.red.socket.emit('pres:hype:toques', { total: t.total });
    t.enviados = t.total;
  }

  // ---------- Votación ----------

  dibujarOpciones() {
    const v = this.votacion;
    this.el.pregunta.textContent = v.pregunta;
    this.el.opciones.replaceChildren(
      ...v.opciones.map((texto, i) => {
        const b = document.createElement('button');
        b.className = 'pres__opcion';
        b.dataset.opcion = i;
        b.innerHTML = `<span class="pres__letra">${'ABCD'[i]}</span><span></span>`;
        b.lastChild.textContent = texto;
        return b;
      }),
    );
  }

  votar(opcion) {
    const v = this.votacion;
    if (!v?.abierta || this.fase !== 'votacion') return;
    v.voto = opcion;
    this.marcarVoto();
    navigator.vibrate?.(30);
    const seq = Math.round(this.red.ahora());
    // Se reintenta hasta el ack; con `seq` el servidor descarta un voto viejo que llegue después del nuevo.
    this.red.encolar(`voto:${v.id}:${seq}`, 'pres:votacion:votar', { id: v.id, opcion, seq });
  }

  marcarVoto() {
    const v = this.votacion;
    if (!v) return;
    for (const b of this.el.opciones.children) b.classList.toggle('pres__opcion--elegida', Number(b.dataset.opcion) === v.voto);
    this.el.votoEstado.textContent = v.voto == null ? 'Tocá una opción. Un voto por grupo.' : 'Voto guardado. Podés cambiarlo hasta que se cierre.';
    this.el.cerrada.textContent = v.voto == null ? 'No llegaron a votar.' : `Votaron: ${v.opciones[v.voto]}.`;
  }

  // ---------- Pantalla ----------

  /** Qué se ve ahora: el hype tiene prioridad sobre la votación, y si no hay nada, la espera quieta. */
  faseActual() {
    const h = this.hype;
    const ahora = performance.now();
    if (h.fase === 'cuenta') return this.red.ahora() < h.empiezaEn ? 'cuenta' : 'hype';
    if (h.fase === 'llenando') return 'hype';
    if (h.fase === 'drop' && ahora < this.dropHasta) return 'drop';
    if (this.votacion?.abierta) return 'votacion';
    if (this.votacion && ahora < this.cerradaHasta) return 'cerrada';
    return 'espera';
  }

  actualizar() {
    const visible = this.visible;
    this.raiz.hidden = !visible;
    if (!visible) return;
    const fase = this.faseActual();
    if (fase !== this.fase) {
      this.fase = fase;
      this.raiz.dataset.fase = fase;
      if (fase === 'hype') {
        this.el.aporte.textContent = textoAporte(this.toques.contados);
        navigator.vibrate?.(80);
      }
    }
    const numero = this.grupo();
    if (this.el.grupo.textContent !== String(numero)) {
      const c = coloresGrupos[numero - 1];
      this.el.grupo.textContent = numero;
      this.el.grupo.style.setProperty('--g', c.color);
      this.el.grupo.style.setProperty('--gt', c.texto);
    }
    if (fase === 'cuenta') {
      const s = Math.min(3, Math.max(1, Math.ceil((this.hype.empiezaEn - this.red.ahora()) / 1000)));
      if (this.el.cuenta.textContent !== String(s)) this.el.cuenta.textContent = s;
    }
    if (fase === 'hype') {
      const nivel = this.hype.meta ? Math.min(this.hype.toques / this.hype.meta, 1) : 0;
      this.el.nivel.style.setProperty('--valor', `${(nivel * 100).toFixed(1)}%`);
    }
  }
}

function textoAporte(n) {
  return n ? `Sumaron ${formato.format(n)} ${n === 1 ? 'toque' : 'toques'}` : '¡Toquen sin parar!';
}
