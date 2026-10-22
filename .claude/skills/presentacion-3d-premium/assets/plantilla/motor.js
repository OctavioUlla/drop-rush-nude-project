// Motor del plano secuencia: renderer, luz de cine, el héroe y el viaje de cámara entre estaciones.
// Es genérico: la temática entra por tema.js (héroe, estaciones, ajustes) y la paleta por las variables CSS de index.html.
// No hace falta tocarlo para una presentación nueva.
//
// iniciar({ lienzo, escenario, tema, eventos, escalaMaxima })
//   → { ir, siguiente, anterior, actual, viajando, total, estaciones, proyectar, pose, arrancar, saltar, adelantar }
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

export { THREE };
const { damp, clamp, lerp, smoothstep } = THREE.MathUtils;

/** Valores por defecto. tema.ajustes puede pisar cualquiera (se mezclan en profundidad). */
export const AJUSTES = {
  camara: { campo: 30, distancia: 8.5, altura: 0.7, 'elevacion-viaje': 2.4, 'retroceso-viaje': 4, paralaje: 0.35, 'corrimiento-editorial': 1.75 },
  luz: {
    principal: 2.6, relleno: 0.5, contorno: 1.6, ambiente: 0.35, foco: 38, entorno: 0.35, exposicion: 1,
    // Luz cálida de estudio. Para temáticas frías (tecnología, mar, invierno) usar blancos azulados.
    colores: { principal: '#fff1de', relleno: '#f3e9dc', contorno: '#ffffff', ambiente: '#e9d6c2', foco: '#ffe9c9', polvo: '#fff1de' },
  },
  sombra: { mapa: 2048, radio: 7, area: 7, contacto: 0.35 },
  niebla: { cerca: 14, lejos: 34 },
  polvo: { cantidad: 420, opacidad: 0.55, tamano: 0.035 },
  material: { rugosidad: 0.92, brillo: 0.45, 'brillo-rugosidad': 0.8 },
  producto: { 'flotar-amplitud': 0.06, 'flotar-periodo': 4, 'balanceo-amplitud': 0.6, 'balanceo-velocidad': 0.25, 'vueltas-viaje': 1 },
  movimiento: { viaje: 1.8, 'curva-viaje': 'cubic-bezier(.76,0,.24,1)', escena: 0.8 },
  recorrido: { separacion: 18 },
  render: { 'escala-maxima': 1.5 },
};

function mezclar(base, extra = {}) {
  const r = { ...base };
  for (const [k, v] of Object.entries(extra)) r[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object' ? mezclar(base[k], v) : v;
  return r;
}

/** cubic-bezier(x1,y1,x2,y2) de CSS como función de JavaScript (la misma curva que usa el texto). */
export function curva(css) {
  const [x1, y1, x2, y2] = css.match(/[\d.]+/g).map(Number);
  const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
    return by(t);
  };
}
const srgbA = {}, srgbB = {};
/** Mezcla dos colores en sRGB: entre un oscuro cálido y un claro pasa por un tono intermedio, no por gris. */
function mezclarSrgb(destino, a, b, t) {
  a.getRGB(srgbA, THREE.SRGBColorSpace);
  b.getRGB(srgbB, THREE.SRGBColorSpace);
  return destino.setRGB(lerp(srgbA.r, srgbB.r, t), lerp(srgbA.g, srgbB.g, t), lerp(srgbA.b, srgbB.b, t), THREE.SRGBColorSpace);
}
const rebote = (u) => {
  const n = 7.5625, d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
};

/** Color desde '#rrggbb', 0xrrggbb, una variable CSS ('--acento') o un THREE.Color. */
export function color(valor) {
  if (valor?.isColor) return valor.clone();
  if (typeof valor === 'string' && valor.startsWith('--')) {
    const css = getComputedStyle(document.documentElement).getPropertyValue(valor).trim();
    if (!css) console.warn(`Falta la variable CSS ${valor} en la paleta`);
    return new THREE.Color(css || '#ff00ff');
  }
  return new THREE.Color(valor);
}

// =====================================================================================================
// Kit clay: piezas redondeadas, mate y sin texturas para armar el héroe y las estaciones por código.
// Convención: 1 unidad ≈ 1 metro de maqueta; el piso está en y = 0; el frente mira hacia +z (a cámara).
// =====================================================================================================
export function crearKit(A) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const LEVITA = A.producto['flotar-amplitud'] + 0.1; // hueco bajo el héroe cuando levita: nunca atraviesa el apoyo
  const materiales = new Map();
  /** Material clay (mate, cacheado). */
  function clay(c, extra = {}) {
    const hex = color(c).getHex();
    const clave = hex + JSON.stringify(extra);
    if (!materiales.has(clave)) materiales.set(clave, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.95, metalness: 0, ...extra }));
    return materiales.get(clave);
  }
  const mat = (m) => (m?.isMaterial ? m : clay(m));
  function malla(geo, m, x = 0, y = 0, z = 0) {
    const me = new THREE.Mesh(geo, mat(m));
    me.position.set(x, y, z);
    me.castShadow = true;
    me.receiveShadow = true;
    return me;
  }
  /** Marca algo como fondo (pisos, paredes, haces, polvo): no proyecta sombra sobre el héroe. */
  const fondo = (o) => { o.traverse((x) => { x.userData.fondo = true; }); return o; };
  /** Caja redondeada apoyada en y (la base queda en y, no el centro). */
  function caja(w, h, d, m, x = 0, y = 0, z = 0, r = Math.min(w, h, d) * 0.18) {
    const radio = Math.max(0.004, Math.min(r, w / 2, h / 2, d / 2) - 0.001);
    return malla(new RoundedBoxGeometry(w, h, d, 4, radio), m, x, y + h / 2, z);
  }
  /** Cilindro apoyado en y. */
  const cilindro = (r, h, m, x = 0, y = 0, z = 0, lados = 48) => malla(new THREE.CylinderGeometry(r, r, h, lados), m, x, y + h / 2, z);
  /** Esfera (centro en x, y, z). */
  const esfera = (r, m, x = 0, y = 0, z = 0) => malla(new THREE.SphereGeometry(r, 32, 20), m, x, y, z);
  /** Tubo que une dos puntos (varillas, patas, hilos, tallos). */
  function varilla(a, b, r, m, lados = 16) {
    const me = malla(new THREE.CylinderGeometry(r, r, a.distanceTo(b), lados), m);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    return me;
  }
  /** Sólido de revolución desde un perfil [[radio, altura], …] de abajo hacia arriba (tazas, jarrones, botellas, torres). */
  const torno = (perfil, m, lados = 96) => malla(new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), lados), m);
  /** Tubo por una curva de puntos [[x,y,z], …] (asas, cables, ramas). */
  const tubo = (puntos, r, m, cerrado = false) => malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos.map((p) => V(...p)), cerrado), 64, r, 16, cerrado), m);
  /** Disco con el canto superior redondeado: pedestales, platos, bases. */
  function pedestal(m, r = 1.05, h = 0.32, rb = Math.min(0.08, h * 0.45)) {
    const perfil = [[0, 0], [r, 0]];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; perfil.push([r - rb + Math.cos(a) * rb, h - rb + Math.sin(a) * rb]); }
    perfil.push([0, h]);
    return torno(perfil, m);
  }
  /** Piso que solo recibe sombra: estaciones "en el vacío" (el fondo lo pinta el CSS con el color del estudio). */
  function pisoSombra(w = 16, d = 12) {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ color: color('--estudio-oscuro'), opacity: A.sombra.contacto }));
    me.rotation.x = -Math.PI / 2;
    me.receiveShadow = true;
    return fondo(me);
  }
  /** Habitación de maqueta: piso, pared del fondo con zócalo y, si se pide, pared lateral izquierda. */
  function habitacion(g, { ancho = 14, fondo: prof = 8, piso, pared, lateral, zocalo = '--claro' }) {
    const z0 = -prof / 2 - 0.1, z1 = prof / 2 - 0.1;
    g.add(fondo(caja(ancho, 0.3, z1 - z0, piso, 0, -0.3, (z0 + z1) / 2, 0.06)));
    g.add(fondo(caja(ancho, 6, 0.3, pared, 0, -0.3, z0 - 0.15, 0.04)));
    g.add(fondo(caja(ancho, 0.14, 0.05, zocalo, 0, 0, z0 + 0.025, 0.02)));
    if (lateral) g.add(fondo(caja(0.3, 6, z1 - z0, lateral, -ancho / 2 - 0.15, -0.3, (z0 + z1) / 2, 0.04)));
  }
  /** Textura de canvas: dibujar(ctx, w, h). Se vuelve a dibujar cuando cargan las fuentes. */
  function lienzo(w, h, dibujar) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const pintar = () => { ctx.clearRect(0, 0, w, h); dibujar(ctx, w, h); t.needsUpdate = true; };
    pintar();
    document.fonts?.ready.then(pintar);
    t.userData.pintar = pintar;
    return t;
  }
  /** Placa con texto dibujado (logos, carteles, rótulos). Solo para texto que es parte del objeto, nunca para el contenido. */
  function rotulo(texto, { ancho = 1.2, alto = 0.3, color: c = '--oscuro', fuente = 'display', peso = 700, interletra = -0.04 } = {}) {
    const px = 1024, py = Math.round((px * alto) / ancho);
    const nombre = getComputedStyle(document.documentElement).getPropertyValue(fuente === 'display' ? '--fuente-display' : '--fuente-texto').trim() || 'sans-serif';
    const t = lienzo(px, py, (ctx, w, h) => {
      let tam = h * 0.8;
      ctx.font = `${peso} ${tam}px ${nombre}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${tam * interletra}px`;
      const medida = ctx.measureText(texto).width;
      if (medida > w * 0.96) { tam *= (w * 0.96) / medida; ctx.font = `${peso} ${tam}px ${nombre}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${tam * interletra}px`; }
      ctx.fillStyle = `#${color(c).getHexString(THREE.SRGBColorSpace)}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(texto, w / 2, h * 0.54);
    });
    const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), m);
    me.userData.textura = t;
    return me;
  }
  /** Marco con pantalla o lámina (celulares, cuadros, pizarras, carteles): la textura se ve con luz propia. */
  function marco(ancho, alto, textura, { borde = 0.08, profundo = 0.08, colorMarco = '--oscuro', brillo = 0.9 } = {}) {
    const g = new THREE.Group();
    g.add(caja(ancho + borde * 2, alto + borde * 2, profundo, colorMarco, 0, -alto / 2 - borde, 0, Math.min(0.06, borde)));
    const lamina = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshStandardMaterial({ map: textura, emissive: 0xffffff, emissiveMap: textura, emissiveIntensity: brillo, roughness: 0.6 }));
    lamina.position.z = profundo / 2 + 0.002;
    g.add(lamina);
    return g;
  }
  /** Planta en maceta: hojas como esferas achatadas en un verde apagado (no compite con los acentos). */
  function planta(x = 0, z = 0, escala = 1, { maceta = '--arena', hojas = '#6f8a4a' } = {}) {
    const g = new THREE.Group();
    g.add(torno([[0, 0], [0.22, 0], [0.28, 0.42], [0.3, 0.46], [0, 0.46]], maceta));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = 0.12 + (i % 2) * 0.08;
      const hoja = esfera(0.2, hojas, Math.cos(a) * r, 0.75 + (i % 3) * 0.18, Math.sin(a) * r);
      hoja.scale.set(1, 0.55, 0.7);
      hoja.rotation.set(0.3 * Math.sin(a), a, 0.4);
      g.add(hoja);
    }
    g.add(esfera(0.24, hojas, 0, 1.05, 0));
    g.position.set(x, 0, z);
    g.scale.setScalar(escala);
    return g;
  }
  /**
   * Gráfico de barras hecho con pilas de piezas clay (datos en la escena, no en el texto).
   * valores: [n, …] (cantidad de piezas por barra). Devuelve { grupo, topes } (topes: un Object3D arriba de cada barra,
   * para apoyar el héroe o anclar etiquetas).
   */
  function barras(valores, { colores = ['--arena'], separacion = 1.3, ancho = 0.9, alto = 0.16, hueco = 0.025, fondo: prof = 0.7 } = {}) {
    const grupo = new THREE.Group();
    const topes = [];
    const x0 = (-(valores.length - 1) * separacion) / 2;
    valores.forEach((n, i) => {
      const x = x0 + i * separacion;
      for (let k = 0; k < n; k++) {
        const pieza = caja(ancho, alto, prof, colores[i % colores.length], x + Math.sin(i * 7 + k * 3.1) * 0.03, k * (alto + hueco), 0, alto * 0.4);
        pieza.rotation.y = Math.sin(i * 5 + k * 1.7) * 0.06;
        grupo.add(pieza);
      }
      const tope = new THREE.Object3D();
      tope.position.set(x, n * (alto + hueco), 0);
      grupo.add(tope);
      topes.push(tope);
    });
    return { grupo, topes };
  }
  // ---------- Foco con haz visible y polvo ----------
  const haz = (c, alto, radio) => {
    const geo = new THREE.ConeGeometry(radio, alto, 64, 1, true);
    geo.translate(0, -alto / 2, 0);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: color(c) }, uOpacidad: { value: 0.16 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacidad; varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float borde = pow(abs(dot(vN, vV)), 2.); float caida = mix(1., .08, vY); gl_FragColor = vec4(uColor, borde*caida*uOpacidad); }`,
    });
    const me = new THREE.Mesh(geo, m);
    me.renderOrder = 2;
    return fondo(me);
  };
  let texturaPunto;
  /** Partículas de polvo que suben muy despacio dentro de un cilindro. */
  function polvo(cantidad = A.polvo.cantidad, radio = 1.8, alto = 5) {
    texturaPunto ??= lienzo(64, 64, (ctx) => {
      const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
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
    const m = new THREE.PointsMaterial({ color: color(A.luz.colores.polvo), size: A.polvo.tamano, map: texturaPunto, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: A.polvo.opacidad });
    const puntos = fondo(new THREE.Points(geo, m));
    puntos.userData.mover = (t) => {
      const p = geo.attributes.position;
      for (let i = 0; i < cantidad; i++) {
        const s = semilla[i];
        p.array[i * 3 + 1] = ((s * 0.37 + t * 0.06) % 1) * alto;
        p.array[i * 3] += Math.sin(t * 0.3 + s) * 0.0008;
      }
      p.needsUpdate = true;
    };
    return puntos;
  }
  /** Foco cenital con haz visible y polvo. No proyecta sombra: en toda la escena hay una sola luz con sombra. */
  function foco(g, x = 0, y = 6.2, z = 0, { altoHaz = 5.5, radio = 1.9, intensidad = 1 } = {}) {
    const base = A.luz.foco * (y / 6.2) ** 2 * intensidad;
    const luz = new THREE.SpotLight(color(A.luz.colores.foco), base, 12, 0.36, 0.65, 2);
    luz.position.set(x, y, z);
    luz.target.position.set(x, 0, z);
    g.add(luz, luz.target);
    const h = haz(A.luz.colores.foco, altoHaz, radio);
    h.position.set(x, y, z);
    g.add(h);
    const p = polvo(A.polvo.cantidad, radio * 0.85, altoHaz * 0.9);
    p.position.set(x, 0.1, z);
    g.add(p);
    return { luz, haz: h, polvo: p, base };
  }
  /** Hace flotar y girar despacio cualquier objeto (decorado vivo: "nada queda quieto del todo"). */
  function flotante(o, { amplitud = 0.12, periodo = 5, giro = 0.25, fase = Math.random() * 10 } = {}) {
    const y0 = o.position.y, r0 = o.rotation.y;
    o.userData.mover = (t) => {
      o.position.y = y0 + Math.sin(((t + fase) / periodo) * Math.PI * 2) * amplitud;
      o.rotation.y = r0 + (t + fase) * giro;
    };
    return o;
  }
  /**
   * Base del héroe: un grupo con piezas que se pueden desarmar y un material principal que toma el colorway.
   * pieza(nombre, desarme = [x,y,z], giro = [x,y,z]) → Group donde se agregan las mallas EN SU POSICIÓN FINAL
   * (el grupo de la pieza queda en el origen; desarmar(t) lo corre desarme·t y lo gira giro·t).
   */
  function heroe(colorInicial) {
    const grupo = new THREE.Group();
    const material = new THREE.MeshPhysicalMaterial({
      color: color(colorInicial), roughness: A.material.rugosidad, metalness: 0,
      sheen: A.material.brillo, sheenRoughness: A.material['brillo-rugosidad'], sheenColor: color('--claro'),
    });
    const piezas = {};
    const desarmes = [];
    const h = {
      grupo, material, piezas, texturas: [],
      pieza(nombre, desarme = [0, 0, 0], giro = [0, 0, 0]) {
        const g = new THREE.Group();
        g.name = nombre;
        grupo.add(g);
        piezas[nombre] = g;
        desarmes.push({ g, d: V(...desarme), r: giro });
        return g;
      },
      /** Se llama con un THREE.Color en cada cuadro del fundido de colorway. Pisar alColor(c) para extras (ej. logo claro/oscuro). */
      ponerColor(c) { material.color.copy(c); h.alColor?.(c); },
      desarmar(t) {
        for (const { g, d, r } of desarmes) { g.position.copy(d).multiplyScalar(t); g.rotation.set(r[0] * t, r[1] * t, r[2] * t); }
      },
    };
    return h;
  }
  return {
    THREE, V, LEVITA, color, clay, malla, fondo, caja, cilindro, esfera, varilla, torno, tubo, pedestal, pisoSombra,
    habitacion, lienzo, rotulo, marco, planta, barras, haz, polvo, foco, flotante, heroe, RoundedBoxGeometry,
  };
}

// =====================================================================================================
// Motor
// =====================================================================================================
export function iniciar({ lienzo, escenario, tema, eventos = {}, escalaMaxima }) {
  const A = mezclar(AJUSTES, tema.ajustes);
  escalaMaxima ??= A.render['escala-maxima'];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; // neutro: los colores de la paleta no se lavan
  renderer.toneMappingExposure = A.luz.exposicion;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = A.luz.entorno;
  escena.fog = new THREE.Fog(color('--estudio-claro'), A.niebla.cerca, A.niebla.lejos);
  const camara = new THREE.PerspectiveCamera(A.camara.campo, 16 / 9, 0.1, 120);

  // ---------- Luz de estudio: una sola luz con sombra, que acompaña a la cámara ----------
  const L = A.luz.colores;
  const hemi = new THREE.HemisphereLight(color(L.ambiente), color('--piso-claro'), A.luz.ambiente);
  const principal = new THREE.DirectionalLight(color(L.principal), A.luz.principal);
  principal.castShadow = true;
  const s = A.sombra;
  Object.assign(principal.shadow.camera, { left: -s.area, right: s.area, top: s.area, bottom: -s.area, near: 1, far: 30 });
  principal.shadow.mapSize.setScalar(s.mapa);
  principal.shadow.radius = s.radio;
  principal.shadow.blurSamples = 16;
  principal.shadow.bias = -0.0004;
  const relleno = new THREE.DirectionalLight(color(L.relleno), A.luz.relleno);
  const contorno = new THREE.DirectionalLight(color(L.contorno), A.luz.contorno);
  escena.add(hemi, principal, principal.target, relleno, relleno.target, contorno, contorno.target);

  // ---------- Héroe y estaciones ----------
  const kit = crearKit(A);
  kit.copiaHeroe = (c) => tema.crearHeroe(kit, c); // para decorar (copias flotando en la portada, pilas…)
  const heroe = tema.crearHeroe(kit, tema.estaciones[0].color ?? '--oscuro');
  heroe.grupo.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(heroe.grupo);

  const estaciones = tema.estaciones.map((def, indice) => {
    const grupo = new THREE.Group();
    grupo.position.x = indice * A.recorrido.separacion;
    escena.add(grupo);
    const r = def.construir?.(grupo, kit) ?? {};
    let { ancla } = r;
    if (!ancla) { ancla = new THREE.Object3D(); ancla.position.set(0, 1.2, 0); grupo.add(ancla); }
    const poses = {};
    for (const [nombre, p] of Object.entries(r.poses ?? def.poses ?? {})) {
      poses[nombre] = { ...p, camara: p.camara && new THREE.Vector3(...p.camara), mira: p.mira && new THREE.Vector3(...p.mira), heroe: p.heroe && new THREE.Vector3(...p.heroe) };
    }
    const moviles = [];
    grupo.traverse((o) => { if (o.userData.mover) moviles.push(o); });
    return {
      escala: 1, encuadre: 'editorial', tema: 'claro', ...def, ...r, indice, grupo, ancla, poses, moviles,
      anclas: r.anclas ?? {},
      colorway: color(def.color ?? '--oscuro'),
      fondo: color(def.tema === 'oscuro' ? '--estudio-oscuro' : '--estudio-claro'),
    };
  });
  escena.updateMatrixWorld(true);
  // Las luces de las estaciones (focos, lámparas) cuelgan de la escena y nunca se ocultan: si cambiara la cantidad de
  // luces visibles, three.js recompilaría los shaders y la cámara se trabaría a mitad de viaje.
  for (const e of estaciones) {
    const luces = [];
    e.grupo.traverse((o) => { if (o.isLight) luces.push(o); });
    for (const luz of luces) escena.attach(luz);
  }

  // Pose de cámara de cada estación, calculada una vez desde su ancla.
  // editorial: el héroe en los 7/12 de la derecha y el texto a la izquierda; centro: el héroe al medio;
  // macro: plano medio del héroe, a la derecha, con la cita en la columna libre.
  // Tamaño del héroe armado (sin escalar): la cámara lo encuadra con esto. El héroe debería medir ~2 de alto.
  const medida = new THREE.Box3().setFromObject(heroe.grupo).getSize(new THREE.Vector3());
  const altoHeroe = tema.alturaHeroe ?? medida.y;
  const tamano = Math.max(altoHeroe, medida.x * 0.8);
  const { distancia, altura } = A.camara;
  const alturaHeroe = (e) => altoHeroe * e.escala;
  for (const e of estaciones) {
    const a = e.ancla.getWorldPosition(new THREE.Vector3());
    const d = e.distancia ?? distancia;
    const centro = e.mira ? new THREE.Vector3(...e.mira).add(e.grupo.position) : a.clone().add(new THREE.Vector3(0, alturaHeroe(e) / 2, 0));
    if (e.encuadre === 'editorial') {
      e.mira = centro.clone().add(new THREE.Vector3(-A.camara['corrimiento-editorial'] * (d / distancia), 0, 0));
      e.camara = e.mira.clone().add(new THREE.Vector3(0, altura, d));
    } else if (e.encuadre === 'macro') {
      const { corrimiento = -0.45, distancia: dm = 2.9 } = e.macro ?? {}; // en tamaños de héroe
      e.mira = centro.clone().add(new THREE.Vector3(corrimiento * tamano * e.escala, 0, 0));
      e.camara = e.mira.clone().add(new THREE.Vector3(0.05, 0.1, dm * tamano * e.escala));
    } else {
      e.mira = centro.clone().add(new THREE.Vector3(0, e.subirMira ?? 0.15, 0));
      e.camara = e.mira.clone().add(new THREE.Vector3(0, altura, d * (e.indice === 0 ? 1.12 : 1)));
    }
  }

  // ---------- Estado del viaje ----------
  const facil = curva(A.movimiento['curva-viaje']);
  const dur = A.movimiento.viaje;
  const lambdaPose = 3 / (A.movimiento.escena * 1.4);
  let actual = 0;
  let viaje = null; // { desde, hasta, t, d, entro, giro0 }
  let posicion = 0; // índice continuo: 1.5 = a mitad de camino entre la estación 1 y la 2
  let intro = reducido ? 1 : 0;
  let arrancado = false;
  let giro = 0, desarme = 0, flota = 1, tiempo = 0;
  const puntero = new THREE.Vector2(), paralaje = new THREE.Vector2();
  let pose = null;
  const desvio = { camara: new THREE.Vector3(), mira: new THREE.Vector3(), heroe: new THREE.Vector3() };
  let factorEscala = 1;

  let pendiente = null; // si se pide otra estación durante un viaje, se encola: la cámara nunca salta
  function ir(i, nombrePose = null) {
    i = clamp(i, 0, estaciones.length - 1);
    if (viaje) { pendiente = i === viaje.hasta && nombrePose === pose ? null : { i, pose: nombrePose }; return; }
    pose = nombrePose;
    if (i === actual) return;
    eventos.salir?.(actual, i);
    const saltos = Math.abs(i - actual);
    viaje = { desde: actual, hasta: i, t: 0, d: reducido ? 0.001 : dur * Math.min(1 + 0.18 * (saltos - 1), 1.7), entro: false, giro0: giro };
    actual = i;
  }

  // ---------- Cuadro a cuadro ----------
  const v = new THREE.Vector3(), m1 = new THREE.Vector3(), m2 = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3();
  const cero = new THREE.Vector3();
  const colorA = new THREE.Color(), fondo = new THREE.Color();
  const P = A.producto;
  const amortiguar = (vec, obj, lambda, dt) => vec.set(damp(vec.x, obj.x, lambda, dt), damp(vec.y, obj.y, lambda, dt), damp(vec.z, obj.z, lambda, dt));

  function actualizar(dt) {
    tiempo += dt;
    const t = tiempo;
    let s = 0, a = actual, b = actual;
    if (viaje) {
      viaje.t += dt / viaje.d;
      s = facil(Math.min(viaje.t, 1));
      a = viaje.desde; b = viaje.hasta;
      if (!viaje.entro && s > 0.55) { viaje.entro = true; eventos.entrar?.(b); }
      if (viaje.t >= 1) {
        viaje = null; s = 0; a = b = actual;
        eventos.llegar?.(actual);
        if (pendiente !== null) { const p = pendiente; pendiente = null; ir(p.i, p.pose); }
      }
    }
    const ea = estaciones[a], eb = estaciones[b];
    posicion = lerp(a, b, s);
    const arco = Math.sin(Math.PI * s); // 0 en las puntas, 1 a mitad del viaje
    const llegada = s > 0.5 ? eb : ea;

    // Pose dentro de la estación (diapositivas con data-pose): desvíos que se acomodan con suavidad.
    const p = estaciones[actual].poses[pose] ?? null;
    amortiguar(desvio.camara, p?.camara ?? cero, lambdaPose, dt);
    amortiguar(desvio.mira, p?.mira ?? cero, lambdaPose, dt);
    amortiguar(desvio.heroe, p?.heroe ?? cero, lambdaPose, dt);
    factorEscala = damp(factorEscala, p?.escala ? p.escala / estaciones[actual].escala : 1, lambdaPose, dt);

    // Cámara: travelling con grúa (sube y retrocede a mitad de camino), una respiración leve y paralaje del puntero.
    m1.copy(ea.mira).lerp(eb.mira, s).add(desvio.mira);
    c1.copy(ea.camara).lerp(eb.camara, s).add(desvio.camara);
    c1.y += arco * A.camara['elevacion-viaje'];
    c1.z += arco * A.camara['retroceso-viaje'];
    paralaje.x = damp(paralaje.x, puntero.x * A.camara.paralaje, 3, dt);
    paralaje.y = damp(paralaje.y, puntero.y * A.camara.paralaje * 0.5, 3, dt);
    const factorMacro = ea.encuadre === 'macro' || eb.encuadre === 'macro' ? 0.25 : 1;
    camara.position.set(c1.x + paralaje.x * factorMacro + Math.sin(t * 0.21) * 0.06, c1.y + paralaje.y * factorMacro + Math.sin(t * 0.17) * 0.04, c1.z);
    camara.lookAt(m1);

    // Las luces acompañan a la cámara (la sombra siempre cae bien en la estación activa).
    v.copy(m1); v.y = 0;
    principal.target.position.copy(v);
    principal.position.copy(v).add(m2.set(-4, 8, 5));
    relleno.target.position.copy(v);
    relleno.position.copy(v).add(m2.set(6, 3, 6));
    contorno.target.position.copy(v);
    contorno.position.copy(v).add(m2.set(2, 5, -7));

    // Fondo y niebla: funden entre el estudio claro y el oscuro (el CSS pinta detrás del canvas transparente).
    mezclarSrgb(fondo, ea.fondo, eb.fondo, s);
    escena.fog.color.copy(fondo);
    escenario.style.setProperty('--fondo-escena', `#${fondo.getHexString()}`);

    // Héroe: viaja de ancla en ancla con un arco, da una vuelta completa y cambia de colorway con un fundido.
    ea.ancla.getWorldPosition(c2);
    eb.ancla.getWorldPosition(m2);
    c2.lerp(m2, s).add(desvio.heroe);
    c2.y += arco * 1.4;
    const caida = arrancado ? (reducido ? 1 : rebote(Math.min((intro += dt / 1.1), 1))) : 0;
    flota = damp(flota, llegada.apoyada ? 0 : 1, 6, dt);
    const flotar = Math.sin((t / P['flotar-periodo']) * Math.PI * 2) * P['flotar-amplitud'] * flota;
    c2.y += flotar + (1 - caida) * 7;
    heroe.grupo.position.copy(c2);
    heroe.grupo.scale.setScalar(lerp(ea.escala, eb.escala, s) * factorEscala);

    // En reposo se balancea mostrando el frente y los tres cuartos (nunca queda de espaldas).
    const quieta = !viaje && (llegada.encuadre === 'macro' || llegada.quieta);
    const vuelta = Math.round(giro / (Math.PI * 2)) * Math.PI * 2;
    if (viaje) giro = viaje.giro0 + Math.PI * 2 * P['vueltas-viaje'] * s;
    else if (quieta) giro = damp(giro, vuelta + (llegada.giroReposo ?? 0.35), 2.5, dt);
    else giro = damp(giro, vuelta + (llegada.giroReposo ?? 0) + Math.sin(t * P['balanceo-velocidad']) * (llegada.balanceo ?? P['balanceo-amplitud']), 1.5, dt);
    heroe.grupo.rotation.set(arco * 0.25, giro, arco * -0.15);

    heroe.ponerColor(mezclarSrgb(colorA, ea.colorway, eb.colorway, smoothstep(s, 0.3, 0.7)));
    desarme = damp(desarme, !viaje && (p?.desarmar ?? estaciones[actual].desarmar) ? 1 : 0, 3, dt);
    heroe.desarmar(desarme);
    heroe.actualizar?.(dt, t); // detalles vivos del héroe (vapor, luces, hélices…)

    // Solo las estaciones vecinas se dibujan; cada una recibe su "presencia" (0 lejos, 1 con la cámara encima).
    for (const e of estaciones) {
      const distanciaEst = Math.abs(posicion - e.indice);
      e.grupo.visible = distanciaEst < 1.6;
      if (!e.grupo.visible) continue;
      for (const o of e.moviles) o.userData.mover(t, dt);
      e.actualizar?.(dt, t, clamp(1 - distanciaEst, 0, 1));
    }
  }
  const render = () => renderer.render(escena, camara);

  // ---------- Tamaño, puntero y arranque ----------
  function medir() {
    const { width, height } = escenario.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, escalaMaxima));
    renderer.setSize(width, height, false);
    camara.aspect = width / height;
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(medir).observe(escenario);
  medir();
  escenario.addEventListener('pointermove', (ev) => {
    const r = escenario.getBoundingClientRect();
    puntero.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
  });
  escenario.addEventListener('pointerleave', () => puntero.set(0, 0));

  // Precalienta todo detrás del cargador: un cuadro con todo visible y sin recorte compila todos los shaders y sube
  // geometrías y texturas a la placa. Sin esto, la cámara se traba la primera vez que llega a cada estación.
  function precalentar() {
    const tocados = [];
    escena.traverse((o) => { tocados.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; });
    for (const tx of heroe.texturas) renderer.initTexture(tx);
    camara.position.copy(estaciones[0].camara);
    camara.lookAt(estaciones[0].mira);
    render();
    for (const [o, visible, recorte] of tocados) { o.visible = visible; o.frustumCulled = recorte; }
  }
  precalentar();
  let ultimo = null;
  const bucle = (ahora) => {
    const dt = ultimo === null ? 0 : Math.min((ahora - ultimo) / 1000, 1 / 20);
    ultimo = ahora;
    actualizar(dt);
    render();
  };
  renderer.setAnimationLoop(bucle);

  const caja = new THREE.Box3(), mitad = new THREE.Vector3(), w = new THREE.Vector3();
  /**
   * Posición en pantalla (en %) de una pieza del héroe o de un ancla de la estación actual, para las etiquetas.
   * punto: [x, y, z] de -1 a 1 dentro de la caja de la pieza ([0, 1, 0] = arriba al centro); en anclas, metros.
   */
  function proyectar(nombre, punto = [0, 0, 0]) {
    const pieza = heroe.piezas[nombre];
    if (pieza) {
      caja.setFromObject(pieza);
      caja.getCenter(w);
      caja.getSize(mitad).multiplyScalar(0.5);
      w.add(mitad.multiply(v.fromArray(punto)));
    } else {
      const ancla = estaciones[actual].anclas[nombre] ?? estaciones.find((e) => e.anclas[nombre])?.anclas[nombre];
      if (!ancla) return { x: -100, y: -100 };
      ancla.getWorldPosition(w).add(v.fromArray(punto));
    }
    w.project(camara);
    return { x: (w.x * 0.5 + 0.5) * 100, y: (-w.y * 0.5 + 0.5) * 100 };
  }

  return {
    ir, estaciones, heroe, kit,
    siguiente: () => ir((pendiente?.i ?? actual) + 1),
    anterior: () => ir((pendiente?.i ?? actual) - 1),
    get actual() { return actual; },
    get viajando() { return Boolean(viaje); },
    total: estaciones.length,
    proyectar,
    /** Cambia de pose sin salir de la estación (la cámara solo se acomoda). */
    pose(nombre) { if (!viaje) pose = nombre; else if (pendiente) pendiente.pose = nombre; else pendiente = { i: actual, pose: nombre }; },
    /** Suelta el héroe con un rebote (después del cargador). */
    arrancar() { arrancado = true; },
    /** Saltar sin viaje (al abrir con #n en la URL, o para las capturas). */
    saltar(i, nombrePose = null) { actual = clamp(i, 0, estaciones.length - 1); viaje = null; pendiente = null; pose = nombrePose; },
    /** Avanza la animación sin esperar y dibuja (capturas: la escena queda asentada). */
    adelantar(segundos) { for (let k = 0; k < segundos * 60; k++) actualizar(1 / 60); render(); },
    depuracion: { renderer, escena, camara, render, pausar: (si) => { ultimo = null; renderer.setAnimationLoop(si ? null : bucle); } },
  };
}
