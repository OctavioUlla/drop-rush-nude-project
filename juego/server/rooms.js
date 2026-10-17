import { randomUUID } from 'node:crypto';

// Fase 0: una sola sala. Cada grupo (1 a maxGrupos) queda atado a un celular
// mediante un token de dispositivo que el celular guarda en localStorage.

export class Sala {
  constructor(maxGrupos) {
    this.maxGrupos = maxGrupos;
    /** @type {Map<number, Grupo>} */
    this.grupos = new Map();
    this.tokens = new Map(); // token → número de grupo
  }

  /**
   * Intenta asociar un celular a un grupo.
   * Con un token conocido vuelve siempre a su grupo; sin token solo entra a un grupo libre.
   */
  unir(numero, token) {
    const delToken = token && this.tokens.get(token);
    if (delToken) return { ok: true, grupo: this.grupos.get(delToken) };

    if (!Number.isInteger(numero) || numero < 1 || numero > this.maxGrupos) {
      return { ok: false, motivo: 'invalid_group' };
    }
    if (this.grupos.has(numero)) return { ok: false, motivo: 'taken' };

    const grupo = new Grupo(numero, randomUUID());
    this.grupos.set(numero, grupo);
    this.tokens.set(grupo.token, numero);
    return { ok: true, grupo };
  }

  liberarTodos() {
    this.grupos.clear();
    this.tokens.clear();
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
      lista.push({ number: n, taken: Boolean(g), connected: Boolean(g?.conectado) });
    }
    return lista;
  }
}

export class Grupo {
  constructor(numero, token) {
    this.numero = numero;
    this.token = token;
    this.conectado = false;
    this.socketId = null;
    this.ultimoDato = 0;
    this.reiniciarPartida();
  }

  reiniciarPartida() {
    this.distanciaCorrida = 0;
    this.velocidad = 0;
    this.bonus = 0;
    this.choques = 0;
    this.saltos = 0;
    this.likes = 0;
    /** índice de pregunta → { lane, correct, bonus } */
    this.respuestas = new Map();
  }

  get distanciaTotal() {
    return this.distanciaCorrida + this.bonus;
  }
}
