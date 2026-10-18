import {
  InstancedMesh, Matrix4, Vector3, Quaternion, Euler, Color, DynamicDrawUsage, MeshBasicMaterial, BoxGeometry,
  InstancedBufferAttribute,
} from 'three';
import { colores3d } from '../../../../design-system/tokens.js';
import { caja, unir, materialMundo, curvarMaterial } from './models/kit.js';

// Efectos baratos que dan "buen gráfico" (sección 4.3): partículas al juntar likes, al aterrizar y
// al chocar, y líneas de velocidad con el turbo. Todo se crea una sola vez: durante la partida
// solo se mueven instancias (una llamada de dibujo para las partículas y otra para las líneas).
// En calidad baja no hay partículas; las líneas de velocidad son solo de calidad alta (sección 5.3).

const { juego: J, acento: A, marca: M } = colores3d;
const CAPACIDAD = 72;
const LINEAS = 18;

const m = new Matrix4();
const pos = new Vector3();
const rot = new Quaternion();
const euler = new Euler();
const esc = new Vector3();
const color = new Color();

/**
 * Ráfagas por evento del corredor: cantidad (en calidad alta), color, velocidad y altura de salida.
 * `arrastre`: parte de la velocidad del corredor que se llevan (si no, quedan atrás enseguida).
 */
const RAFAGAS = {
  like: { cantidad: 7, colores: [J.like, M.crema], velocidad: 3.2, arriba: 2.5, y: 1.2, tamano: 0.13, vida: 0.55, arrastre: 0.9 },
  aterrizaje: { cantidad: 8, colores: [J['particula-polvo']], velocidad: 2.4, arriba: 0.6, y: 0.08, tamano: 0.16, vida: 0.45, anillo: true, arrastre: 0.7 },
  salto: { cantidad: 4, colores: [J['particula-polvo']], velocidad: 1.4, arriba: 0.4, y: 0.05, tamano: 0.12, vida: 0.35, anillo: true, arrastre: 0.6 },
  choque: { cantidad: 12, colores: [J['particula-polvo'], A.ladrillo, M.crema], velocidad: 4.5, arriba: 3.5, y: 0.9, tamano: 0.17, vida: 0.7, arrastre: 0.3 },
  escudo: { cantidad: 10, colores: [A.mostaza, M.crema], velocidad: 4, arriba: 2, y: 1.0, tamano: 0.14, vida: 0.6, arrastre: 0.85 },
};

export class Efectos {
  constructor(escena) {
    // Partículas: cubitos con color por instancia (el color por vértice es blanco y se multiplica).
    this.particulas = new InstancedMesh(unir([caja(1, 1, 1, M.blanco)]), materialMundo, CAPACIDAD);
    this.particulas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.particulas.instanceColor = new InstancedBufferAttribute(new Float32Array(CAPACIDAD * 3), 3);
    this.particulas.instanceColor.setUsage(DynamicDrawUsage);
    this.particulas.frustumCulled = false;
    this.particulas.count = 0;
    escena.add(this.particulas);
    this.vivas = Array.from({ length: CAPACIDAD }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, vida: 0, max: 1, tamano: 0.1, giro: 0, r: 0, g: 0, b: 0 }));
    this.libre = 0; // próxima a reciclar (anillo: si se llenan, se pisa la más vieja)

    // Líneas de velocidad: palitos crema semitransparentes que pasan al costado de la cámara.
    this.lineas = new InstancedMesh(
      new BoxGeometry(0.03, 0.03, 2.4),
      curvarMaterial(new MeshBasicMaterial({ color: J['linea-velocidad'], transparent: true, opacity: 0.55, depthWrite: false })),
      LINEAS,
    );
    this.lineas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.lineas.frustumCulled = false;
    this.lineas.count = 0;
    escena.add(this.lineas);
    this.posLineas = Array.from({ length: LINEAS }, (_, i) => ({ x: 0, y: 0, dz: (i / LINEAS) * 30, activa: false }));
    this.intensidadLineas = 0;
    this.semilla = 1;
  }

  /** Pseudoazar propio (sin Math.random en el bucle: más barato y repetible). */
  azar() {
    this.semilla = (this.semilla * 16807) % 2147483647;
    return (this.semilla - 1) / 2147483646;
  }

  /**
   * Lanza la ráfaga de un evento del corredor (`like`, `aterrizaje`, `salto`, `choque`, `escudo`)
   * en (x, y, −distancia), con el corredor a `velocidad`. `factor`: 1 en calidad alta, 0,5 en media, 0 en baja.
   */
  rafaga(evento, x, y, distancia, velocidad, factor) {
    const r = RAFAGAS[evento];
    if (!r || factor <= 0) return;
    const n = Math.max(1, Math.round(r.cantidad * factor));
    for (let i = 0; i < n; i++) {
      const p = this.vivas[this.libre];
      this.libre = (this.libre + 1) % CAPACIDAD;
      const angulo = r.anillo ? (i / n) * Math.PI * 2 + this.azar() * 0.5 : this.azar() * Math.PI * 2;
      const fuerza = r.velocidad * (0.55 + this.azar() * 0.45);
      p.x = x;
      p.y = y + r.y;
      p.z = -distancia;
      p.vx = Math.cos(angulo) * fuerza;
      p.vz = Math.sin(angulo) * fuerza * (r.anillo ? 1 : 0.6) - velocidad * r.arrastre;
      p.vy = r.arriba * (0.5 + this.azar() * 0.5);
      p.vida = p.max = r.vida * (0.75 + this.azar() * 0.5);
      p.tamano = r.tamano * (0.7 + this.azar() * 0.6);
      p.giro = this.azar() * 6;
      color.set(r.colores[i % r.colores.length]);
      p.r = color.r;
      p.g = color.g;
      p.b = color.b;
    }
  }

  /**
   * Mueve las partículas y las líneas. `distancia` y `velocidad`: del corredor (las líneas pasan a su
   * lado, más rápido que él); `lineas`: de 0 a 1 según el turbo.
   */
  actualizar(dt, distancia, velocidad, lineas) {
    let n = 0;
    for (const p of this.vivas) {
      if (p.vida <= 0) continue;
      p.vida -= dt;
      if (p.vida <= 0) continue;
      p.vy -= 9 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.03, p.y + p.vy * dt);
      // Las partículas quedan en el mundo: el corredor se aleja de ellas.
      p.z += p.vz * dt;
      p.giro += dt * 8;
      const t = p.vida / p.max;
      pos.set(p.x, p.y, p.z);
      rot.setFromEuler(euler.set(p.giro, p.giro * 0.7, 0));
      esc.setScalar(p.tamano * (0.35 + 0.65 * t));
      this.particulas.setMatrixAt(n, m.compose(pos, rot, esc));
      this.particulas.instanceColor.setXYZ(n, p.r, p.g, p.b);
      n++;
    }
    this.particulas.count = n;
    if (n) {
      this.particulas.instanceMatrix.needsUpdate = true;
      this.particulas.instanceColor.needsUpdate = true;
    }

    // Líneas de velocidad: aparecen y se van de a poco con el turbo.
    this.intensidadLineas += (lineas - this.intensidadLineas) * Math.min(1, dt * 4);
    const visibles = Math.round(LINEAS * this.intensidadLineas);
    this.lineas.count = visibles;
    if (!visibles) return;
    rot.identity();
    esc.set(1, 1, 0.6 + this.intensidadLineas * 0.8);
    for (let i = 0; i < visibles; i++) {
      const l = this.posLineas[i];
      // Pasan hacia atrás más rápido que el corredor; al salir por detrás vuelven a aparecer adelante.
      l.dz -= (velocidad * 1.6 + 12) * dt;
      if (l.dz < -6 || !l.activa) {
        l.activa = true;
        l.dz = 18 + this.azar() * 14;
        const lado = this.azar() < 0.5 ? -1 : 1;
        l.x = lado * (1.4 + this.azar() * 2.8);
        l.y = 0.4 + this.azar() * 3.2;
      }
      pos.set(l.x, l.y, -(distancia + l.dz));
      this.lineas.setMatrixAt(i, m.compose(pos, rot, esc));
    }
    this.lineas.instanceMatrix.needsUpdate = true;
  }
}
