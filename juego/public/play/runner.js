import {
  CARRILES, VELOCIDAD_BASE, ACELERACION, VELOCIDAD_MAX, DURACION_SALTO, ALTURA_SALTO,
  TIEMPO_CAMBIO_CARRIL, BUFFER_GESTO, FRENADO_CHOQUE, INVULNERABLE_CHOQUE,
} from '../shared/constantes.js';
import { TURBO, IMPULSO_EMPAREJAR, ARRANQUE_LENTO } from '../shared/poderes.js';
import { xObstaculo } from './track.js';

// Lógica del corredor a paso fijo (60 pasos por segundo, sin importar los FPS):
// un celular lento ve menos cuadros pero no choca distinto que uno rápido (sección 3.3).

// Distancia lateral al centro del carril a partir de la cual un obstáculo ya no toca (perdona los roces).
const ALCANCE_LATERAL = 0.95;
const MEDIO_LARGO = 0.35;

export class Corredor {
  constructor() {
    this.reiniciar();
  }

  reiniciar(distancia = 0) {
    this.distancia = distancia;
    this.carril = 1;
    this.x = CARRILES[1];
    this.y = 0;
    this.tSalto = -1; // −1 = en el piso
    this.velocidad = 0;
    this.tiempoCarrera = 0;
    this.frenado = 0;
    this.invulnerable = 0;
    this.lenta = 0; // segundos de arranque lento tras una respuesta incorrecta
    this.carrilMax = 2; // en una pregunta de 2 opciones el tercer carril es una pared
    this.cerrado = null; // carril cerrado por el Pase 50/50 (no se puede entrar)
    // Ventajas y emparejar (Fase 3).
    this.turbo = false;
    this.escudos = 0; // choques que no frenan
    this.iman = false;
    this.impulso = false; // último cuarto de la tabla: +10 %
    this.corriendo = false;
    this.pendiente = null; // gesto guardado en el buffer
    this.tPendiente = 0;
    this.ultimoCambioCarril = 0; // segundos de carrera, para el bonus por rapidez
    this.choques = 0;
    this.saltos = 0;
    this.likes = 0;
    this.esquivados = 0;
    this.eventos = []; // para efectos visuales: 'choque', 'like', 'salto', 'aterrizaje'
    this.anterior = { distancia, x: this.x, y: 0 };
  }

  /** Limita los carriles disponibles (y saca al corredor del carril cerrado si estaba ahí). */
  limitarCarriles(max) {
    this.carrilMax = max;
    if (this.carril > max) this.carril = max;
  }

  /** Pase 50/50: cierra un carril; si el corredor estaba ahí, pasa al abierto más cercano. */
  cerrarCarril(carril) {
    this.cerrado = carril;
    if (carril == null || this.carril !== carril) return;
    const abiertos = [0, 1, 2].filter((c) => c !== carril && c <= this.carrilMax);
    this.carril = abiertos.sort((a, b) => Math.abs(a - carril) - Math.abs(b - carril) || b - a)[0];
  }

  /** Velocidad a la que tiende el corredor ahora, relativa a la base: turbo, impulso y arranque lento. */
  get multiplicador() {
    return (this.turbo ? TURBO : 1) * (this.impulso ? IMPULSO_EMPAREJAR : 1);
  }

  gesto(accion) {
    this.pendiente = accion;
    this.tPendiente = BUFFER_GESTO;
  }

  aplicarGesto() {
    if (!this.pendiente) return;
    const a = this.pendiente;
    if (a === 'izq' || a === 'der') {
      const paso = a === 'izq' ? -1 : 1;
      let nuevo = Math.max(0, Math.min(this.carrilMax, this.carril + paso));
      // El carril cerrado se saltea: se pasa al de más allá (si hay).
      if (nuevo === this.cerrado) nuevo = nuevo + paso >= 0 && nuevo + paso <= this.carrilMax ? nuevo + paso : this.carril;
      if (nuevo !== this.carril) {
        this.carril = nuevo;
        this.ultimoCambioCarril = this.tiempoCarrera;
      }
      this.pendiente = null;
    } else if (a === 'saltar' && this.tSalto < 0) {
      this.tSalto = 0;
      this.saltos++;
      this.eventos.push('salto');
      this.pendiente = null;
    }
  }

  paso(dt, pista) {
    this.anterior.distancia = this.distancia;
    this.anterior.x = this.x;
    this.anterior.y = this.y;

    if (this.pendiente) {
      this.aplicarGesto();
      this.tPendiente -= dt;
      if (this.tPendiente <= 0) this.pendiente = null;
    }

    // Cambio de carril suave (se puede cambiar en el aire).
    const objetivo = CARRILES[this.carril];
    const paso = (Math.abs(CARRILES[1] - CARRILES[0]) / TIEMPO_CAMBIO_CARRIL) * dt;
    this.x += Math.max(-paso, Math.min(paso, objetivo - this.x));

    // Salto parabólico.
    if (this.tSalto >= 0) {
      this.tSalto += dt;
      const t = this.tSalto / DURACION_SALTO;
      if (t >= 1) {
        this.tSalto = -1;
        this.y = 0;
        this.eventos.push('aterrizaje');
      } else {
        this.y = 4 * ALTURA_SALTO * t * (1 - t);
      }
    }

    // Velocidad: sube un poco con el tiempo; baja un instante al chocar.
    if (this.corriendo) {
      this.tiempoCarrera += dt;
      let objetivoV = Math.min(VELOCIDAD_MAX, VELOCIDAD_BASE + ACELERACION * this.tiempoCarrera);
      objetivoV *= this.multiplicador;
      if (this.frenado > 0) objetivoV *= 0.4;
      if (this.lenta > 0) objetivoV *= ARRANQUE_LENTO;
      this.velocidad += (objetivoV - this.velocidad) * Math.min(1, dt * (this.frenado > 0 ? 8 : 2.5));
    } else {
      this.velocidad += (0 - this.velocidad) * Math.min(1, dt * 4);
    }
    this.frenado = Math.max(0, this.frenado - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.lenta = Math.max(0, this.lenta - dt);
    this.distancia += this.velocidad * dt;

    if (pista) this.colisiones(pista);
  }

  colisiones(pista) {
    const d = this.distancia;
    for (const o of pista.obstaculos) {
      if (o.golpeado || o.hundido) continue;
      if (!o.pasado && d - MEDIO_LARGO > o.z + o.largo) {
        o.pasado = true;
        this.esquivados++;
        continue;
      }
      if (d + MEDIO_LARGO < o.z || d - MEDIO_LARGO > o.z + o.largo) continue;
      if (Math.abs(this.x - xObstaculo(o, d)) > ALCANCE_LATERAL) continue;
      if (!o.alto && this.y > o.altura - 0.25) continue; // lo saltó
      if (this.invulnerable > 0) continue;
      o.golpeado = true;
      o.pasado = true;
      if (this.escudos > 0) {
        // Escudo (UGC viral): el obstáculo cae, pero el corredor no frena.
        this.escudos--;
        this.invulnerable = 0.5;
        this.eventos.push('escudo');
        continue;
      }
      this.choques++;
      this.frenado = FRENADO_CHOQUE;
      this.invulnerable = INVULNERABLE_CHOQUE;
      this.eventos.push('choque');
    }
    for (const l of pista.likes) {
      if (l.tomado || l.hundido) continue;
      if (Math.abs(l.z - d) > 0.7) continue;
      // Con el imán se juntan los de cualquier carril y altura (se ven volar hacia el corredor).
      if (!this.iman && Math.abs(this.x - CARRILES[l.carril]) > 0.9) continue;
      if (!this.iman && Math.abs(this.y + 0.6 - l.y) > 1.0) continue;
      l.tomado = true;
      this.likes++;
      this.eventos.push('like');
    }
  }
}
