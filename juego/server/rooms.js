import { randomInt, randomUUID } from 'node:crypto';
import { VALOR_LIKE } from '../public/shared/constantes.js';

// Salas con código de 4 letras. Cada grupo (1 a maxGrupos) queda atado a un celular
// mediante un token de dispositivo que el celular guarda en localStorage (sección 3.8).

// Sin I, L, O ni Q: no se confunden con 1 y 0 al copiarlas del proyector.
const LETRAS = 'ABCDEFGHJKMNPRSTUVWXYZ';
const LARGO_CODIGO = 4;

export function normalizarCodigo(codigo) {
  return String(codigo ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, LARGO_CODIGO);
}

export class Salas {
  constructor() {
    /** @type {Map<string, Sala>} */
    this.porCodigo = new Map();
  }

  crear(maxGrupos) {
    let codigo;
    do {
      codigo = Array.from({ length: LARGO_CODIGO }, () => LETRAS[randomInt(LETRAS.length)]).join('');
    } while (this.porCodigo.has(codigo));
    const sala = new Sala(codigo, maxGrupos);
    this.porCodigo.set(codigo, sala);
    return sala;
  }

  get(codigo) {
    return this.porCodigo.get(normalizarCodigo(codigo)) ?? null;
  }

  borrar(codigo) {
    this.porCodigo.delete(codigo);
  }

  [Symbol.iterator]() {
    return this.porCodigo.values();
  }

  get size() {
    return this.porCodigo.size;
  }
}

export class Sala {
  constructor(codigo, maxGrupos) {
    this.codigo = codigo;
    this.claveHost = randomUUID();
    this.maxGrupos = maxGrupos;
    /** @type {Map<number, Grupo>} grupos que alguna vez tuvieron celular (aunque estén liberados) */
    this.grupos = new Map();
    this.tokens = new Map(); // token → número de grupo
    this.partida = null;
    this.ultimaActividad = Date.now();
  }

  /**
   * Intenta asociar un celular a un grupo.
   * Con un token conocido vuelve siempre a su grupo; sin token solo entra a un grupo libre.
   * Un grupo liberado por el presentador se retoma conservando la distancia y las estadísticas.
   */
  unir(numero, token) {
    const delToken = token && this.tokens.get(token);
    if (delToken) return { ok: true, grupo: this.grupos.get(delToken) };

    if (!Number.isInteger(numero) || numero < 1 || numero > this.maxGrupos) {
      return { ok: false, motivo: 'invalid_group' };
    }
    let grupo = this.grupos.get(numero);
    if (grupo && !grupo.libre) return { ok: false, motivo: 'taken' };

    if (grupo) {
      grupo.token = randomUUID();
      grupo.libre = false;
    } else {
      grupo = new Grupo(numero, randomUUID());
      this.grupos.set(numero, grupo);
    }
    this.tokens.set(grupo.token, numero);
    return { ok: true, grupo };
  }

  /** El celular del grupo se quedó sin batería: otro celular lo puede retomar. */
  liberar(numero) {
    const grupo = this.grupos.get(numero);
    if (!grupo || grupo.libre) return null;
    this.tokens.delete(grupo.token);
    grupo.token = null;
    grupo.libre = true;
    grupo.conectado = false;
    grupo.socketId = null;
    // Sin partida en curso no hay nada que conservar: el número queda como nuevo.
    if (!this.partida?.guion) this.grupos.delete(numero);
    return grupo;
  }

  /** Al volver al lobby, los grupos liberados que nadie retomó quedan libres del todo. */
  limpiarLiberados() {
    for (const [n, g] of this.grupos) if (g.libre) this.grupos.delete(n);
  }

  liberarTodos() {
    this.grupos.clear();
    this.tokens.clear();
  }

  /** Grupos que están jugando (con celular asignado o liberados en plena partida). */
  get jugadores() {
    return [...this.grupos.values()];
  }

  get ocupados() {
    let n = 0;
    for (const g of this.grupos.values()) if (!g.libre) n++;
    return n;
  }

  conectados() {
    let n = 0;
    for (const g of this.grupos.values()) if (g.conectado) n++;
    return n;
  }

  resumen() {
    const lista = [];
    for (let n = 1; n <= this.maxGrupos; n++) {
      const g = this.grupos.get(n);
      lista.push({ number: n, taken: Boolean(g && !g.libre), connected: Boolean(g?.conectado) });
    }
    return lista;
  }
}

export class Grupo {
  constructor(numero, token) {
    this.numero = numero;
    this.token = token;
    this.libre = false;
    this.conectado = false;
    this.socketId = null;
    this.reiniciarPartida();
  }

  reiniciarPartida() {
    this.ultimoDato = 0; // hora del último run:progress (para predecir su marcador si deja de llegar)
    this.distanciaCorrida = 0;
    this.velocidad = 0;
    this.bonus = 0;
    this.choques = 0;
    this.saltos = 0;
    this.likes = 0;
    this.esquivados = 0;
    /** índice de pregunta → { index, lane, correct, bonus, demora } */
    this.respuestas = new Map();
    /** índice de pregunta → último carril informado mientras corre la pregunta */
    this.carriles = new Map();
    // Ventajas y poderes (Fase 3).
    this.racha = 0;
    this.poder = null; // poder guardado (uno a la vez)
    this.poderesUsados = 0;
    this.usos = new Set(); // ids de uso ya aplicados (el celular reintenta hasta el ack)
    this.hype = false; // la próxima respuesta correcta vale el doble
    this.cincuenta = false; // Pase 50/50 esperando una pregunta de 3 opciones
    /** índice de pregunta → carril incorrecto que se cerró con el Pase 50/50 */
    this.cerradas = new Map();
    this.ventaja = null; // { id, desde, hasta } en hora del servidor
    this.algoritmoHasta = 0; // hasta cuándo le aparecen más obstáculos (Cambio de algoritmo de otro grupo)
  }

  /** Corrida (la calcula el celular) + bonus de las respuestas (el servidor) + likes juntados. */
  get distanciaTotal() {
    return this.distanciaCorrida + this.bonus + this.likes * VALOR_LIKE;
  }

  get aciertos() {
    let n = 0;
    for (const r of this.respuestas.values()) if (r.correct) n++;
    return n;
  }

  /** Suma de lo que tardó en elegir el carril de cada respuesta correcta (desempate final). */
  get demoraTotal() {
    let ms = 0;
    for (const r of this.respuestas.values()) if (r.correct) ms += r.demora;
    return ms;
  }
}
