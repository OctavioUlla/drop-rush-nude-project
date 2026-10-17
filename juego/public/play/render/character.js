import { Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture } from 'three';
import { crearCorredor } from './models/runner.js';
import { curvarMaterial } from './models/kit.js';
import { DURACION_SALTO } from '../../shared/constantes.js';

// Animación procedural del corredor: correr, saltar, inclinarse al cambiar de carril y tropezar.

function sombraCircular() {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(46,25,20,0.45)');
  grad.addColorStop(1, 'rgba(46,25,20,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const material = curvarMaterial(new MeshBasicMaterial({ map: new CanvasTexture(lienzo), transparent: true, depthWrite: false }));
  const malla = new Mesh(new PlaneGeometry(1.1, 1.1), material);
  malla.rotation.x = -Math.PI / 2;
  malla.position.y = 0.02;
  return malla;
}

export class Personaje {
  constructor(escena, numeroGrupo) {
    this.partes = crearCorredor(numeroGrupo);
    this.sombra = sombraCircular();
    escena.add(this.partes.raiz, this.sombra);
    this.ciclo = 0;
    this.xAnterior = 0;
    this.tropiezo = 0;
    this.aplastado = 0; // squash al aterrizar
  }

  cambiarGrupo(escena, numeroGrupo) {
    escena.remove(this.partes.raiz);
    this.partes = crearCorredor(numeroGrupo);
    escena.add(this.partes.raiz);
  }

  actualizar(estado, corredor, dt, tiempo) {
    const { raiz, cadera, torso, cabeza, brazoI, brazoD, piernaI, piernaD } = this.partes;
    raiz.position.set(estado.x, estado.y, -estado.distancia);
    this.sombra.position.set(estado.x, 0.02, -estado.distancia);
    const escalaSombra = 1 - Math.min(0.5, estado.y / 3);
    this.sombra.scale.set(escalaSombra, escalaSombra, 1);

    for (const e of corredor.eventos) {
      if (e === 'choque') this.tropiezo = 1;
      if (e === 'aterrizaje') this.aplastado = 1;
    }

    const v = corredor.velocidad;
    this.ciclo += v * dt * 0.95;
    const s = Math.sin(this.ciclo);
    const enElAire = corredor.tSalto >= 0;

    if (enElAire) {
      const t = corredor.tSalto / DURACION_SALTO;
      piernaI.arriba.rotation.x = 0.9;
      piernaI.medio.rotation.x = -1.5;
      piernaD.arriba.rotation.x = 0.3;
      piernaD.medio.rotation.x = -0.6;
      brazoI.arriba.rotation.x = brazoD.arriba.rotation.x = 2.4 - t * 1.2;
      brazoI.medio.rotation.x = brazoD.medio.rotation.x = 0;
      cadera.position.y = 0.95;
    } else {
      const amplitud = Math.min(1, v / 8);
      piernaI.arriba.rotation.x = s * 0.9 * amplitud;
      piernaD.arriba.rotation.x = -s * 0.9 * amplitud;
      piernaI.medio.rotation.x = -Math.max(0, -s) * 1.4 * amplitud - 0.1;
      piernaD.medio.rotation.x = -Math.max(0, s) * 1.4 * amplitud - 0.1;
      brazoI.arriba.rotation.x = -s * 0.8 * amplitud;
      brazoD.arriba.rotation.x = s * 0.8 * amplitud;
      brazoI.medio.rotation.x = brazoD.medio.rotation.x = 1.2 * amplitud;
      cadera.position.y = 0.95 + Math.abs(Math.cos(this.ciclo)) * 0.08 * amplitud - this.aplastado * 0.12;
    }

    // Inclinación al cambiar de carril y tropiezo hacia adelante.
    const vx = (estado.x - this.xAnterior) / Math.max(dt, 1e-3);
    this.xAnterior = estado.x;
    raiz.rotation.z += (-vx * 0.035 - raiz.rotation.z) * Math.min(1, dt * 12);
    this.tropiezo = Math.max(0, this.tropiezo - dt * 1.4);
    torso.rotation.x = -0.18 * Math.min(1, v / 8) - Math.sin(this.tropiezo * Math.PI) * 0.7;
    cabeza.rotation.x = Math.sin(this.tropiezo * Math.PI) * 0.4;

    // Squash & stretch al aterrizar.
    this.aplastado = Math.max(0, this.aplastado - dt * 6);
    raiz.scale.set(1 + this.aplastado * 0.12, 1 - this.aplastado * 0.15, 1 + this.aplastado * 0.12);

    // Parpadeo mientras es invulnerable.
    raiz.visible = corredor.invulnerable <= 0 || Math.floor(tiempo * 12) % 2 === 0;
  }
}
