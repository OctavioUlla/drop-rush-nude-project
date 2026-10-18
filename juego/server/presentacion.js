// Interacciones de la presentación con los celulares (PLANIFICACION de la presentación, secciones 2.1, 2.3 y 6.4):
// el hype colectivo de apertura y la votación en vivo. Viven en la misma sala que el juego: cada celular entra una
// sola vez (QR → número de grupo) y pasa de la presentación al lobby y a la carrera sin volver a elegir nada.
// El servidor guarda el resultado del hype y de la votación para retomarlos en el debate, aunque se recargue la página.

const CUENTA_MAX = 10; // s: tope de la cuenta regresiva que pide el proyector
// Margen para que el aviso llegue a todos antes de que la cuenta muestre el 3: la cuenta se dibuja hasta empiezaEn.
const MARGEN_CUENTA = 400;
const INTERVALO_NIVEL = 100; // ms: el medidor se reparte unas 10 veces por segundo mientras se llena
const LARGO = { id: 40, pregunta: 200, opcion: 40 };

/** Etapas de la sala: con la presentación, los celulares muestran la espera, el hype y la votación. */
export const ETAPAS = new Set(['presentacion', 'juego']);

export class Presentacion {
  /**
   * @param {object} p
   * @param {{ hypeToquesPorGrupo: number, hypeToquesPorSegundo: number, hypeRafaga: number }} p.config
   * @param {import('./rooms.js').Sala} p.sala
   * @param {(destino: 'todos'|'hosts'|number, evento: string, datos: unknown) => void} p.enviar
   */
  constructor({ config, sala, enviar, ahora = Date.now }) {
    this.config = config;
    this.sala = sala;
    this.enviar = enviar;
    this.ahora = ahora;
    // Una sala creada por el proyector del juego arranca en el juego; la presentación la pasa a su etapa al conectarse.
    this.etapa = 'juego';
    this.hype = hypeVacio();
    this.votacion = null;
    this.temporizadores = [];
  }

  // ---------- Etapa ----------

  cambiarEtapa(etapa) {
    if (!ETAPAS.has(etapa) || etapa === this.etapa) return false;
    this.etapa = etapa;
    this.enviar('todos', 'pres:etapa', { etapa });
    return true;
  }

  /** La presentación arranca con el hype de apertura: desde ahí los grupos ya no se cambian. */
  get comenzo() {
    return this.hype.fase !== 'reposo';
  }

  // ---------- Hype colectivo ----------

  /**
   * El presentador lanza el hype: cuenta regresiva sincronizada y, al llegar a cero, el medidor.
   * La meta sale de los grupos conectados ahora (25 toques por grupo), así tarda lo mismo con 25 que con 40.
   */
  prepararHype(segundos = 3) {
    if (this.hype.fase === 'cuenta' || this.hype.fase === 'llenando') return { ok: false, motivo: 'en_curso' };
    const n = Number(segundos);
    const s = Number.isFinite(n) ? Math.min(Math.max(n, 0), CUENTA_MAX) : 3;
    const conectados = Math.max(1, this.sala.conectados());
    this.limpiarTemporizadores();
    this.hype = {
      ...hypeVacio(),
      fase: 'cuenta',
      empiezaEn: this.ahora() + s * 1000 + MARGEN_CUENTA,
      meta: conectados * this.config.hypeToquesPorGrupo,
      conectados,
      resultado: this.hype.resultado, // el anterior se conserva hasta que este termine
    };
    const { empiezaEn, meta } = this.hype;
    this.enviar('todos', 'pres:hype:cuenta', { empiezaEn, meta, conectados });
    this.programar(empiezaEn, () => this.empezarHype());
    return { ok: true, empiezaEn, meta, conectados };
  }

  empezarHype() {
    if (this.hype.fase !== 'cuenta') return;
    this.hype.fase = 'llenando';
    this.repartirNivel(true);
    this.temporizadores.push(setInterval(() => this.repartirNivel(), INTERVALO_NIVEL));
  }

  /**
   * Toques de un celular: `total` es lo que lleva tocado en este hype (absoluto, así un envío perdido lo corrige el
   * siguiente). Cada celular suma como máximo `hypeToquesPorSegundo` (con una ráfaga para los envíos que llegan
   * juntos): tocar con varios dedos o con un auto-clicker no rinde más.
   */
  registrarToques(grupo, datos) {
    const h = this.hype;
    if (h.fase !== 'llenando') return { ok: false, motivo: 'no_hype' };
    const total = Math.floor(Number(datos?.total));
    if (!Number.isFinite(total)) return { ok: false, motivo: 'invalid' };
    const ahora = this.ahora();
    let a = h.aportes.get(grupo.numero);
    if (!a) {
      a = { informados: 0, aceptados: 0, credito: this.config.hypeRafaga, desde: Math.min(ahora, h.empiezaEn) };
      h.aportes.set(grupo.numero, a);
    }
    const nuevos = total - a.informados;
    if (nuevos <= 0) return { ok: true, aceptados: 0 };
    a.informados = total;
    a.credito = Math.min(this.config.hypeRafaga, a.credito + ((ahora - a.desde) / 1000) * this.config.hypeToquesPorSegundo);
    a.desde = ahora;
    const aceptados = Math.min(nuevos, Math.floor(a.credito));
    a.credito -= aceptados;
    a.aceptados += aceptados;
    h.toques += aceptados;
    if (h.toques >= h.meta) this.dropHype();
    return { ok: true, aceptados };
  }

  /** Si el medidor se estanca, el presentador lo completa con la misma tecla y el drop sale igual. */
  completarHype() {
    if (this.hype.fase === 'cuenta') this.empezarHype();
    if (this.hype.fase !== 'llenando') return false;
    this.hype.toques = Math.max(this.hype.toques, this.hype.meta);
    this.dropHype();
    return true;
  }

  dropHype() {
    const h = this.hype;
    this.limpiarTemporizadores();
    this.repartirNivel(true);
    h.fase = 'drop';
    h.resultado = { toques: h.toques, meta: h.meta, grupos: this.sumando().length, aportes: this.aportes(), at: this.ahora() };
    this.enviar('todos', 'pres:hype:drop', h.resultado);
  }

  /** Grupos que ya sumaron al menos un toque (el proyector enciende su ficha, sin ranking). */
  sumando() {
    const lista = [];
    for (const [numero, a] of this.hype.aportes) if (a.aceptados > 0) lista.push(numero);
    return lista.sort((a, b) => a - b);
  }

  /** { número de grupo: toques } para que cada celular muestre su aporte. */
  aportes() {
    const salida = {};
    for (const [numero, a] of this.hype.aportes) if (a.aceptados > 0) salida[numero] = a.aceptados;
    return salida;
  }

  repartirNivel(forzar = false) {
    const h = this.hype;
    const clave = `${h.toques}:${h.aportes.size}`;
    if (!forzar && clave === h.ultimoNivel) return;
    h.ultimoNivel = clave;
    this.enviar('todos', 'pres:hype:nivel', { toques: Math.min(h.toques, h.meta), meta: h.meta, grupos: this.sumando() });
  }

  // ---------- Votación en vivo ----------

  /** Abre la votación (la pregunta viene de presentacion/datos/votacion.json). Reabrir la misma conserva los votos. */
  abrirVotacion(datos) {
    const id = texto(datos?.id, LARGO.id);
    const pregunta = texto(datos?.pregunta, LARGO.pregunta);
    const opciones = Array.isArray(datos?.opciones) ? datos.opciones.map((o) => texto(o, LARGO.opcion)) : [];
    if (!id || !pregunta || opciones.length < 2 || opciones.length > 4 || opciones.some((o) => !o)) return { ok: false, motivo: 'invalid' };
    const misma = this.votacion?.id === id && this.votacion.opciones.join('\n') === opciones.join('\n');
    if (!misma) this.votacion = { id, pregunta, opciones, abierta: false, votos: new Map() };
    this.votacion.abierta = true;
    this.avisarVotacion();
    return { ok: true };
  }

  cerrarVotacion() {
    if (!this.votacion?.abierta) return false;
    this.votacion.abierta = false;
    this.avisarVotacion();
    return true;
  }

  /**
   * Voto de un grupo: { id, opcion, seq }. Se puede cambiar mientras está abierta; el celular reintenta hasta el ack,
   * así que `seq` (la hora en que se tocó) descarta un voto viejo que llega después de uno más nuevo.
   */
  votar(grupo, datos) {
    const v = this.votacion;
    if (!v || datos?.id !== v.id) return { ok: false, motivo: 'no_vote' };
    if (!v.abierta) return { ok: false, motivo: 'closed' };
    const opcion = Number(datos.opcion);
    if (!Number.isInteger(opcion) || opcion < 0 || opcion >= v.opciones.length) return { ok: false, motivo: 'invalid' };
    const seq = Number(datos.seq) || 0;
    const anterior = v.votos.get(grupo.numero);
    if (anterior && anterior.seq > seq) return { ok: true, opcion: anterior.opcion, vieja: true };
    v.votos.set(grupo.numero, { opcion, seq });
    if (anterior?.opcion !== opcion) this.enviar('hosts', 'pres:votacion:conteo', this.conteo());
    return { ok: true, opcion };
  }

  conteo() {
    const v = this.votacion;
    if (!v) return null;
    const votos = v.opciones.map(() => 0);
    for (const { opcion } of v.votos.values()) votos[opcion]++;
    return { id: v.id, pregunta: v.pregunta, opciones: v.opciones, abierta: v.abierta, votos, votaron: v.votos.size, conectados: this.sala.conectados() };
  }

  avisarVotacion() {
    const { id, pregunta, opciones, abierta } = this.votacion;
    this.enviar('todos', 'pres:votacion:pregunta', { id, pregunta, opciones, abierta });
    this.enviar('hosts', 'pres:votacion:conteo', this.conteo());
  }

  // ---------- Estado para quien entra o recarga ----------

  /** Ensayos: borra el hype y la votación (el resultado guardado también). */
  reiniciar() {
    this.limpiarTemporizadores();
    this.hype = hypeVacio();
    this.votacion = null;
    this.enviar('todos', 'pres:estado', this.estadoCelular(null));
    this.enviar('hosts', 'pres:estado', this.estadoProyector());
  }

  datosHype() {
    const { fase, empiezaEn, meta, toques, conectados, resultado } = this.hype;
    return { fase, empiezaEn, meta, toques: Math.min(toques, meta || toques), conectados, grupos: this.sumando(), resultado };
  }

  estadoProyector() {
    return { etapa: this.etapa, hype: this.datosHype(), votacion: this.conteo() };
  }

  /** Lo que necesita un celular que entra o reconecta: la etapa, el hype en curso y la votación con su voto. */
  estadoCelular(grupo) {
    const { fase, empiezaEn, meta, toques, resultado } = this.hype;
    const propio = grupo ? this.hype.aportes.get(grupo.numero) : null;
    const v = this.votacion;
    return {
      etapa: this.etapa,
      hype: { fase, empiezaEn, meta, toques: Math.min(toques, meta || toques), aporte: propio?.aceptados ?? 0, informados: propio?.informados ?? 0, resultado },
      votacion: v ? { id: v.id, pregunta: v.pregunta, opciones: v.opciones, abierta: v.abierta, voto: (grupo && v.votos.get(grupo.numero)?.opcion) ?? null } : null,
    };
  }

  // ---------- Temporizadores ----------

  programar(hora, fn) {
    this.temporizadores.push(setTimeout(fn, Math.max(0, hora - this.ahora())));
  }

  limpiarTemporizadores() {
    for (const t of this.temporizadores) clearTimeout(t); // clearTimeout también corta los setInterval
    this.temporizadores = [];
  }

  detener() {
    this.limpiarTemporizadores();
  }
}

function hypeVacio() {
  return { fase: 'reposo', empiezaEn: null, meta: 0, toques: 0, conectados: 0, aportes: new Map(), resultado: null, ultimoNivel: null };
}

function texto(valor, largo) {
  return typeof valor === 'string' ? valor.trim().slice(0, largo) : '';
}
