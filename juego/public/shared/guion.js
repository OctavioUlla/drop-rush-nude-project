import { FASES } from './constantes.js';

// Sigue el guion de la partida en hora del servidor. No necesita red:
// con el guion y el reloj sincronizado, cada celular sabe solo en qué fase está.
// Si el presentador pausa o salta una fase, el servidor manda el guion de nuevo (mismo id,
// `revision` nueva) con las horas corridas; `shifts` lista esos corrimientos en orden.

export class Guion {
  constructor(datos) {
    this.datos = datos;
    this.fases = datos.phases;
  }

  get id() {
    return this.datos.id;
  }

  /** El presentador pausó la partida: el guion queda congelado en `pausedAt`. */
  get pausada() {
    return Boolean(this.datos.pausedAt);
  }

  /** Hora del guion: la del servidor, salvo en pausa, que se queda en el momento en que se pausó. */
  tiempo(t) {
    const p = this.datos.pausedAt;
    return p ? Math.min(t, p) : t;
  }

  /** Fase en curso a la hora `t` (del servidor), o null si todavía no empezó. */
  faseEn(t) {
    if (t < this.datos.startsAt) return null;
    for (let i = this.fases.length - 1; i >= 0; i--) {
      const f = this.fases[i];
      if (t >= f.startsAt) return { ...f, numero: i, fin: f.startsAt + f.duration, restante: f.startsAt + f.duration - t };
    }
    return null;
  }

  /** Primer tramo de carrera (cuando termina la cuenta regresiva). */
  get largada() {
    return this.fases.find((f) => f.type !== FASES.CUENTA).startsAt;
  }
}
