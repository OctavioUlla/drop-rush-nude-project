import { crearEscena } from './scene.js';
import { Mundo } from './world.js';
import { Personaje } from './character.js';
import { curvatura } from './models/kit.js';
import { crearArco } from './models/props.js';
import { crearTienda } from './models/store.js';
import { CARRILES } from '../../shared/constantes.js';

// Junta escena, mundo, personaje, arcos de respuesta y tienda de la meta,
// y mueve la cámara detrás y por encima del corredor.

export class Vista {
  constructor(lienzo, numeroGrupo, calidad) {
    this.lienzo = lienzo;
    this.calidad = calidad;
    const e = crearEscena(lienzo);
    Object.assign(this, e);
    this.distanciaDibujo(calidad.config.distancia);
    this.mundo = new Mundo(this.escena, { detalle: calidad.config.detalle, distancia: calidad.config.distancia });
    this.personaje = new Personaje(this.escena, numeroGrupo);
    // Se crean una sola vez y se esconden: durante la partida solo se mueven.
    this.arcos = CARRILES.map((x) => {
      const arco = crearArco();
      arco.raiz.position.x = x;
      arco.raiz.visible = false;
      this.escena.add(arco.raiz);
      return arco;
    });
    this.tienda = crearTienda();
    this.tienda.visible = false;
    this.escena.add(this.tienda);
    this.camX = 0;
    this.sacudida = 0;
    this.dprAplicado = 0;

    this.redimensionar();
    new ResizeObserver(() => this.redimensionar()).observe(lienzo);
  }

  redimensionar() {
    this.renderer.setPixelRatio(this.calidad.dpr);
    this.dprAplicado = this.calidad.dpr;
    this.ajustarTamano();
  }

  /** Al cambiar de nivel se regeneran los bloques con más o menos detalle. */
  aplicarNivel() {
    const { distancia, detalle } = this.calidad.config;
    this.distanciaDibujo(distancia);
    this.mundo.distanciaDibujo = distancia;
    this.mundo.crearBloques(detalle);
    this.redimensionar();
  }

  cambiarGrupo(numero) {
    this.personaje.cambiarGrupo(this.escena, numero);
  }

  /**
   * Arcos de la pregunta en la distancia `z` (o null para esconderlos).
   * `carteles`: [{ letra, texto, activo, cerrado }] uno por carril.
   */
  ubicarArcos(z, carteles) {
    this.arcos.forEach((arco, i) => {
      arco.raiz.visible = z != null;
      if (z == null) return;
      arco.raiz.position.z = -z;
      arco.mostrar(carteles[i]);
    });
  }

  /** Tienda de la meta con la puerta en la distancia `z` (o null para esconderla). */
  ubicarTienda(z) {
    this.tienda.visible = z != null;
    if (z != null) this.tienda.position.z = -z;
  }

  dibujar(estado, corredor, pista, dt, tiempo) {
    if (this.dprAplicado !== this.calidad.dpr) this.redimensionar();

    this.mundo.actualizar(estado.distancia, pista, tiempo);
    this.personaje.actualizar(estado, corredor, dt, tiempo);

    for (const e of corredor.eventos) if (e === 'choque') this.sacudida = 1;
    this.sacudida = Math.max(0, this.sacudida - dt * 3);
    const temblor = this.sacudida * this.sacudida * 0.25;

    this.camX += (estado.x * 0.6 - this.camX) * Math.min(1, dt * 8);
    const c = this.camara;
    c.position.set(
      this.camX + Math.sin(tiempo * 61) * temblor,
      3.3 + estado.y * 0.3 + Math.sin(tiempo * 47) * temblor,
      -estado.distancia + 6.0,
    );
    c.lookAt(this.camX * 1.2, 1.1 + estado.y * 0.25, -estado.distancia - 10);
    this.fondo.position.copy(c.position);

    this.renderer.render(this.escena, c);
  }

  info() {
    const r = this.renderer.info.render;
    return {
      llamadas: r.calls,
      triangulos: r.triangles,
      dpr: this.calidad.dpr,
      nivel: this.calidad.nivel,
      resolucion: `${this.renderer.domElement.width}×${this.renderer.domElement.height}`,
      curvatura: curvatura.value,
    };
  }

  gpu() {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  }
}
