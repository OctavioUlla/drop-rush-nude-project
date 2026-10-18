// Constantes del juego compartidas entre el celular, el servidor y los bots.

export const CARRILES = [-2.2, 0, 2.2];

/** Pasos de simulación por segundo (independiente de los FPS). */
export const PASOS_POR_SEGUNDO = 60;

/** Velocidad base en unidades por segundo: un tramo de 15 s ≈ 140 unidades (sección 7). */
export const VELOCIDAD_BASE = 9.4;
/** Cuánto sube la velocidad por cada segundo de carrera (sube poco, a propósito). */
export const ACELERACION = 0.012;
export const VELOCIDAD_MAX = 13;

/**
 * Salto alto y "flotado", como en Subway Surfers: pasa sobre las vallas y cajas (a la cintura del corredor)
 * si se salta a tiempo, con unos 0,3 s de margen para elegir cuándo.
 * La cima queda por debajo de la cabeza del fan, para que no parezca que lo alto se puede saltar.
 */
export const DURACION_SALTO = 0.75;
export const ALTURA_SALTO = 1.9;
export const TIEMPO_CAMBIO_CARRIL = 0.16;
/** Ventana en la que un gesto anticipado se guarda y se ejecuta igual. */
export const BUFFER_GESTO = 0.18;

export const FRENADO_CHOQUE = 1.0;
export const INVULNERABLE_CHOQUE = 1.5;

/**
 * Metros extra que suma cada like. Hay muchos (como las monedas de Subway Surfers), así que cada uno
 * vale medio metro: aun juntando todos los que se pueden en la carrera (no se pueden tomar todos,
 * hay likes en más de un carril a la vez) suman menos que una respuesta correcta (sección 3.7).
 */
export const VALOR_LIKE = 0.5;

/** Cada cuánto el celular informa su distancia al servidor (ms). */
export const INTERVALO_PROGRESO = 250;

export const FASES = {
  CUENTA: 'cuenta',
  TRAMO: 'tramo',
  PREGUNTA: 'pregunta',
  SPRINT: 'sprint',
  FIN: 'fin',
};
