import {
  WebGLRenderer, Scene, PerspectiveCamera, Fog, HemisphereLight, DirectionalLight, Color,
  Mesh, SphereGeometry, ShaderMaterial, BackSide, SRGBColorSpace,
} from 'three';
import { colores3d } from '../../../../design-system/tokens.js';

// Renderer, cámara, luces, cielo con degradado y niebla del color del horizonte.
// Sin sombras en tiempo real ni post-procesado (sección 5.3).

const { juego: J } = colores3d;

function cielo() {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      arriba: { value: new Color(J['cielo-arriba']) },
      horizonte: { value: new Color(J.niebla) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 arriba;
      uniform vec3 horizonte;
      varying vec3 vDir;
      void main() {
        float h = smoothstep(0.0, 0.45, vDir.y);
        gl_FragColor = vec4(mix(horizonte, arriba, h), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const malla = new Mesh(new SphereGeometry(100, 16, 8), material);
  malla.renderOrder = -1;
  malla.frustumCulled = false;
  return malla;
}

export function crearEscena(lienzo) {
  const renderer = new WebGLRenderer({
    canvas: lienzo,
    antialias: false,
    powerPreference: 'default',
    stencil: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(J.niebla);

  const escena = new Scene();
  escena.fog = new Fog(J.niebla, 40, 120);

  const camara = new PerspectiveCamera(62, 1, 0.1, 130);
  const fondo = cielo();
  escena.add(fondo);

  escena.add(new HemisphereLight(J['cielo-horizonte'], J.asfalto, 2.2));
  const sol = new DirectionalLight(0xffffff, 1.6);
  sol.position.set(-4, 10, 3);
  escena.add(sol);

  const ajustarTamano = () => {
    const { clientWidth: w, clientHeight: h } = lienzo;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // En vertical (celular) se abre un poco el campo de visión para ver los 3 carriles.
    camara.fov = w < h ? 70 : 58;
    camara.updateProjectionMatrix();
  };

  /** Ajusta la distancia de dibujo según la calidad: la niebla oculta dónde aparece todo. */
  const distanciaDibujo = (d) => {
    camara.far = d + 10;
    camara.updateProjectionMatrix();
    escena.fog.near = d * 0.3;
    escena.fog.far = d;
    fondo.scale.setScalar((camara.far * 0.9) / 100); // el cielo siempre dentro del plano lejano
  };

  return { renderer, escena, camara, fondo, ajustarTamano, distanciaDibujo };
}
