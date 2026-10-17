import { randomInt } from 'node:crypto';
import { FASES } from '../public/shared/constantes.js';

// Guion de la partida, preguntas, respuestas y posiciones.
// El celular sigue el guion solo (aunque se corte la red); el servidor solo
// valida respuestas, suma bonus y arma el ranking.

const ESPERA_REVELADO = 1000; // ms después del límite de cada pregunta
const MARGEN_RELOJ = 1000; // ms de diferencia de reloj tolerada en la hora informada

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Elige las preguntas de la partida y mezcla sus opciones (el celular nunca recibe la correcta). */
export function prepararPreguntas(banco, config) {
  const orden = config.ordenAleatorio ? mezclar(banco) : banco;
  return orden.slice(0, config.cantidadPreguntas).map((p) => {
    const indices = p.opciones.map((_, i) => i);
    const orden = config.mezclarOpciones ? mezclar(indices) : indices;
    return {
      id: p.id,
      text: p.pregunta,
      options: orden.map((i) => p.opciones[i]),
      shortOptions: orden.map((i) => p.opcionesCortas?.[i] ?? null),
      correctIndex: orden.indexOf(p.correcta),
      explanation: p.explicacion ?? '',
      timeLimit: p.tiempo ?? config.tiempoPorDefecto,
    };
  });
}

/** Arma el guion completo con horas absolutas del servidor. */
export function crearGuion(config, preguntas, inicio) {
  const phases = [];
  let t = inicio;
  const agregar = (type, duracionS, extra = {}) => {
    phases.push({ type, startsAt: t, duration: duracionS * 1000, ...extra });
    t += duracionS * 1000;
  };
  agregar(FASES.CUENTA, config.duracionCuenta);
  preguntas.forEach((p, index) => {
    agregar(FASES.TRAMO, config.duracionTramo, { index, seed: randomInt(2 ** 31) });
    agregar(FASES.PREGUNTA, p.timeLimit, { index, options: p.options.length });
  });
  agregar(FASES.SPRINT, config.duracionSprint, { index: preguntas.length, seed: randomInt(2 ** 31) });
  agregar(FASES.FIN, 0);
  return {
    id: randomInt(2 ** 31),
    startsAt: inicio,
    phases,
    difficulty: config.dificultadObstaculos,
    questions: preguntas.length,
  };
}

export class Partida {
  constructor({ config, banco, sala, enviar, ahora = Date.now }) {
    this.config = config;
    this.banco = banco;
    this.sala = sala;
    this.enviar = enviar; // (destino, evento, datos) — destino: 'todos' | 'hosts' | número de grupo
    this.ahora = ahora;
    this.guion = null;
    this.preguntas = [];
    this.revelados = new Set();
    this.temporizadores = [];
    this.terminada = false;
  }

  get activa() {
    return Boolean(this.guion) && !this.terminada;
  }

  iniciar(ajustes = {}) {
    this.detener();
    const config = { ...this.config, ...filtrarAjustes(ajustes) };
    this.preguntas = prepararPreguntas(this.banco, config);
    this.guion = crearGuion(config, this.preguntas, this.ahora() + 1500);
    this.revelados.clear();
    this.terminada = false;
    for (const g of this.sala.grupos.values()) g.reiniciarPartida();

    for (const fase of this.guion.phases) {
      if (fase.type === FASES.PREGUNTA) {
        this.programar(fase.startsAt, () => this.empezarPregunta(fase.index));
        this.programar(fase.startsAt + fase.duration + ESPERA_REVELADO, () => this.revelar(fase.index));
      }
      if (fase.type === FASES.FIN) this.programar(fase.startsAt, () => this.terminar());
    }
    this.enviar('todos', 'game:script', this.guion);
    return this.guion;
  }

  detener() {
    for (const t of this.temporizadores) clearTimeout(t);
    this.temporizadores = [];
    this.guion = null;
    this.terminada = false;
  }

  programar(hora, fn) {
    this.temporizadores.push(setTimeout(fn, Math.max(0, hora - this.ahora())));
  }

  faseDePregunta(index) {
    return this.guion?.phases.find((f) => f.type === FASES.PREGUNTA && f.index === index);
  }

  empezarPregunta(index) {
    const p = this.preguntas[index];
    this.enviar('todos', 'question:start', {
      index,
      text: p.text,
      options: p.options,
      shortOptions: p.shortOptions,
      timeLimit: p.timeLimit,
    });
  }

  registrarProgreso(grupo, datos) {
    if (!this.activa || !datos) return;
    const d = Number(datos.runDistance);
    // La distancia es absoluta: si llega un mensaje viejo fuera de orden, se ignora.
    if (Number.isFinite(d) && d >= grupo.distanciaCorrida) grupo.distanciaCorrida = d;
    grupo.velocidad = Number(datos.speed) || 0;
    if (Number.isFinite(datos.hits)) grupo.choques = datos.hits;
    if (Number.isFinite(datos.jumps)) grupo.saltos = datos.jumps;
    if (Number.isFinite(datos.likes)) grupo.likes = datos.likes;
    grupo.ultimoDato = this.ahora();
  }

  /**
   * Respuesta de un grupo: { index, lane, serverTime, since }.
   * Se acepta aunque llegue tarde por un corte, siempre que se haya dado a tiempo,
   * y se cuenta una sola vez.
   */
  registrarRespuesta(grupo, datos) {
    const index = Number(datos?.index);
    const fase = this.faseDePregunta(index);
    if (!this.activa || !fase) return { ok: false, motivo: 'no_question' };
    if (grupo.respuestas.has(index)) return { ok: true, repetida: true };

    const fin = fase.startsAt + fase.duration;
    const llegada = this.ahora();
    const dada = Number(datos.serverTime);
    if (llegada < fase.startsAt) return { ok: false, motivo: 'too_early' };
    if (!(dada <= fin + MARGEN_RELOJ) || llegada > fin + this.config.toleranciaRespuestaTardia * 1000) {
      return { ok: false, motivo: 'too_late' };
    }

    const p = this.preguntas[index];
    const lane = Number(datos.lane);
    const correct = lane === p.correctIndex;
    let bonus = 0;
    if (correct) {
      const desde = Math.min(Math.max(Number(datos.since) || fin, fase.startsAt), fin);
      const rapidez = 1 - (desde - fase.startsAt) / fase.duration;
      bonus = this.config.bonusAcierto + Math.round(this.config.bonusRapidezMax * rapidez);
      grupo.bonus += bonus;
    }
    const resultado = { index, lane, correct, bonus };
    grupo.respuestas.set(index, resultado);

    // Si ya se reveló (llegó tarde por un corte), se informa enseguida.
    if (this.revelados.has(index)) {
      this.enviar(grupo.numero, 'question:result', resultado);
      this.enviar('hosts', 'question:reveal', this.resumenPregunta(index));
    }
    return { ok: true };
  }

  revelar(index) {
    this.revelados.add(index);
    for (const g of this.sala.grupos.values()) {
      const r = g.respuestas.get(index);
      if (r) this.enviar(g.numero, 'question:result', r);
    }
    this.enviar('hosts', 'question:reveal', this.resumenPregunta(index));
  }

  resumenPregunta(index) {
    const p = this.preguntas[index];
    const distribution = p.options.map(() => 0);
    let correctCount = 0;
    let answered = 0;
    for (const g of this.sala.grupos.values()) {
      const r = g.respuestas.get(index);
      if (!r) continue;
      answered++;
      if (r.lane >= 0 && r.lane < distribution.length) distribution[r.lane]++;
      if (r.correct) correctCount++;
    }
    return { index, correctIndex: p.correctIndex, correctCount, answered, total: this.sala.grupos.size, distribution };
  }

  ranking() {
    return [...this.sala.grupos.values()].sort(
      (a, b) => b.distanciaTotal - a.distanciaTotal || aciertos(b) - aciertos(a),
    );
  }

  posiciones() {
    return this.ranking().map((g) => [g.numero, Math.round(g.distanciaTotal), 0, g.conectado ? 1 : 0]);
  }

  terminar() {
    this.terminada = true;
    const [ganador, ...cola] = this.ranking();
    this.enviar('todos', 'game:end', {
      winner: ganador?.numero ?? null,
      queue: cola.map((g) => g.numero),
      stats: this.ranking().map((g) => ({
        group: g.numero,
        distance: Math.round(g.distanciaTotal),
        correct: aciertos(g),
        hits: g.choques,
        jumps: g.saltos,
        likes: g.likes,
      })),
    });
  }

  /** Estado completo de un grupo, para corregir diferencias al reconectar. */
  estadoDe(grupo) {
    const ranking = this.ranking();
    return {
      group: grupo.numero,
      scriptId: this.guion?.id ?? null,
      runDistance: grupo.distanciaCorrida,
      bonusDistance: grupo.bonus,
      answers: [...grupo.respuestas.values()].filter((r) => this.revelados.has(r.index)),
      answeredIndexes: [...grupo.respuestas.keys()],
      position: ranking.indexOf(grupo) + 1,
      total: ranking.length,
    };
  }
}

function aciertos(grupo) {
  let n = 0;
  for (const r of grupo.respuestas.values()) if (r.correct) n++;
  return n;
}

const AJUSTES_PERMITIDOS = ['cantidadPreguntas', 'duracionTramo', 'tiempoPorDefecto', 'dificultadObstaculos'];

function filtrarAjustes(ajustes) {
  const salida = {};
  for (const k of AJUSTES_PERMITIDOS) if (ajustes[k] !== undefined) salida[k] = ajustes[k];
  if (salida.cantidadPreguntas !== undefined) salida.cantidadPreguntas = Math.max(1, Math.min(12, Number(salida.cantidadPreguntas) || 1));
  if (salida.duracionTramo !== undefined) salida.duracionTramo = Math.max(1, Number(salida.duracionTramo) || 15);
  if (salida.tiempoPorDefecto !== undefined) salida.tiempoPorDefecto = Math.max(1, Number(salida.tiempoPorDefecto) || 15);
  if (!['facil', 'normal', 'caotico'].includes(salida.dificultadObstaculos)) delete salida.dificultadObstaculos;
  return salida;
}
