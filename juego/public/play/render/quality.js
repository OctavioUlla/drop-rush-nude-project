// Calidad automática (sección 5.3): mide los FPS y ajusta la resolución de a poco.
// Tres niveles; el jugador puede fijar uno a mano y la elección queda guardada.

// `particulas`: cuántas por ráfaga (1 = todas); `lineas`: líneas de velocidad con el turbo;
// `fpsMax`: en baja se dibuja a 30 FPS como máximo, para que el celular no se caliente (sección 12).
export const NIVELES = {
  alta: { dprMax: 1.5, dprMin: 1.0, distancia: 120, detalle: 2, particulas: 1, lineas: true, fpsMax: null },
  media: { dprMax: 1.0, dprMin: 0.85, distancia: 105, detalle: 1, particulas: 0.5, lineas: false, fpsMax: null },
  baja: { dprMax: 0.75, dprMin: 0.6, distancia: 85, detalle: 0, particulas: 0, lineas: false, fpsMax: 30 },
};
const ORDEN = ['alta', 'media', 'baja'];
const CLAVE = 'dropRush.calidad';

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) || 'auto';
  } catch {
    return 'auto';
  }
}

export class Calidad {
  constructor({ alCambiarNivel, forzada } = {}) {
    this.alCambiarNivel = alCambiarNivel;
    this.preferencia = forzada || leerPreferencia(); // 'auto' | 'alta' | 'media' | 'baja'
    // En automático se arranca en alta y se baja mientras el grupo practica en el lobby.
    this.nivel = this.preferencia === 'auto' ? 'alta' : this.preferencia;
    this.dpr = Math.min(window.devicePixelRatio || 1, NIVELES[this.nivel].dprMax);
    this.ventana = { cuadros: 0, tiempo: 0 };
    this.lentas = 0;
    this.rapidas = 0;
    this.fps = 0;
    this.historial = []; // duración de cada cuadro (ms) para las mediciones
  }

  get config() {
    return NIVELES[this.nivel];
  }

  elegir(preferencia) {
    this.preferencia = preferencia;
    try {
      localStorage.setItem(CLAVE, preferencia);
    } catch {
      /* modo privado: no se guarda */
    }
    this.cambiarNivel(preferencia === 'auto' ? 'alta' : preferencia);
  }

  cambiarNivel(nivel) {
    if (nivel === this.nivel) return;
    this.nivel = nivel;
    this.dpr = Math.min(window.devicePixelRatio || 1, NIVELES[nivel].dprMax);
    this.alCambiarNivel?.(nivel);
  }

  /** Se llama una vez por cuadro con su duración en segundos. */
  registrar(dt) {
    this.historial.push(dt * 1000);
    if (this.historial.length > 600) this.historial.shift();
    this.ventana.cuadros++;
    this.ventana.tiempo += dt;
    if (this.ventana.tiempo < 2) return false;

    this.fps = this.ventana.cuadros / this.ventana.tiempo;
    this.ventana.cuadros = 0;
    this.ventana.tiempo = 0;
    if (this.preferencia !== 'auto') return false;

    const { dprMin, dprMax, fpsMax } = this.config;
    const dprTope = Math.min(window.devicePixelRatio || 1, dprMax);
    // Con el tope de 30 FPS de la calidad baja, "lento" y "rápido" se miden contra ese tope.
    const objetivo = fpsMax ?? 60;
    this.lentas = this.fps < objetivo * 0.75 ? this.lentas + 1 : 0;
    this.rapidas = this.fps > objetivo * 0.95 ? this.rapidas + 1 : 0;

    if (this.lentas >= 2) {
      this.lentas = 0;
      if (this.dpr > dprMin + 0.01) {
        this.dpr = Math.max(dprMin, this.dpr - 0.15);
      } else {
        const i = ORDEN.indexOf(this.nivel);
        if (i < ORDEN.length - 1) this.cambiarNivel(ORDEN[i + 1]);
      }
      return true;
    }
    // Hacia arriba solo se recupera resolución dentro del nivel: subir de nivel
    // haría que la calidad oscile entre dos niveles en celulares justos.
    if (this.rapidas >= 4 && this.dpr < dprTope - 0.01) {
      this.rapidas = 0;
      this.dpr = Math.min(dprTope, this.dpr + 0.15);
      return true;
    }
    return false;
  }
}

/** Resume una serie de duraciones de cuadro (ms): FPS medio, 1 % más lento y cuadros largos. */
export function resumirCuadros(duraciones) {
  if (!duraciones.length) return null;
  const orden = [...duraciones].sort((a, b) => a - b);
  const total = duraciones.reduce((s, d) => s + d, 0);
  const p99 = orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.99))];
  return {
    cuadros: duraciones.length,
    fpsMedio: +((duraciones.length * 1000) / total).toFixed(1),
    fps1Bajo: +(1000 / p99).toFixed(1),
    peorCuadroMs: +orden[orden.length - 1].toFixed(1),
    cuadrosLargos: +((duraciones.filter((d) => d > 34).length / duraciones.length) * 100).toFixed(1),
  };
}
