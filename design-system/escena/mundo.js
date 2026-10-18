// El mundo clay del plano secuencia: una estación por bloque, en fila sobre el eje X.
// Cada estación devuelve { nombre, tema, encuadre, ancla, actualizar(dt, t, presencia) }.
// "ancla" es el Object3D donde se apoya la sudadera protagonista; "presencia" va de 0 a 1 según cuán cerca está la cámara.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colores, colores3d, tokens } from '../tokens.js';
import { crearSudadera } from './sudadera.js';

const C = colores3d;
const P = C.presentacion;
const esc = tokens.escena;

// ---------- Utilidades clay ----------
const materiales = new Map();
export function clay(hex, extra = {}) {
  const clave = hex + JSON.stringify(extra);
  if (!materiales.has(clave)) materiales.set(clave, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.95, metalness: 0, ...extra }));
  return materiales.get(clave);
}
function malla(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
/** Caja redondeada apoyada en y (la base queda en y, no el centro). */
function caja(w, h, d, hex, x, y, z, r = Math.min(w, h, d) * 0.18) {
  return malla(new RoundedBoxGeometry(w, h, d, 4, Math.max(0.005, Math.min(r, w / 2, h / 2, d / 2) - 0.001)), clay(hex), x, y + h / 2, z);
}
function cilindro(r, h, hex, x, y, z, lados = 48) {
  return malla(new THREE.CylinderGeometry(r, r, h, lados), clay(hex), x, y + h / 2, z);
}
/** Pedestal bajo con el borde superior redondeado. */
function pedestal(hex, r = 1.05, h = 0.32) {
  const rb = 0.08; // radio del borde
  const perfil = [new THREE.Vector2(0, 0), new THREE.Vector2(r, 0)];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI / 2;
    perfil.push(new THREE.Vector2(r - rb + Math.cos(a) * rb, h - rb + Math.sin(a) * rb));
  }
  perfil.push(new THREE.Vector2(0, h));
  return malla(new THREE.LatheGeometry(perfil, 96), clay(hex));
}
/** Piso que solo recibe sombra: para las estaciones "en el vacío" (el fondo lo pone el CSS). */
function pisoSombra(w = 14, d = 10) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ color: P['sombra-contacto'], opacity: esc['sombra-contacto'].opacidad }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
/** Textura de canvas con un dibujo 2D (pantallas, cartel). */
function textura(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const fuente = (peso, px) => `${peso} ${px}px "Inter Tight", "Inter", sans-serif`;

// ---------- Foco con haz visible y polvo ----------
const haz = (colorHex, alto, radio) => {
  const geo = new THREE.ConeGeometry(radio, alto, 64, 1, true);
  geo.translate(0, -alto / 2, 0); // el vértice queda en el origen (arriba)
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(colorHex) }, uOpacidad: { value: 0.16 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacidad; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ float borde = pow(abs(dot(vN, vV)), 2.); float caida = mix(1., .08, vY); gl_FragColor = vec4(uColor, borde*caida*uOpacidad); }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
};
let texturaPunto;
function polvo(cantidad, radio, alto) {
  texturaPunto ??= textura(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  });
  const pos = new Float32Array(cantidad * 3);
  const semilla = new Float32Array(cantidad);
  for (let i = 0; i < cantidad; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radio;
    pos.set([Math.cos(a) * r, Math.random() * alto, Math.sin(a) * r], i * 3);
    semilla[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: P.polvo, size: esc.polvo.tamano, map: texturaPunto, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: esc.polvo.opacidad,
  });
  const puntos = new THREE.Points(geo, mat);
  puntos.userData.mover = (t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < cantidad; i++) {
      const s = semilla[i];
      p.array[i * 3 + 1] = ((s * 0.37 + t * 0.06) % 1) * alto; // sube muy despacio
      p.array[i * 3] += Math.sin(t * 0.3 + s) * 0.0008;
    }
    p.needsUpdate = true;
  };
  return puntos;
}
function foco(grupo, x, y, z, altoHaz = 5.5, radio = 1.9) {
  // La intensidad del token es para un foco a ~6 m; más cerca se baja para que no queme la prenda.
  const luz = new THREE.SpotLight(P.foco, esc.luz.foco * (y / 6.2) ** 2, 12, 0.36, 0.65, 2);
  luz.position.set(x, y, z);
  luz.target.position.set(x, 0, z);
  const cono = haz(P.foco, altoHaz, radio);
  cono.position.set(x, y, z);
  const motas = polvo(esc.polvo.cantidad, radio * 0.75, altoHaz * 0.9);
  motas.position.set(x, 0, z);
  grupo.add(luz, luz.target, cono, motas);
  return { luz, cono, motas };
}

// ---------- Estaciones ----------
function estacionPortada(g) {
  g.add(pisoSombra());
  const ped = pedestal(P['pedestal-cacao']);
  g.add(ped);
  const ancla = new THREE.Object3D();
  ancla.position.y = 0.32;
  g.add(ancla);
  const f = foco(g, 0, 6.2, 0);
  // Sudaderas que flotan alrededor, en los neutros de la marca (la protagonista es la única con colorway).
  const flotantes = [
    [C.marca.crema, -3.2, 2.6, -2.2, 0.5], [C.marca.arena, 2.9, 3.1, -3.4, 0.45],
    [C.marca['cacao-suave'], -1.5, 3.7, -3.0, 0.36], [C.marca.piedra, 3.4, 1.0, 0.6, 0.42],
  ].map(([color, x, y, z, s], i) => {
    const s2 = crearSudadera(color);
    s2.grupo.scale.setScalar(s);
    s2.grupo.position.set(x, y, z);
    s2.grupo.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    s2.semilla = i * 1.7;
    s2.base = new THREE.Vector3(x, y, z);
    g.add(s2.grupo);
    return s2;
  });
  return {
    tema: 'cacao', encuadre: 'centro', ancla,
    actualizar(dt, t, presencia) {
      f.motas.userData.mover(t);
      f.cono.material.uniforms.uOpacidad.value = 0.16 * presencia;
      for (const s of flotantes) {
        s.grupo.rotation.x += dt * 0.15; s.grupo.rotation.y += dt * 0.22;
        s.grupo.position.y = s.base.y + Math.sin(t * 0.6 + s.semilla) * 0.18;
      }
    },
  };
}

function estacionHistoria(g) {
  const piso = colores3d.presentacion['casa-piso'];
  g.add(caja(10, 0.3, 7, piso, 0, -0.3, -0.5, 0.08));
  g.add(caja(10, 5.4, 0.3, C.juego['fachada-1'], 0, -0.3, -4.1, 0.06));
  g.add(caja(0.3, 5.4, 7, C.juego['fachada-1'], -5.1, -0.3, -0.5, 0.06));
  // Ventana con luz.
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.7), new THREE.MeshBasicMaterial({ color: P.pantalla, toneMapped: false }));
  vidrio.position.set(2.6, 3, -3.94);
  g.add(vidrio);
  for (const [w, h, x, y] of [[2.2, 0.12, 2.6, 2.1], [2.2, 0.12, 2.6, 3.86], [0.12, 1.86, 1.55, 2.98], [0.12, 1.86, 3.65, 2.98], [0.08, 1.7, 2.6, 2.98]]) {
    g.add(caja(w, h, 0.14, C.marca.crema, x, y - h / 2, -3.9));
  }
  // Cama a la izquierda (atrás del texto), escritorio y la pila de cajas de los primeros pedidos.
  g.add(caja(3.2, 0.4, 2.1, C.juego['fachada-2'], -2.6, 0, -2.9));
  g.add(caja(3.1, 0.3, 2.0, C.marca.crema, -2.6, 0.4, -2.9, 0.12));
  g.add(caja(0.9, 0.22, 1.5, C.marca.arena, -3.7, 0.7, -2.9, 0.1));
  const carton = P['casa-carton'];
  const cinta = C.juego['fachada-2'];
  for (const [w, h, d, x, y, z, ry] of [
    [1.0, 0.7, 0.8, 2.2, 0, -1.4, 0.2], [1.0, 0.7, 0.8, 3.3, 0, -1.5, -0.1], [0.9, 0.6, 0.7, 2.7, 0.7, -1.45, 0.05],
    [0.8, 0.5, 0.6, 3.6, 0, -0.3, 0.4], [0.7, 0.45, 0.6, 2.8, 1.3, -1.4, -0.2],
  ]) {
    const b = caja(w, h, d, carton, x, y, z, 0.04);
    b.rotation.y = ry;
    const tira = caja(w * 0.18, 0.012, d + 0.01, cinta, 0, h / 2, 0, 0.004);
    tira.position.y = h / 2;
    b.add(tira);
    g.add(b);
  }
  // Caja abierta de la que sale la sudadera.
  const abierta = new THREE.Group();
  abierta.add(caja(1.5, 0.08, 1.1, carton, 0, 0, 0, 0.02));
  for (const [w, d, x, z] of [[1.5, 0.08, 0, 0.51], [1.5, 0.08, 0, -0.51], [0.08, 1.1, 0.71, 0], [0.08, 1.1, -0.71, 0]]) abierta.add(caja(w, 0.7, d, carton, x, 0, z, 0.02));
  const solapa = caja(1.5, 0.05, 0.55, carton, 0, 0, 0, 0.02);
  solapa.position.set(0, 0.7, 0.8);
  solapa.rotation.x = 0.5;
  abierta.add(solapa);
  g.add(abierta);
  const ancla = new THREE.Object3D();
  ancla.position.y = 0.55;
  g.add(ancla);
  return { tema: 'crema', encuadre: 'editorial', ancla, actualizar() {} };
}

function pantallaFeed(etiqueta, cuenta, tono) {
  return textura(540, 1080, (ctx, w, h) => {
    ctx.fillStyle = colores.marca.crema; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = tono; ctx.fillRect(28, 140, w - 56, 620);
    ctx.fillStyle = colores.marca.cacao;
    ctx.font = fuente(800, 56); ctx.fillText(etiqueta, 36, 96);
    ctx.font = fuente(600, 30); ctx.fillText(cuenta, 36, 820);
    ctx.fillStyle = colores.marca.piedra;
    for (let i = 0; i < 3; i++) ctx.fillRect(36, 870 + i * 48, w - 72 - i * 90, 22);
    ctx.fillStyle = colores.marca['cacao-suave'];
    ctx.font = fuente(700, 120); ctx.textAlign = 'center'; ctx.fillText('▶', w / 2, 500);
  });
}
function celular(textura_, w = 1.6, h = 3.2) {
  const g = new THREE.Group();
  g.add(caja(w, h, 0.2, C.marca['cacao-profundo'], 0, 0, 0, 0.22));
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.18, h - 0.18), new THREE.MeshBasicMaterial({ map: textura_, toneMapped: false }));
  pantalla.position.set(0, h / 2, 0.105);
  g.add(pantalla);
  return g;
}
function estacionEgcUgc(g) {
  g.add(caja(11, 0.3, 6, C.marca.arena, 0, -0.3, -0.8, 0.1));
  const egc = celular(pantallaFeed('EGC', '@nudeproject', colores.marca.arena));
  egc.position.set(-2.9, 0.1, -1.6); egc.rotation.y = 0.35;
  const ugc = celular(pantallaFeed('UGC', '@comunidad', colores.acento.rosa));
  ugc.position.set(2.9, 0.1, -1.6); ugc.rotation.y = -0.35;
  g.add(egc, ugc);
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.32, 0.3);
  g.add(ancla, (() => { const p = pedestal(P['pedestal-crema'], 0.9); p.position.set(0, 0, 0.3); return p; })());
  return { tema: 'crema', encuadre: 'centro', ancla, actualizar() {} };
}

function corazonGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.35);
  s.bezierCurveTo(-0.05, -0.28, -0.42, -0.05, -0.38, 0.17);
  s.bezierCurveTo(-0.34, 0.38, -0.08, 0.4, 0, 0.2);
  s.bezierCurveTo(0.08, 0.4, 0.34, 0.38, 0.38, 0.17);
  s.bezierCurveTo(0.42, -0.05, 0.05, -0.28, 0, -0.35);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 6, curveSegments: 24 });
  geo.center();
  return geo;
}
function estacionViral(g) {
  g.add(pisoSombra());
  // Pared de celulares con el mismo video, como cuando algo se hace viral.
  const tex = textura(270, 540, (ctx, w, h) => {
    ctx.fillStyle = colores.acento.rosa; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colores.marca.cacao; ctx.font = fuente(800, 120); ctx.textAlign = 'center'; ctx.fillText('♥', w / 2, h / 2 + 40);
  });
  for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) {
    const c = celular(tex, 0.9, 1.8);
    c.position.set((i - 3) * 1.15, 0.2 + j * 2.0, -3.6 - Math.abs(i - 3) * 0.25);
    c.rotation.y = -(i - 3) * 0.06;
    g.add(c);
  }
  const geo = corazonGeo();
  const corazones = Array.from({ length: 9 }, (_, i) => {
    const m = malla(geo, clay(C.acento.rosa, { roughness: 0.8 }));
    m.scale.setScalar(0.35 + (i % 3) * 0.12);
    m.userData = { a: (i / 9) * Math.PI * 2, r: 1.45 + (i % 3) * 0.3, y: 0.7 + (i % 4) * 0.5, v: 0.35 + (i % 2) * 0.15, s: 0.22 + (i % 3) * 0.07 };
    g.add(m);
    return m;
  });
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.32, 0);
  g.add(ancla, pedestal(P['pedestal-crema'], 0.9));
  return {
    tema: 'crema', encuadre: 'editorial', ancla,
    actualizar(dt, t, presencia) {
      for (const m of corazones) {
        const u = m.userData;
        const a = u.a + t * u.v;
        m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.15, Math.sin(a) * u.r);
        m.rotation.y = -a;
        m.scale.setScalar(u.s * THREE.MathUtils.smoothstep(presencia, 0.3, 1));
      }
    },
  };
}

function estacionExperiencial(g) {
  const pared = P['casa-pared'];
  g.add(caja(11, 0.3, 7, P['casa-piso'], 0, -0.3, -0.5, 0.08));
  // Pared clara detrás del texto y pared de acento marrón (el tono de la tienda) detrás de la prenda.
  g.add(caja(5.5, 5.6, 0.3, C.juego['fachada-1'], -2.75, -0.3, -4.1, 0.06));
  g.add(caja(5.5, 5.6, 0.3, pared, 2.75, -0.3, -4.1, 0.06));
  g.add(caja(0.3, 5.6, 7, pared, 5.6, -0.3, -0.5, 0.06));
  // Alfombra, sillón, perchero con sudaderas, planta, vinilos y una lámpara cálida.
  const alfombra = cilindro(2.6, 0.03, C.marca.arena, -0.6, 0, -0.9, 64);
  alfombra.scale.z = 0.6;
  g.add(alfombra);
  const sillon = new THREE.Group();
  sillon.add(caja(3.2, 0.5, 1.3, C.marca.crema, 0, 0.15, 0, 0.2), caja(3.2, 0.9, 0.4, C.marca.crema, 0, 0.5, -0.5, 0.18),
    caja(0.4, 0.75, 1.3, C.marca.crema, -1.6, 0.15, 0, 0.18), caja(0.4, 0.75, 1.3, C.marca.crema, 1.6, 0.15, 0, 0.18));
  for (const x of [-1.4, 1.4]) sillon.add(cilindro(0.06, 0.15, C.marca['cacao-profundo'], x, 0, 0.45));
  sillon.position.set(-3.4, 0, -3.0);
  g.add(sillon);
  const metal = C.marca['cacao-profundo'];
  const perchero = new THREE.Group();
  perchero.add(cilindro(0.04, 2.6, metal, -1.6, 0, 0), cilindro(0.04, 2.6, metal, 1.6, 0, 0));
  const barra = cilindro(0.035, 3.3, metal, 0, 0, 0);
  barra.rotation.z = Math.PI / 2; barra.position.y = 2.55;
  perchero.add(barra);
  [C.marca.arena, C.marca['cacao-suave'], C.marca.crema, C.marca.piedra].forEach((color, i) => {
    const s = crearSudadera(color);
    s.grupo.scale.setScalar(0.48);
    s.grupo.position.set(-1.2 + i * 0.8, 1.4, 0);
    s.grupo.rotation.y = 0.9;
    perchero.add(s.grupo);
  });
  perchero.position.set(2.9, 0, -3.1);
  g.add(perchero);
  const planta = new THREE.Group();
  planta.add(cilindro(0.35, 0.6, C.juego['fachada-3'], 0, 0, 0));
  for (const [x, y, z, r] of [[0, 1.05, 0, 0.5], [0.3, 1.45, 0.1, 0.36], [-0.25, 1.5, -0.1, 0.32]]) planta.add(malla(new THREE.SphereGeometry(r, 32, 20), clay(P['casa-planta']), x, y, z));
  planta.position.set(5.0, 0, -2.0);
  g.add(planta);
  for (let i = 0; i < 7; i++) {
    const v = cilindro(0.42, 0.035, metal, 4.5, i * 0.04, -1.2);
    v.rotation.y = i;
    const etiqueta = cilindro(0.14, 0.04, i % 2 ? C.marca.crema : C.acento.bosque, 0, 0, 0);
    v.add(etiqueta);
    g.add(v);
  }
  const lampara = new THREE.PointLight(P.foco, 6, 6, 2);
  lampara.position.set(-1.2, 3.2, -3.4);
  g.add(lampara); // luz cálida de lámpara, fuera de cuadro
  // La protagonista, colgada de una percha.
  const percha = malla(new THREE.TorusGeometry(0.42, 0.025, 8, 48, Math.PI), clay(metal), 0, 2.3, 0);
  percha.scale.y = 0.45;
  const gancho = malla(new THREE.TorusGeometry(0.1, 0.022, 8, 24, Math.PI * 1.4), clay(metal), 0, 2.5, 0);
  g.add(percha, gancho);
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.1, 0);
  g.add(ancla);
  return { tema: 'crema', encuadre: 'editorial', ancla, calida: true, actualizar() {} };
}

function estacionMetricas(g) {
  g.add(pisoSombra());
  // Gráfico de barras hecho con pilas de sudaderas dobladas.
  const tonos = [C.marca.arena, C.marca.piedra, C.marca['cacao-suave'], C.marca.cacao];
  [3, 5, 8, 12].forEach((n, i) => {
    for (let k = 0; k < n; k++) {
      const d = caja(0.8, 0.14, 0.62, tonos[i], -0.6 + i * 1.0, k * 0.145, -3.6, 0.06);
      d.rotation.y = (Math.sin(k * 3.1 + i) * 0.06);
      g.add(d);
    }
  });
  const ancla = new THREE.Object3D();
  ancla.position.set(0.3, 0.45, 0);
  g.add(ancla);
  return { tema: 'crema', encuadre: 'editorial', ancla, escala: 0.85, desarmar: true, actualizar() {} };
}

function estacionObjetivo(g) {
  g.add(pisoSombra());
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.32, 0);
  g.add(ancla, pedestal(P['pedestal-crema'], 0.9));
  return { tema: 'crema', encuadre: 'macro', ancla, actualizar() {} };
}

function estacionDesafios(g) {
  g.add(pisoSombra());
  // Balanza: exclusividad (una sola sudadera) vs. accesibilidad (una pila).
  const metal = C.marca.cacao;
  g.add(cilindro(0.7, 0.2, C.marca.arena, 0, 0, 0), cilindro(0.07, 2.7, metal, 0, 0.2, 0));
  g.add(malla(new THREE.SphereGeometry(0.13, 24, 16), clay(metal), 0, 2.92, 0));
  const brazo = new THREE.Group();
  brazo.position.set(0, 2.9, 0);
  brazo.add(caja(3.8, 0.11, 0.14, metal, 0, -0.055, 0, 0.05));
  const platos = [-1.75, 1.75].map((x) => {
    const p = new THREE.Group();
    p.position.set(x, 0, 0);
    for (const dx of [-0.4, 0.4]) p.add(cilindro(0.01, 1.55, metal, dx, -1.55, 0, 8));
    p.add(cilindro(0.6, 0.07, C.marca.arena, 0, -1.62, 0));
    brazo.add(p);
    return p;
  });
  for (let k = 0; k < 7; k++) platos[1].add(caja(0.66, 0.11, 0.5, [C.marca.piedra, C.marca.arena, C.marca['cacao-suave']][k % 3], 0, -1.55 + k * 0.115, 0, 0.05));
  g.add(brazo);
  const ancla = new THREE.Object3D();
  ancla.position.set(0, -1.55, 0);
  platos[0].add(ancla);
  let inclinacion = 0;
  return {
    tema: 'crema', encuadre: 'editorial', ancla, escala: 0.42,
    // La cámara encuadra la balanza entera, no el plato.
    mira: new THREE.Vector3(0, 1.6, 0), distancia: 9,
    /** valor de -1 (gana accesibilidad) a 1 (gana exclusividad): en la presentación sale de la votación. */
    valor: 0.45,
    actualizar(dt, t) {
      inclinacion = THREE.MathUtils.damp(inclinacion, -this.valor * 0.16 + Math.sin(t * 0.8) * 0.01, 2, dt);
      brazo.rotation.z = inclinacion;
      for (const p of platos) p.rotation.z = -inclinacion; // los platos cuelgan derechos
    },
  };
}

function estacionDropRush(g) {
  // La calle y la vidriera de la tienda: transición al juego.
  g.add(caja(18, 0.2, 7, C.juego.asfalto, 0, -0.4, 4.6, 0.05));
  g.add(caja(18, 0.4, 3.2, C.juego.vereda, 0, -0.4, 0.4, 0.06));
  const tienda = C.juego.tienda;
  const fachada = new THREE.Group();
  fachada.add(caja(1.0, 4.8, 0.5, tienda, -2.7, 0, -1.1, 0.05), caja(1.0, 4.8, 0.5, tienda, 2.7, 0, -1.1, 0.05),
    caja(6.4, 1.2, 0.5, tienda, 0, 3.6, -1.1, 0.05), caja(4.4, 0.4, 0.5, tienda, 0, 0, -1.1, 0.05));
  // Paredes vecinas, más oscuras, para que la vidriera sea la única luz de la calle.
  fachada.add(caja(5, 6, 0.4, C.marca['cacao-profundo'], -5.7, 0, -1.3, 0.04), caja(5, 6, 0.4, C.marca['cacao-profundo'], 5.7, 0, -1.3, 0.04));
  // Interior de la vidriera: fondo cálido iluminado.
  fachada.add(caja(4.4, 3.4, 0.2, C.juego['fachada-1'], 0, 0.2, -3.0, 0.03), caja(4.4, 0.2, 2.0, C.marca.arena, 0, 0.2, -2.1, 0.03));
  fachada.add(caja(0.2, 3.4, 2.0, C.marca.arena, -2.2, 0.2, -2.1, 0.03), caja(0.2, 3.4, 2.0, C.marca.arena, 2.2, 0.2, -2.1, 0.03));
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.78), new THREE.MeshBasicMaterial({
    toneMapped: false,
    map: textura(1024, 220, (ctx, w, h) => {
      ctx.fillStyle = colores.marca.cacao; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = colores.marca.crema; ctx.font = fuente(700, 130); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '-7px';
      ctx.fillText('Nude® Project', w / 2, h / 2 + 6);
    }),
  }));
  cartel.position.set(0, 4.2, -0.84);
  fachada.add(cartel);
  g.add(fachada);
  const ped = pedestal(P['pedestal-cacao'], 0.7, 0.28);
  ped.position.set(0, 0.4, -2.0);
  g.add(ped);
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.68, -2.0);
  g.add(ancla);
  const f = foco(g, 0, 3.5, -2.0, 2.9, 1.0);
  const interior = new THREE.PointLight(P['luz-principal'], 6, 6, 2);
  interior.position.set(0, 2.6, -0.6);
  g.add(interior);
  return {
    tema: 'cacao', encuadre: 'editorial', ancla, escala: 0.82,
    mira: new THREE.Vector3(0, 2.25, -1.4), distancia: 11,
    actualizar(dt, t, presencia) {
      f.motas.userData.mover(t);
      f.cono.material.uniforms.uOpacidad.value = 0.2 * presencia;
    },
  };
}

const constructores = {
  portada: estacionPortada, historia: estacionHistoria, 'egc-ugc': estacionEgcUgc, viral: estacionViral,
  experiencial: estacionExperiencial, metricas: estacionMetricas, objetivo: estacionObjetivo,
  desafios: estacionDesafios, 'drop-rush': estacionDropRush,
};

/** Arma todas las estaciones del recorrido, en el orden de tokens.escena.recorrido. */
export function crearMundo(escena) {
  const { separacion, estaciones } = esc.recorrido;
  return estaciones.map((nombre, i) => {
    const grupo = new THREE.Group();
    grupo.name = nombre;
    grupo.position.x = i * separacion;
    const e = constructores[nombre](grupo);
    escena.add(grupo);
    return { nombre, indice: i, grupo, escala: 1, ...e };
  });
}
