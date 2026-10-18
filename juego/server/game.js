import { randomInt } from 'node:crypto';
import { FASES } from '../public/shared/constantes.js';
import {
  VENTAJAS, PODERES, DURACION_ALGORITMO, TOPE_ALGORITMO, AFECTADOS_ALGORITMO, DURACION_ARRANQUE_LENTO, recibeImpulso,
} from '../public/shared/poderes.js';
import { estadisticaPregunta, elegirRepaso, ordenarLlegada } from './stats.js';

// Guion de la partida, preguntas, respuestas y posiciones.
// El celular sigue el guion solo (aunque se corte la red); el servidor solo
// valida respuestas, suma bonus y arma el ranking.

const ESPERA_REVELADO = 1000; // ms después del límite de cada pregunta
const MARGEN_RELOJ = 1000; // ms de diferencia de reloj tolerada en la hora informada
// Si un celular deja de mandar su distancia, el proyector lo sigue avanzando con su última
// velocidad (hasta PREDICCION_MAX) y, pasado SIN_DATOS, lo muestra atenuado (sección 5.4).
const PREDICCION_DESDE = 600;
const PREDICCION_MAX = 4000;
const SIN_DATOS = 5000;
const FASES_CORRIENDO = new Set([FASES.TRAMO, FASES.PREGUNTA, FASES.SPRINT]);

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
    this.empezadas = new Set(); // preguntas que ya se mostraron (para no repetirlas al reprogramar)
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
    this.empezadas.clear();
    this.terminada = false;
    this.sala.limpiarLiberados();
    for (const g of this.sala.grupos.values()) g.reiniciarPartida();

    this.programarGuion();
    this.enviar('todos', 'game:script', this.guion);
    return this.guion;
  }

  /** Programa lo que falta del guion: preguntas, revelados y el final. Se rehace al pausar o saltar. */
  programarGuion() {
    this.limpiarTemporizadores();
    for (const fase of this.guion.phases) {
      if (fase.type === FASES.PREGUNTA) {
        if (!this.empezadas.has(fase.index)) this.programar(fase.startsAt, () => this.empezarPregunta(fase.index));
        if (!this.revelados.has(fase.index)) this.programar(fase.startsAt + fase.duration + ESPERA_REVELADO, () => this.revelar(fase.index));
      }
      if (fase.type === FASES.FIN && !this.terminada) this.programar(fase.startsAt, () => this.terminar());
    }
  }

  limpiarTemporizadores() {
    for (const t of this.temporizadores) clearTimeout(t);
    this.temporizadores = [];
  }

  /** El guion cambió (pausa, salto o final adelantado): se manda de nuevo con el mismo id. */
  publicarGuion() {
    this.guion.revision = (this.guion.revision ?? 0) + 1;
    this.enviar('todos', 'game:script', this.guion);
  }

  get pausada() {
    return Boolean(this.guion?.pausedAt);
  }

  // ---------- Controles del presentador (sección 4.1) ----------

  /**
   * Congela la partida: los celulares y el proyector dejan de avanzar en la hora `pausedAt`.
   * No se puede pausar la llegada (ya terminó la carrera).
   */
  pausar() {
    if (!this.activa || this.pausada) return false;
    const ahora = this.ahora();
    if (this.faseEn(ahora)?.type === FASES.FIN) return false;
    this.limpiarTemporizadores();
    this.guion.pausedAt = ahora;
    this.publicarGuion();
    return true;
  }

  /** Sigue desde donde se pausó: todo lo que faltaba se corre lo que duró la pausa. */
  reanudar() {
    if (!this.activa || !this.pausada) return false;
    this.quitarPausa();
    this.programarGuion();
    this.publicarGuion();
    return true;
  }

  quitarPausa() {
    const desde = this.guion.pausedAt;
    this.guion.pausedAt = null;
    this.desplazar(desde, this.ahora() - desde);
  }

  /**
   * Termina ya la fase en curso y sigue con la siguiente: un tramo salta a su pregunta y una
   * pregunta se cierra con el carril que tenga cada grupo (y se revela enseguida).
   */
  saltar() {
    if (!this.activa) return false;
    if (this.pausada) this.quitarPausa();
    const ahora = this.ahora();
    const f = this.faseEn(ahora);
    if (f?.type === FASES.FIN) return false;
    const fin = f ? f.startsAt + f.duration : this.guion.startsAt;
    if (fin > ahora) {
      // Un celular que no recibió el guion nuevo a tiempo responde con la hora original: se le acepta.
      if (f?.type === FASES.PREGUNTA) f.cut ??= fin;
      this.desplazar(ahora, ahora - fin);
    }
    this.programarGuion();
    this.publicarGuion();
    return true;
  }

  /**
   * Termina la carrera ahora, con el ganador de este momento. La pregunta que estaba en curso
   * (sin revelar) no cuenta; las que no llegaron a jugarse quedan afuera del repaso.
   */
  terminarYa() {
    if (!this.activa) return false;
    if (this.pausada) this.quitarPausa();
    const ahora = this.ahora();
    this.limpiarTemporizadores();
    const g = this.guion;
    // Una pregunta que ya cerró pero todavía esperaba su revelado se revela ahora.
    for (const f of g.phases) {
      if (f.type === FASES.PREGUNTA && f.startsAt + f.duration <= ahora && this.empezadas.has(f.index) && !this.revelados.has(f.index)) {
        this.revelar(f.index);
      }
    }
    g.phases = g.phases.filter((f) => f.type !== FASES.FIN && f.startsAt < ahora);
    const ultima = g.phases.at(-1);
    if (ultima) ultima.duration = Math.min(ultima.duration, ahora - ultima.startsAt);
    g.phases.push({ type: FASES.FIN, startsAt: ahora, duration: 0 });
    g.startsAt = Math.min(g.startsAt, ahora);
    this.preguntaEnCurso = null;
    this.publicarGuion();
    this.terminar();
    return true;
  }

  /**
   * Corre en `delta` ms todo lo que pasa desde la hora `desde`: las fases que faltan, la que está en
   * curso (se alarga o se acorta), las ventajas y el Cambio de algoritmo. Los celulares aplican el
   * mismo corrimiento a sus horas (lo reciben en `shifts`).
   */
  desplazar(desde, delta) {
    const g = this.guion;
    if (g.startsAt >= desde) g.startsAt += delta;
    for (const f of g.phases) {
      if (f.startsAt >= desde) f.startsAt += delta;
      else if (f.startsAt + f.duration > desde) f.duration += delta;
    }
    const mover = (t) => (t > desde ? t + delta : t);
    for (const grupo of this.sala.grupos.values()) {
      if (grupo.ventaja) {
        grupo.ventaja.desde = mover(grupo.ventaja.desde);
        grupo.ventaja.hasta = mover(grupo.ventaja.hasta);
      }
      grupo.algoritmoHasta = mover(grupo.algoritmoHasta);
    }
    (g.shifts ??= []).push({ from: desde, delta });
  }

  /** Configuración de la partida en curso: la de config.json con los ajustes del lobby encima. */
  get configActual() {
    return { ...this.config, ...this.ajustes };
  }

  detener() {
    this.limpiarTemporizadores();
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

  /** Fase del guion a la hora `t` del servidor (o null antes de empezar). */
  faseEn(t) {
    const fases = this.guion?.phases ?? [];
    for (let i = fases.length - 1; i >= 0; i--) if (t >= fases[i].startsAt) return fases[i];
    return null;
  }

  /** Fin del tramo (o del sprint) que empieza al terminar la pregunta `index`: hasta ahí dura la ventaja. */
  finTramoSiguiente(index) {
    const fases = this.guion.phases;
    const i = fases.findIndex((f) => f.type === FASES.PREGUNTA && f.index === index);
    const siguiente = fases[i + 1];
    return siguiente.startsAt + siguiente.duration;
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
    this.empezadas.add(index);
    this.preguntaEnCurso = index;
    this.enviar('todos', 'question:start', this.datosPregunta(index));
    // Los Pase 50/50 guardados se aplican en la primera pregunta de 3 opciones.
    for (const g of this.sala.grupos.values()) if (g.cincuenta) this.cerrarArco(g, index);
  }

  /** Pase 50/50: cierra uno de los arcos incorrectos de la pregunta `index` para ese grupo. */
  cerrarArco(grupo, index) {
    const p = this.preguntas[index];
    if (p.options.length < 3 || grupo.respuestas.has(index)) return null;
    const incorrectas = p.options.map((_, i) => i).filter((i) => i !== p.correctIndex);
    const lane = incorrectas[randomInt(incorrectas.length)];
    grupo.cincuenta = false;
    grupo.cerradas.set(index, lane);
    this.enviar(grupo.numero, 'question:closed', { index, lane });
    return lane;
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
    if (!(dada <= Math.max(fin, fase.cut ?? 0) + MARGEN_RELOJ) || llegada > fin + this.config.toleranciaRespuestaTardia * 1000) {
      return { ok: false, motivo: 'too_late' };
    }

    const config = this.configActual;
    const p = this.preguntas[index];
    const lane = Number(datos.lane);
    // Con 2 opciones el tercer carril es una pared (y el del Pase 50/50 está cerrado): nunca es la correcta.
    const correct = lane === p.correctIndex;
    // Desde cuándo estaba en ese carril: cuanto antes lo eligió y lo mantuvo, más bonus.
    const desde = Math.min(Math.max(Number(datos.since) || fin, fase.startsAt), fin);
    let bonus = 0;
    let speedBonus = 0;
    const resultado = { index, lane, correct, bonus, speedBonus, demora: Math.round(desde - fase.startsAt) };
    if (correct) {
      const rapidez = 1 - (desde - fase.startsAt) / fase.duration;
      speedBonus = Math.round(config.bonusRapidezMax * rapidez);
      bonus = config.bonusAcierto + speedBonus;
      // Hype: la respuesta correcta vale el doble (y se gasta).
      if (grupo.hype) {
        bonus *= 2;
        grupo.hype = false;
        resultado.hype = true;
      }
      grupo.bonus += bonus;
      Object.assign(resultado, { bonus, speedBonus }, this.premiar(grupo, index, config));
    } else {
      grupo.racha = 0;
      resultado.slowStart = DURACION_ARRANQUE_LENTO;
    }
    grupo.respuestas.set(index, resultado);

    // Si ya se reveló (llegó tarde por un corte), se informa enseguida.
    if (this.revelados.has(index)) {
      this.enviar(grupo.numero, 'question:result', resultado);
      // El host actualiza el número de aciertos (sin volver a mostrar el revelado si ya pasó).
      this.enviar('hosts', 'question:reveal', { ...this.resumenPregunta(index), late: true });
    }
    return { ok: true };
  }

  /**
   * Ventaja para el tramo que empieza (activa desde que se cruza el arco hasta el final de ese tramo)
   * y, con la racha, un poder si el grupo no tiene uno guardado.
   */
  premiar(grupo, index, config) {
    const ids = Object.keys(VENTAJAS);
    const advantageId = ids[randomInt(ids.length)];
    const fin = this.faseDePregunta(index);
    grupo.ventaja = { id: advantageId, desde: fin.startsAt + fin.duration, hasta: this.finTramoSiguiente(index) };
    const premio = { advantageId, advantageUntil: grupo.ventaja.hasta };

    if (!config.poderesActivos) return premio;
    grupo.racha++;
    premio.streak = grupo.racha;
    if (grupo.racha >= config.rachaParaPoder) {
      grupo.racha = 0;
      if (!grupo.poder) {
        grupo.poder = this.sortearPoder(index);
        premio.powerId = grupo.poder;
      }
    }
    return premio;
  }

  /** Solo se sortean poderes que todavía sirven: Hype y 50/50 necesitan preguntas por delante. */
  sortearPoder(index) {
    const quedan = this.preguntas.slice(index + 1);
    const opciones = ['algoritmo'];
    if (quedan.length) opciones.push('hype');
    if (quedan.some((p) => p.options.length === 3)) opciones.push('cincuenta');
    return opciones[randomInt(opciones.length)];
  }

  /**
   * El grupo usa su poder guardado: { powerId, useId }.
   * El celular lo reintenta hasta el ack, así que el mismo useId se aplica una sola vez.
   */
  usarPoder(grupo, datos) {
    const powerId = String(datos?.powerId ?? '');
    const useId = String(datos?.useId ?? '');
    if (useId && grupo.usos.has(useId)) return { ok: true, repetida: true, powerId };
    if (!this.activa) return { ok: false, motivo: 'no_game' };
    if (this.pausada) return { ok: false, motivo: 'paused' };
    if (!PODERES[powerId] || grupo.poder !== powerId) return { ok: false, motivo: 'no_power' };
    if (useId) grupo.usos.add(useId);
    grupo.poder = null;
    grupo.poderesUsados++;
    const ahora = this.ahora();
    const r = { ok: true, powerId };

    if (powerId === 'algoritmo') {
      // A los que van primeros (sin contar a quien lo usa) les aparecen más obstáculos.
      const afectados = this.ranking().filter((g) => g !== grupo).slice(0, AFECTADOS_ALGORITMO);
      for (const g of afectados) {
        // No se acumula: se extiende la duración, con un tope.
        g.algoritmoHasta = Math.min(Math.max(g.algoritmoHasta, ahora) + DURACION_ALGORITMO, ahora + TOPE_ALGORITMO);
        this.enviar(g.numero, 'run:modifiers', { extraObstacles: g.algoritmoHasta, by: grupo.numero });
      }
      r.targets = afectados.map((g) => g.numero);
    } else if (powerId === 'cincuenta') {
      // Si hay una pregunta en curso se aplica ya; si no, en la próxima de 3 opciones.
      grupo.cincuenta = true;
      const enCurso = this.preguntaEnCurso;
      const fase = this.faseEn(ahora);
      if (enCurso != null && fase?.type === FASES.PREGUNTA && fase.index === enCurso) {
        const lane = this.cerrarArco(grupo, enCurso);
        if (lane != null) r.closed = { index: enCurso, lane };
      }
    } else if (powerId === 'hype') {
      grupo.hype = true;
    }
    this.enviar('hosts', 'power:used', { group: grupo.numero, powerId, targets: r.targets ?? [] });
    return r;
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

  /**
   * Para el mapa del proyector: [número, distancia, ventaja activa, conectado], de la primera a la última.
   * Si un grupo dejó de mandar datos en plena carrera (un microcorte), su marcador sigue avanzando con
   * la última velocidad conocida unos segundos y, si no vuelve, se ve atenuado.
   */
  posiciones() {
    const ahora = this.ahora();
    const corriendo = !this.pausada && FASES_CORRIENDO.has(this.faseEn(ahora)?.type);
    return this.sala.jugadores
      .map((g) => {
        let distancia = g.distanciaTotal;
        let vivo = g.conectado;
        if (corriendo && g.ultimoDato) {
          const sinDatos = ahora - g.ultimoDato;
          if (sinDatos > PREDICCION_DESDE) distancia += (g.velocidad * Math.min(sinDatos, PREDICCION_MAX)) / 1000;
          vivo = sinDatos < SIN_DATOS;
        }
        const v = g.ventaja;
        // Se ve desde el revelado, igual que en el celular.
        const ventaja = v && ahora >= v.desde + ESPERA_REVELADO && ahora < v.hasta ? v.id : 0;
        return [g.numero, Math.round(distancia), ventaja, vivo ? 1 : 0];
      })
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  }

  /** Puesto de un grupo para su celular, con el impulso de emparejar si va en el último cuarto. */
  rango(posicion, total) {
    return { position: posicion, total, catchUp: Boolean(this.configActual.emparejar) && recibeImpulso(posicion, total) };
  }

  terminar() {
    this.terminada = true;
    this.preguntaEnCurso = null;
    const [ganador, ...cola] = this.ranking();
    this.final = {
      winner: ganador?.numero ?? null,
      queue: cola.map((g) => g.numero),
      // Si el presentador terminó antes, solo cuentan las preguntas que llegaron a revelarse.
      questions: this.revelados.size,
      stats: this.ranking().map((g, i) => ({
        group: g.numero,
        position: i + 1,
        distance: Math.round(g.distanciaTotal),
        correct: g.aciertos,
        hits: g.choques,
        dodged: g.esquivados,
        jumps: g.saltos,
        likes: g.likes,
        powers: g.poderesUsados,
      })),
    };
    this.enviar('todos', 'game:end', this.final);
  }

  /** Preguntas más erradas, con su distribución y explicación, para el repaso del final. */
  repaso() {
    if (!this.guion) return [];
    return elegirRepaso(this.preguntas, this.sala.jugadores, this.configActual.preguntasEnRepaso, this.revelados);
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
    const ahora = this.ahora();
    const enCurso = this.preguntaEnCurso;
    const v = grupo.ventaja;
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
      catchUp: this.rango(ranking.indexOf(grupo) + 1, ranking.length).catchUp,
      final: this.final,
      // Ventajas y poderes: el celular que recarga o reconecta los retoma donde estaban.
      advantage: v && ahora < v.hasta && this.revelados.has(this.indiceRespondido(v)) ? { id: v.id, until: v.hasta } : null,
      power: grupo.poder,
      hype: grupo.hype,
      fiftyFifty: grupo.cincuenta,
      closed: enCurso != null && grupo.cerradas.has(enCurso) ? { index: enCurso, lane: grupo.cerradas.get(enCurso) } : null,
      extraObstacles: grupo.algoritmoHasta > ahora ? grupo.algoritmoHasta : 0,
      streak: grupo.racha,
    };
  }

  /** Pregunta cuya respuesta correcta dio la ventaja `v` (la que termina justo cuando empieza la ventaja). */
  indiceRespondido(v) {
    return this.guion?.phases.find((f) => f.type === FASES.PREGUNTA && f.startsAt + f.duration === v.desde)?.index;
  }
}

const AJUSTES_PERMITIDOS = [
  'cantidadPreguntas', 'duracionTramo', 'tiempoPorDefecto', 'dificultadObstaculos', 'preguntasEnRepaso', 'poderesActivos', 'emparejar',
];

function filtrarAjustes(ajustes) {
  const salida = {};
  for (const k of AJUSTES_PERMITIDOS) if (ajustes[k] !== undefined) salida[k] = ajustes[k];
  if (salida.cantidadPreguntas !== undefined) salida.cantidadPreguntas = Math.max(1, Math.min(12, Number(salida.cantidadPreguntas) || 1));
  if (salida.duracionTramo !== undefined) salida.duracionTramo = Math.max(1, Number(salida.duracionTramo) || 15);
  if (salida.tiempoPorDefecto !== undefined) salida.tiempoPorDefecto = Math.max(1, Number(salida.tiempoPorDefecto) || 15);
  if (salida.preguntasEnRepaso !== undefined) salida.preguntasEnRepaso = Math.max(0, Math.min(12, Math.round(Number(salida.preguntasEnRepaso)) || 0));
  if (!['facil', 'normal', 'caotico'].includes(salida.dificultadObstaculos)) delete salida.dificultadObstaculos;
  for (const k of ['poderesActivos', 'emparejar']) if (salida[k] !== undefined) salida[k] = Boolean(salida[k]);
  return salida;
}
