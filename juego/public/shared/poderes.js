// Ventajas por responder bien (sección 3.4) y poderes por racha (sección 3.6).
// Los comparten el celular, el proyector y el servidor.

/** Se activan al cruzar el arco correcto y duran todo el tramo que empieza. */
export const VENTAJAS = {
  turbo: { icono: '📱', nombre: 'Story de Bruno', efecto: 'Turbo: +40 % de velocidad' },
  escudo: { icono: '📸', nombre: 'UGC viral', efecto: 'Escudo: el primer choque no frena' },
  iman: { icono: '🧲', nombre: 'Imán de comunidad', efecto: 'Atrae los likes cercanos' },
  vip: { icono: '🏰', nombre: 'Ruta VIP Château', efecto: 'Menos obstáculos en tu calle' },
};

/** Se ganan con una racha de aciertos, se guardan (uno a la vez) y se usan con un botón. */
export const PODERES = {
  algoritmo: { icono: '📉', nombre: 'Cambio de algoritmo', efecto: 'Más obstáculos para el top 3 durante 5 s' },
  cincuenta: { icono: '🎟️', nombre: 'Pase 50/50', efecto: 'Cierra un arco incorrecto en la próxima pregunta' },
  hype: { icono: '🔥', nombre: 'Hype', efecto: 'Duplica el bonus de la próxima respuesta correcta' },
};

/** Multiplicadores de velocidad. */
export const TURBO = 1.4;
export const IMPULSO_EMPAREJAR = 1.1;
export const ARRANQUE_LENTO = 0.8;
/** Segundos de arranque lento después de una respuesta incorrecta (sección 3.5). */
export const DURACION_ARRANQUE_LENTO = 2;

/** Cambio de algoritmo: dura 5 s; si varios lo usan, se extiende hasta un tope de 10 s (no se acumula). */
export const DURACION_ALGORITMO = 5000;
export const TOPE_ALGORITMO = 10000;
export const AFECTADOS_ALGORITMO = 3;

/** El último cuarto de la tabla recibe el impulso (con al menos 4 grupos, si no no hay "cuarto"). */
export function recibeImpulso(posicion, total) {
  return total >= 4 && posicion > total * 0.75;
}
