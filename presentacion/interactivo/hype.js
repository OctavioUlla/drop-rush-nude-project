// Hype colectivo de la portada (PLANIFICACION, sección 2.1), del lado del proyector: cuenta regresiva → medidor que
// la clase llena entre todos desde el celular → drop. Sin ranking: solo se encienden las fichas de los grupos que suman.
// - En vivo: el servidor lleva la cuenta (eventos pres:hype:*), con la meta según los grupos conectados al lanzar.
// - Ensayo: sin servidor o sin celulares conectados, los toques de 40 grupos se simulan. Es también el respaldo si el
//   servidor se cae: el medidor se puede completar igual y el drop sale.
// La coreografía 3D (luz, sudadera que sube y baja, papelitos) la hace el motor de la escena con motor.hype().

const CUENTA = 3; // s
const GRUPOS_ENSAYO = 40;
const META_POR_GRUPO = 25;
const DURACION_DROP = 6000; // ms que queda el texto del drop antes de volver a la portada
const formato = new Intl.NumberFormat('es-AR');

/**
 * @param {object} p
 * @param {(sel: string) => HTMLElement} p.$
 * @param {HTMLElement} p.escenario  recibe data-hype (el CSS esconde el título y el QR durante el hype)
 * @param {object|null} p.motor
 * @param {() => object|null} p.sala  la conexión (interactivo/sala.js) o null
 * @param {() => void} p.alCambiar   para el modo presentador
 */
export function crearHype({ $, escenario, motor, sala, alCambiar = () => {} }) {
  const ui = $('#hype');
  const fichas = $('#hype-grupos');
  let max = GRUPOS_ENSAYO;
  // fase: reposo | cuenta | llenando | drop. empiezaEn es hora del servidor (en vivo) o Date.now() (ensayo).
  const e = { fase: 'reposo', modo: 'ensayo', empiezaEn: 0, meta: 0, toques: 0, sumando: new Set(), conectados: 0 };
  let simulacion = 0, volver = 0;

  const ahora = () => (e.modo === 'vivo' && sala() ? sala().ahora() : Date.now());

  function dibujarFichas(n) {
    max = n;
    fichas.innerHTML = Array.from({ length: n }, (_, i) => `<span class="np-ficha np-ficha--libre" style="--g: var(--np-grupo-${i + 1}); --gt: var(--np-grupo-${i + 1}-texto)">${i + 1}</span>`).join('');
  }
  dibujarFichas(GRUPOS_ENSAYO);

  function fase(f) {
    e.fase = f;
    escenario.dataset.hype = f;
    ui.dataset.fase = f;
    alCambiar();
  }

  function pintar() {
    const nivel = e.meta ? Math.min(e.toques / e.meta, 1) : 0;
    $('#hype-barra').style.setProperty('--valor', `${(nivel * 100).toFixed(1)}%`);
    $('#hype-cifra').textContent = `${Math.floor(nivel * 100)} % · ${formato.format(e.toques)} toques`;
    $('#hype-sumando').textContent = `${e.sumando.size}/${e.conectados} grupos sumando`;
    [...fichas.children].forEach((f, i) => f.classList.toggle('np-ficha--libre', !e.sumando.has(i + 1)));
    if (e.fase === 'llenando') motor?.hype('llenando', nivel);
  }

  /** Cuenta regresiva hasta empiezaEn; al llegar a cero, el medidor. */
  function cuenta({ empiezaEn, meta, conectados, modo }) {
    clearTimeout(volver);
    cancelAnimationFrame(simulacion);
    Object.assign(e, { modo, empiezaEn, meta, conectados, toques: 0, sumando: new Set() });
    $('#hype-modo').textContent = modo === 'vivo' ? '¡Toquen HYPE en el celular!' : 'Hype colectivo · ensayo sin celulares';
    if (modo === 'vivo' && sala()?.max !== max) dibujarFichas(sala().max);
    fase('cuenta');
    motor?.hype('cuenta');
    const el = $('#hype-cuenta');
    el.classList.remove('np-cuenta--ya');
    const paso = () => {
      if (e.fase !== 'cuenta' || e.empiezaEn !== empiezaEn) return;
      const resta = empiezaEn - ahora();
      if (resta > 0) {
        el.textContent = Math.min(CUENTA, Math.ceil(resta / 1000));
        return requestAnimationFrame(paso);
      }
      el.textContent = '¡Hype!';
      el.classList.add('np-cuenta--ya');
      fase('llenando');
      pintar();
      if (e.modo === 'ensayo') simular();
    };
    requestAnimationFrame(paso);
  }

  function drop({ toques, grupos }) {
    if (e.fase === 'reposo' || e.fase === 'drop') return;
    cancelAnimationFrame(simulacion);
    e.toques = Math.max(e.toques, toques);
    pintar();
    fase('drop');
    motor?.hype('drop');
    $('#hype-final').textContent = `${grupos} ${grupos === 1 ? 'grupo' : 'grupos'}, ${formato.format(toques)} toques: el drop salió.`;
    volver = setTimeout(() => fase('reposo'), DURACION_DROP);
  }

  // ---------- Ensayo: 40 grupos simulados ----------
  function simular() {
    let ultimo = performance.now();
    const paso = (t) => {
      const dt = (t - ultimo) / 1000;
      ultimo = t;
      // Cada grupo arranca a su tiempo y toca entre 2 y 3,6 veces por segundo (por debajo del tope de 8).
      for (let g = 1; g <= GRUPOS_ENSAYO; g++) if (Math.random() < dt * 1.4) e.sumando.add(g);
      e.toques = Math.min(e.meta, e.toques + Math.round(e.sumando.size * dt * (2 + Math.random() * 1.6)));
      pintar();
      if (e.toques < e.meta) simulacion = requestAnimationFrame(paso);
      else drop({ toques: e.toques, grupos: e.sumando.size });
    };
    simulacion = requestAnimationFrame(paso);
  }

  // ---------- En vivo: eventos del servidor ----------
  let escuchando = null;
  function conectar(s) {
    if (escuchando === s) return;
    escuchando = s;
    s.addEventListener('pres:hype:cuenta', ({ detail: d }) => {
      if (d.empiezaEn !== e.empiezaEn) cuenta({ ...d, modo: 'vivo' });
    });
    s.addEventListener('pres:hype:nivel', ({ detail: d }) => {
      if (e.modo !== 'vivo' || e.fase === 'reposo' || e.fase === 'drop') return;
      Object.assign(e, { toques: d.toques, meta: d.meta, sumando: new Set(d.grupos) });
      pintar();
    });
    s.addEventListener('pres:hype:drop', ({ detail: d }) => {
      if (e.modo === 'vivo') drop(d);
    });
    // Si se recarga la página en pleno hype, se retoma donde estaba (un drop ya hecho no se repite).
    s.addEventListener('pres:estado', ({ detail: { hype: h } }) => {
      if ((h.fase === 'cuenta' || h.fase === 'llenando') && h.empiezaEn !== e.empiezaEn) {
        cuenta({ empiezaEn: h.empiezaEn, meta: h.meta, conectados: h.conectados, modo: 'vivo' });
        Object.assign(e, { toques: h.toques, sumando: new Set(h.grupos) });
      }
    });
  }

  return {
    conectar,
    /** Tecla H: lanza el hype (en vivo si hay celulares conectados) o, si el medidor se estanca, lo completa. */
    async alternar() {
      if (e.fase === 'llenando') {
        if (e.modo === 'vivo' && (await sala()?.pedir('pres:hype:completar'))?.ok) return;
        e.toques = e.meta; // ensayo, o el servidor no responde: el drop sale igual
        return drop({ toques: e.meta, grupos: e.sumando.size });
      }
      if (e.fase !== 'reposo') return;
      const s = sala();
      if (s?.conectado && s.conectados > 0) {
        const r = await s.pedir('pres:hype:preparar', { segundos: CUENTA });
        if (r?.ok) {
          if (r.empiezaEn !== e.empiezaEn) cuenta({ empiezaEn: r.empiezaEn, meta: r.meta, conectados: r.conectados, modo: 'vivo' });
          return;
        }
      }
      cuenta({ empiezaEn: Date.now() + CUENTA * 1000, meta: META_POR_GRUPO * GRUPOS_ENSAYO, conectados: GRUPOS_ENSAYO, modo: 'ensayo' });
    },
    /** Para el modo presentador. */
    get estado() {
      return { fase: e.fase, modo: e.modo, nivel: e.meta ? Math.min(e.toques / e.meta, 1) : 0, toques: e.toques, sumando: e.sumando.size, conectados: e.conectados };
    },
  };
}
