// Constantes del juego compartidas entre el celular, el servidor y los bots.

export const CARRILES = [-2.2, 0, 2.2];

/** Pasos de simulación por segundo (independiente de los FPS). */
export const PASOS_POR_SEGUNDO = 60;

/** Velocidad base en unidades por segundo: un tramo de 15 s ≈ 140 unidades (sección 7). */
export const VELOCIDAD_BASE = 9.4;
/** Cuánto sube la velocidad por cada segundo de carrera (sube poco, a propósito). */
export const ACELERACION = 0.012;
export const VELOCIDAD_MAX = 13;

export const DURACION_SALTO = 0.6;
export const ALTURA_SALTO = 1.5;
export const TIEMPO_CAMBIO_CARRIL = 0.16;
/** Ventana en la que un gesto anticipado se guarda y se ejecuta igual. */
export const BUFFER_GESTO = 0.18;

export const FRENADO_CHOQUE = 1.0;
export const INVULNERABLE_CHOQUE = 1.5;

/** Cada cuánto el celular informa su distancia al servidor (ms). */
export const INTERVALO_PROGRESO = 250;

export const FASES = {
  CUENTA: 'cuenta',
  TRAMO: 'tramo',
  PREGUNTA: 'pregunta',
  SPRINT: 'sprint',
  FIN: 'fin',
};
