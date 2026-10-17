import { randomInt } from 'node:crypto';
import { FASES } from '../public/shared/constantes.js';
import { estadisticaPregunta, elegirRepaso, ordenarLlegada } from './stats.js';

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

/**
 * Elige las preguntas de la partida y mezcla sus opciones (el celular nunca recibe la correcta).
 * Primero van las principales (una por tema) y solo si hacen falta más, las de reserva.
 */
export function prepararPreguntas(banco, config) {
  const principales = banco.filter((p) => !p.reserva);
  const reservas = banco.filter((p) => p.reserva);
  const elegidas = [
    ...(config.ordenAleatorio ? mezclar(principales) : principales),
    ...(config.ordenAleatorio ? mezclar(reservas) : reservas),
  ].slice(0, config.cantidadPreguntas);
  const orden = config.ordenAleatorio ? mezclar(elegidas) : elegidas;
  return orden.map((p) => {
    const indices = p.opciones.map((_, i) => i);
    const orden = config.mezclarOpciones ? mezclar(indices) : indices;
    return {
      id: p.id,
      topic: p.tema ?? '',
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
    revealDuration: config.duracionRevelado * 1000,
    // Para que el celular muestre en vivo cuánto vale responder bien (base + extra por rapidez).
    bonus: { base: config.bonusAcierto, speedMax: config.bonusRapidezMax },
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
    this.ajustes = {};
    this.preguntaEnCurso = null; // índice de la pregunta que se está respondiendo
    this.ultimoRevelado = null; // { ...resumen, at } para el host que recarga en pleno revelado
    this.final = null;
  }

  get activa() {
    return Boolean(this.guion) && !this.terminada;
  }

  iniciar(ajustes = {}) {
    this.detener();
    this.ajustes = filtrarAjustes(ajustes);
    const config = this.configActual;
    this.preguntas = prepararPreguntas(this.banco, config);
    this.guion = crearGuion(config, this.preguntas, this.ahora() + 1500);
    this.revelados.clear();
    this.terminada = false;
    this.sala.limpiarLiberados();
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

  /** Configuración de la partida en curso: la de config.json con los ajustes del lobby encima. */
  get configActual() {
    return { ...this.config, ...this.ajustes };
  }

  detener() {
    for (const t of this.temporizadores) clearTimeout(t);
    this.temporizadores = [];
    this.guion = null;
    this.terminada = false;
    this.preguntaEnCurso = null;
    this.ultimoRevelado = null;
    this.final = null;
  }

  programar(hora, fn) {
    this.temporizadores.push(setTimeout(fn, Math.max(0, hora - this.ahora())));
  }

  faseDePregunta(index) {
    return this.guion?.phases.find((f) => f.type === FASES.PREGUNTA && f.index === index);
  }

  /** Lo que ven los celulares y el proyector de una pregunta (nunca la respuesta correcta). */
  datosPregunta(index) {
    const p = this.preguntas[index];
    const fase = this.faseDePregunta(index);
    return {
      index,
      number: index + 1,
      total: this.preguntas.length,
      text: p.text,
      options: p.options,
      shortOptions: p.shortOptions,
      timeLimit: p.timeLimit,
      startsAt: fase.startsAt,
      endsAt: fase.startsAt + fase.duration,
    };
  }

  empezarPregunta(index) {
    this.preguntaEnCurso = index;
    this.enviar('todos', 'question:start', this.datosPregunta(index));
  }

  /** Carril elegido mientras corre la pregunta: solo sirve para el contador "posicionados" del proyector. */
  registrarCarril(grupo, datos) {
    const index = Number(datos?.index);
    const lane = Number(datos?.lane);
    if (!this.activa || index !== this.preguntaEnCurso || !Number.isInteger(lane)) return;
    grupo.carriles.set(index, lane);
  }

  /** Grupos que ya eligieron carril en la pregunta en curso (sin revelar cuál). */
  posicionados() {
    const index = this.preguntaEnCurso;
    if (index == null) return null;
    let count = 0;
    for (const g of this.sala.grupos.values()) if (g.carriles.has(index) || g.respuestas.has(index)) count++;
    return { index, count, total: this.sala.grupos.size };
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
    if (Number.isFinite(datos.dodged)) grupo.esquivados = datos.dodged;
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
    // Con 2 opciones el tercer carril es una pared: no cuenta como respuesta válida.
    const correct = lane === p.correctIndex;
    // Desde cuándo estaba en ese carril: cuanto antes lo eligió y lo mantuvo, más bonus.
    const desde = Math.min(Math.max(Number(datos.since) || fin, fase.startsAt), fin);
    let bonus = 0;
    let speedBonus = 0;
    if (correct) {
      const rapidez = 1 - (desde - fase.startsAt) / fase.duration;
      speedBonus = Math.round(this.config.bonusRapidezMax * rapidez);
      bonus = this.config.bonusAcierto + speedBonus;
      grupo.bonus += bonus;
    }
    const resultado = { index, lane, correct, bonus, speedBonus, demora: Math.round(desde - fase.startsAt) };
    grupo.respuestas.set(index, resultado);

    // Si ya se reveló (llegó tarde por un corte), se informa enseguida.
    if (this.revelados.has(index)) {
      this.enviar(grupo.numero, 'question:result', resultado);
      // El host actualiza el número de aciertos (sin volver a mostrar el revelado si ya pasó).
      this.enviar('hosts', 'question:reveal', { ...this.resumenPregunta(index), late: true });
    }
    return { ok: true };
  }

  revelar(index) {
    this.revelados.add(index);
    if (this.preguntaEnCurso === index) this.preguntaEnCurso = null;
    for (const g of this.sala.grupos.values()) {
      const r = g.respuestas.get(index);
      if (r) this.enviar(g.numero, 'question:result', r);
    }
    const resumen = this.resumenPregunta(index);
    this.ultimoRevelado = { ...resumen, at: this.ahora() };
    this.enviar('hosts', 'question:reveal', resumen);
  }

  resumenPregunta(index) {
    const { correctRate, ...resumen } = estadisticaPregunta(this.preguntas[index], index, this.sala.jugadores);
    return resumen;
  }

  ranking() {
    return ordenarLlegada(this.sala.grupos.values());
  }

  posiciones() {
    return this.ranking().map((g) => [g.numero, Math.round(g.distanciaTotal), 0, g.conectado ? 1 : 0]);
  }

  terminar() {
    this.terminada = true;
    this.preguntaEnCurso = null;
    const [ganador, ...cola] = this.ranking();
    this.final = {
      winner: ganador?.numero ?? null,
      queue: cola.map((g) => g.numero),
      questions: this.preguntas.length,
      stats: this.ranking().map((g, i) => ({
        group: g.numero,
        position: i + 1,
        distance: Math.round(g.distanciaTotal),
        correct: g.aciertos,
        hits: g.choques,
        dodged: g.esquivados,
        jumps: g.saltos,
        likes: g.likes,
      })),
    };
    this.enviar('todos', 'game:end', this.final);
  }

  /** Preguntas más erradas, con su distribución y explicación, para el repaso del final. */
  repaso() {
    if (!this.guion) return [];
    return elegirRepaso(this.preguntas, this.sala.jugadores, this.configActual.preguntasEnRepaso);
  }

  /** Pregunta que se está respondiendo ahora (para quien entra o recarga en plena pregunta). */
  preguntaActual() {
    return this.activa && this.preguntaEnCurso != null ? this.datosPregunta(this.preguntaEnCurso) : null;
  }

  /** Todo lo que necesita un proyector que recarga en plena partida. */
  estadoHost() {
    if (!this.guion) return null;
    return {
      script: this.guion,
      question: this.preguntaActual(),
      reveal: this.ultimoRevelado,
      positioned: this.posicionados(),
      final: this.final,
    };
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
      question: this.preguntaActual(),
      position: ranking.indexOf(grupo) + 1,
      total: ranking.length,
      final: this.final,
    };
  }
}

const AJUSTES_PERMITIDOS = ['cantidadPreguntas', 'duracionTramo', 'tiempoPorDefecto', 'dificultadObstaculos', 'preguntasEnRepaso'];

function filtrarAjustes(ajustes) {
  const salida = {};
  for (const k of AJUSTES_PERMITIDOS) if (ajustes[k] !== undefined) salida[k] = ajustes[k];
  if (salida.cantidadPreguntas !== undefined) salida.cantidadPreguntas = Math.max(1, Math.min(12, Number(salida.cantidadPreguntas) || 1));
  if (salida.duracionTramo !== undefined) salida.duracionTramo = Math.max(1, Number(salida.duracionTramo) || 15);
  if (salida.tiempoPorDefecto !== undefined) salida.tiempoPorDefecto = Math.max(1, Number(salida.tiempoPorDefecto) || 15);
  if (salida.preguntasEnRepaso !== undefined) salida.preguntasEnRepaso = Math.max(0, Math.min(12, Math.round(Number(salida.preguntasEnRepaso)) || 0));
  if (!['facil', 'normal', 'caotico'].includes(salida.dificultadObstaculos)) delete salida.dificultadObstaculos;
  return salida;
}
