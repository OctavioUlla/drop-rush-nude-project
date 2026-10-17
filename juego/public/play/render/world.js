import { InstancedMesh, Matrix4, Vector3, Quaternion, Euler, DynamicDrawUsage, Mesh } from 'three';
import { crearRng } from '../../shared/rng.js';
import { CARRILES } from '../../shared/constantes.js';
import { materialMundo, triangulos } from './models/kit.js';
import { bloqueCalle } from './models/street.js';
import { MODELOS_OBSTACULOS, like } from './models/obstacles.js';

// Mundo: bloques de calle reciclados (object pooling) y obstáculos/likes instanciados.
// Durante la partida no se crea ningún objeto: solo se mueven los que ya existen.

const LARGO_BLOQUE = 24;
const CAPACIDAD = { valla: 24, caja: 24, fan: 24, camion: 10 };
const CAPACIDAD_LIKES = 80;

const m = new Matrix4();
const pos = new Vector3();
const rot = new Quaternion();
const euler = new Euler();
const esc = new Vector3(1, 1, 1);

export class Mundo {
  constructor(escena, { detalle = 2, distancia = 120 } = {}) {
    this.escena = escena;
    this.distanciaDibujo = distancia;
    this.bloques = [];
    this.triangulosBloque = 0;
    this.crearBloques(detalle);

    this.instancias = {};
    for (const [tipo, crear] of Object.entries(MODELOS_OBSTACULOS)) {
      this.instancias[tipo] = this.instanciado(crear(), CAPACIDAD[tipo]);
    }
    this.likes = this.instanciado(like(), CAPACIDAD_LIKES);
  }

  instanciado(geometria, capacidad) {
    const malla = new InstancedMesh(geometria, materialMundo, capacidad);
    malla.instanceMatrix.setUsage(DynamicDrawUsage);
    malla.frustumCulled = false; // se mueven por todo el mundo; la niebla ya limita lo visible
    malla.count = 0;
    malla.userData.triangulos = triangulos(geometria);
    this.escena.add(malla);
    return malla;
  }

  /** Suficientes bloques para cubrir la distancia de dibujo (+ uno detrás de la cámara). */
  crearBloques(detalle) {
    for (const b of this.bloques) {
      this.escena.remove(b);
      b.geometry.dispose();
    }
    this.bloques = [];
    const cantidad = Math.ceil(this.distanciaDibujo / LARGO_BLOQUE) + 2;
    const rng = crearRng(20240611);
    for (let i = 0; i < cantidad; i++) {
      const b = new Mesh(bloqueCalle(rng, LARGO_BLOQUE, detalle), materialMundo);
      b.matrixAutoUpdate = false;
      b.userData.indice = null; // se ubica en el primer cuadro
      this.bloques.push(b);
      this.escena.add(b);
    }
    this.triangulosBloque = triangulos(this.bloques[0].geometry);
  }

  actualizar(distancia, pista, tiempo) {
    // Bloques: el que queda atrás pasa adelante.
    const primero = Math.floor((distancia - 12) / LARGO_BLOQUE);
    const n = this.bloques.length;
    for (let k = primero; k < primero + n; k++) {
      const b = this.bloques[((k % n) + n) % n];
      if (b.userData.indice !== k) {
        b.userData.indice = k;
        b.position.z = -k * LARGO_BLOQUE;
        b.updateMatrix();
      }
      b.visible = k * LARGO_BLOQUE < distancia + this.distanciaDibujo;
    }

    // Obstáculos.
    for (const malla of Object.values(this.instancias)) malla.count = 0;
    const desde = distancia - 12;
    const hasta = distancia + this.distanciaDibujo;
    for (const o of pista.obstaculos) {
      if (o.z + o.largo < desde || o.z > hasta) continue;
      const malla = this.instancias[o.tipo];
      if (malla.count >= malla.instanceMatrix.count) continue;
      const caida = o.golpeado ? 0.35 : 0;
      pos.set(CARRILES[o.carril], -o.hundido * (o.altura + 0.6), -o.z);
      rot.setFromEuler(euler.set(-caida, 0, 0));
      malla.setMatrixAt(malla.count++, m.compose(pos, rot, esc));
    }
    for (const malla of Object.values(this.instancias)) malla.instanceMatrix.needsUpdate = true;

    // Likes: giran y saltan al tomarlos.
    let i = 0;
    rot.setFromEuler(euler.set(0, tiempo * 3, 0));
    for (const l of pista.likes) {
      if (l.z < desde || l.z > hasta || i >= CAPACIDAD_LIKES) continue;
      if (l.tomado && l.z < distancia - 1.5) continue;
      const s = l.tomado ? Math.max(0.01, 1 - (distancia - l.z + 1.5) / 3) : 1;
      pos.set(CARRILES[l.carril], l.y + Math.sin(tiempo * 4 + l.z) * 0.08 - l.hundido * 2 + (l.tomado ? 1 : 0), -l.z);
      esc.setScalar(s);
      this.likes.setMatrixAt(i++, m.compose(pos, rot, esc));
    }
    esc.setScalar(1);
    this.likes.count = i;
    this.likes.instanceMatrix.needsUpdate = true;
  }
}
