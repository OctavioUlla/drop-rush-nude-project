// El mundo clay del plano secuencia: una estación por bloque, en fila sobre el eje X.
// Cada estación devuelve { nombre, tema, encuadre, ancla, actualizar(dt, t, presencia) } y, según el caso:
// - escala: tamaño de la protagonista en esa estación.
// - apoyada: la protagonista descansa sobre algo (no flota). Si no, levita: su ancla deja un hueco sobre el apoyo
//   mayor que la amplitud de flotar, así nunca atraviesa el pedestal, la caja ni el plato.
// - percha { pivote, gancho }: la protagonista cuelga de una percha; el motor la hace oscilar desde la barra.
// - poses: encuadres alternativos dentro de la estación (diapositivas con data-pose); desplazan cámara, mira y
//   protagonista, y pueden cambiar su escala o desarmarla.
// - anclas: puntos del mundo para las etiquetas HTML (data-ancla).
// "ancla" es el Object3D donde se apoya la protagonista; "presencia" va de 0 a 1 según cuán cerca está la cámara.
// Todo lo que es fondo (pisos, paredes, haces de luz, polvo) se marca con userData.fondo: el control de solapes
// de la presentación solo mira los objetos.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colores3d, grupos, tokens } from '../tokens.js';
import { crearSudadera } from './sudadera.js';
import { feed, publicacionViral, cartelTienda, neonNudeHouse, etiquetaEnvio, lienzo } from './pantallas.js';

const C = colores3d;
const P = C.presentacion;
const esc = tokens.escena;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const { smoothstep, damp } = THREE.MathUtils;

/** Hueco entre el apoyo y la protagonista cuando levita (mayor que la amplitud de flotar). */
const LEVITA = esc.producto['flotar-amplitud'] + 0.1;

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
const fondo = (o) => { o.traverse((x) => { x.userData.fondo = true; }); return o; };
/** Caja redondeada apoyada en y (la base queda en y, no el centro). */
function caja(w, h, d, hex, x = 0, y = 0, z = 0, r = Math.min(w, h, d) * 0.18) {
  const mat = typeof hex === 'number' ? clay(hex) : hex;
  return malla(new RoundedBoxGeometry(w, h, d, 4, Math.max(0.004, Math.min(r, w / 2, h / 2, d / 2) - 0.001)), mat, x, y + h / 2, z);
}
/** Cilindro apoyado en y. */
function cilindro(r, h, hex, x = 0, y = 0, z = 0, lados = 48) {
  return malla(new THREE.CylinderGeometry(r, r, h, lados), typeof hex === 'number' ? clay(hex) : hex, x, y + h / 2, z);
}
/** Tubo que une dos puntos (varillas, hilos, patas). */
function varilla(a, b, r, hex, lados = 16) {
  const largo = a.distanceTo(b);
  const m = malla(new THREE.CylinderGeometry(r, r, largo, lados), typeof hex === 'number' ? clay(hex) : hex);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
const esfera = (r, hex, x = 0, y = 0, z = 0) => malla(new THREE.SphereGeometry(r, 24, 16), clay(hex), x, y, z);
/** Disco con el canto superior redondeado: pedestales, pies, platos. */
function pedestal(hex, r = 1.05, h = 0.32, rb = Math.min(0.08, h * 0.45)) {
  const perfil = [V(0, 0), V(r, 0)].map((v) => new THREE.Vector2(v.x, v.y));
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI / 2;
    perfil.push(new THREE.Vector2(r - rb + Math.cos(a) * rb, h - rb + Math.sin(a) * rb));
  }
  perfil.push(new THREE.Vector2(0, h));
  return malla(new THREE.LatheGeometry(perfil, 96), clay(hex));
}
/** Piso que solo recibe sombra: para las estaciones "en el vacío" (el fondo lo pone el CSS). */
function pisoSombra(w = 16, d = 12) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ color: P['sombra-contacto'], opacity: esc['sombra-contacto'].opacidad }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return fondo(m);
}
/** Habitación: piso, pared del fondo con zócalo y, si se pide, pared lateral izquierda. */
function habitacion(g, { x0, x1, z0 = -4.1, z1 = 3.9, piso, pared, lateral }) {
  const w = x1 - x0, cx = (x0 + x1) / 2;
  g.add(fondo(caja(w, 0.3, z1 - z0, piso, cx, -0.3, (z0 + z1) / 2, 0.06)));
  g.add(fondo(caja(w, 6, 0.3, pared, cx, -0.3, z0 - 0.15, 0.04)));
  g.add(fondo(caja(w, 0.14, 0.05, C.marca.crema, cx, 0, z0 + 0.025, 0.02)));
  if (lateral) g.add(fondo(caja(0.3, 6, z1 - z0, lateral, x0 - 0.15, -0.3, (z0 + z1) / 2, 0.04)));
}

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
  return fondo(m);
};
let texturaPunto;
function polvo(cantidad, radio, alto) {
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
  const mat = new THREE.PointsMaterial({
    color: P.polvo, size: esc.polvo.tamano, map: texturaPunto, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: esc.polvo.opacidad,
  });
  const puntos = fondo(new THREE.Points(geo, mat));
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
  const base = esc.luz.foco * (y / 6.2) ** 2;
  const luz = new THREE.SpotLight(P.foco, base, 12, 0.36, 0.65, 2);
  luz.position.set(x, y, z);
  luz.target.position.set(x, 0, z);
  const cono = haz(P.foco, altoHaz, radio);
  cono.position.set(x, y, z);
  const motas = polvo(esc.polvo.cantidad, radio * 0.75, altoHaz * 0.9);
  motas.position.set(x, 0, z);
  grupo.add(luz, luz.target, cono, motas);
  /** f de 0 (apagado) a 1; opacidad del haz según la presencia de la cámara. */
  const encender = (f, opacidad) => {
    luz.intensity = base * f;
    cono.material.uniforms.uOpacidad.value = opacidad * f;
    motas.material.opacity = esc.polvo.opacidad * f;
  };
  return { luz, cono, motas, encender };
}

// ---------- Percha y perchero ----------
const metal = C.marca['cacao-profundo'];
/**
 * Percha en coordenadas de la sudadera (escala 1): los hombros quedan escondidos dentro del cuerpo, el cuello
 * sale por el escote (por delante de la capucha) y el gancho abraza una barra de radio `radioBarra`.
 * lado 'frente': barra paralela a la prenda (exhibición de frente); 'costado': barra perpendicular (perchero).
 * Devuelve { grupo, gancho } — gancho es el centro de la barra en coordenadas de la sudadera.
 */
function crearPercha(radioBarra, lado = 'frente') {
  const g = new THREE.Group();
  const r = 0.024, zs = 0.06, alto = 2.2;
  const mat = clay(metal, { roughness: 0.6 });
  const tubo = (puntos) => malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 48, r, 10, false), mat);
  // Hombros (dentro del cuerpo) y cuello que sube por el escote.
  g.add(tubo([V(-0.62, 1.7, 0), V(-0.32, 1.86, 0), V(0, 1.915, 0), V(0.32, 1.86, 0), V(0.62, 1.7, 0)]));
  g.add(tubo([V(0, 1.9, 0), V(0, 1.97, 0.045), V(0, 2.06, zs), V(0, alto, zs)]));
  // Gancho: arco alrededor de la barra, que arranca donde termina el cuello.
  const R = radioBarra + r;
  const u = lado === 'frente' ? V(0, 0, 1) : V(1, 0, 0);
  const centro = V(0, alto, zs).addScaledVector(u, -R);
  const arco = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 1.22;
    arco.push(centro.clone().addScaledVector(u, R * Math.cos(a)).add(V(0, R * Math.sin(a), 0)));
  }
  g.add(tubo(arco));
  const fin = arco.at(-1);
  for (const p of [V(-0.62, 1.7, 0), V(0.62, 1.7, 0), V(0, alto, zs), fin]) g.add(malla(new THREE.SphereGeometry(r * 1.05, 12, 8), mat, p.x, p.y, p.z));
  return { grupo: g, gancho: centro };
}
/** Perchero de exhibición: dos parantes con pie y una barra a la altura `alto`, a lo largo del eje X. */
function crearRiel(largo, alto, base = 0, radioBarra = 0.035) {
  const g = new THREE.Group();
  const mat = clay(metal, { roughness: 0.6 });
  for (const x of [-largo / 2, largo / 2]) {
    const pie = pedestal(metal, 0.2, 0.05, 0.02);
    pie.position.set(x, base, 0);
    g.add(pie, varilla(V(x, base + 0.04, 0), V(x, alto, 0), 0.03, metal), esfera(0.05, metal, x, alto, 0));
  }
  g.add(varilla(V(-largo / 2, alto, 0), V(largo / 2, alto, 0), radioBarra, metal));
  g.traverse((m) => { if (m.isMesh) m.material = mat; });
  return g;
}

// ---------- Estaciones ----------
function estacionPortada(g) {
  g.add(pisoSombra());
  g.add(pedestal(P['pedestal-cacao']));
  const ancla = new THREE.Object3D();
  ancla.position.y = 0.32 + LEVITA;
  g.add(ancla);
  const f = foco(g, 0, 6.2, 0);
  // Sudaderas que flotan alrededor, en los neutros de la marca (la protagonista es la única con colorway).
  // Cada una en su zona libre: fuera del título, del menú, de la protagonista y del haz.
  const flotantes = [
    [C.marca.crema, -3.5, 3.0, -2.0, 0.45, 0.5], [C.marca.arena, 3.6, 3.35, -3.0, 0.4, -0.6],
    [C.marca['cacao-suave'], 2.2, 3.05, -5.0, 0.3, 0.3], [C.marca.piedra, 3.45, 1.35, 0.5, 0.42, -0.4],
  ].map(([color, x, y, z, s, giro], i) => {
    const s2 = crearSudadera(color);
    s2.grupo.scale.setScalar(s);
    s2.grupo.position.set(x, y, z);
    Object.assign(s2, { semilla: i * 1.7, base: V(x, y, z), giro });
    g.add(s2.grupo);
    return s2;
  });
  // Papelitos del drop, con los colores de los grupos.
  const papelitos = crearPapelitos(g);
  let luzHype = 1;
  return {
    tema: 'cacao', encuadre: 'centro', ancla, escala: 0.86,
    /** Coreografía del hype (la maneja el motor): 0 = luz apagada, 1 = normal. */
    luz(f) { luzHype = f; },
    lanzarPapelitos: () => papelitos.lanzar(),
    actualizar(dt, t, presencia) {
      f.motas.userData.mover(t);
      f.encender(luzHype, 0.16 * presencia);
      for (const s of flotantes) {
        const k = t * 0.5 + s.semilla;
        s.grupo.position.y = s.base.y + Math.sin(k * 1.2) * 0.12;
        s.grupo.rotation.set(Math.sin(k * 0.7) * 0.12, s.giro + Math.sin(k * 0.45) * 0.45, Math.sin(k * 0.9) * 0.08);
      }
      papelitos.actualizar(dt);
    },
  };
}

/** Lluvia de papelitos: rectángulos que caen girando, se apoyan en el piso y desaparecen. */
function crearPapelitos(g, cantidad = 260) {
  const geo = new THREE.PlaneGeometry(0.11, 0.06);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide });
  const m = new THREE.InstancedMesh(geo, mat, cantidad);
  m.frustumCulled = false;
  m.visible = false;
  const color = new THREE.Color();
  const p = Array.from({ length: cantidad }, (_, i) => {
    m.setColorAt(i, color.setHex(grupos[i % grupos.length].color3d));
    return { pos: V(), vel: V(), giro: V(), eje: V(), vida: 0, retraso: 0 };
  });
  m.instanceColor.needsUpdate = true;
  g.add(fondo(m));
  const o = new THREE.Object3D();
  let activo = 0;
  return {
    lanzar() {
      activo = 6.5;
      m.visible = true;
      for (const q of p) {
        const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 4.2;
        q.pos.set(Math.cos(a) * r, 4.8 + Math.random() * 2.5, Math.sin(a) * r * 0.55 - 0.4);
        q.vel.set((Math.random() - 0.5) * 0.6, -0.4 - Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
        q.eje.set(Math.random(), Math.random(), Math.random()).normalize();
        q.giro.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        q.vida = 0;
        q.retraso = Math.random() * 0.6;
      }
    },
    actualizar(dt) {
      if (activo <= 0) return;
      activo -= dt;
      p.forEach((q, i) => {
        q.vida += dt;
        if (q.vida > q.retraso && q.pos.y > 0.02) {
          q.pos.addScaledVector(q.vel, dt);
          q.pos.x += Math.sin(q.vida * 3 + i) * dt * 0.35; // vaivén al caer
          q.giro.addScaledVector(q.eje, dt * 5);
        }
        const enPiso = q.pos.y <= 0.02;
        if (enPiso) q.pos.y = 0.012;
        o.position.copy(q.pos);
        if (enPiso) o.rotation.set(-Math.PI / 2, 0, q.giro.y);
        else o.rotation.set(q.giro.x, q.giro.y, q.giro.z);
        o.scale.setScalar(activo < 1 ? Math.max(activo, 0) : 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      if (activo <= 0) m.visible = false;
    },
  };
}

function estacionHistoria(g) {
  habitacion(g, { x0: -6, x1: 10, piso: P['casa-piso'], pared: C.juego['fachada-1'], lateral: C.juego['fachada-1'] });
  // Ventana con luz, arriba a la derecha de la prenda.
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.7), new THREE.MeshBasicMaterial({ color: P.pantalla, toneMapped: false }));
  vidrio.position.set(2.6, 3, -4.09);
  g.add(fondo(vidrio));
  for (const [w, h, x, y] of [[2.2, 0.12, 2.6, 2.1], [2.2, 0.12, 2.6, 3.92], [0.12, 1.94, 1.55, 3.01], [0.12, 1.94, 3.65, 3.01], [0.08, 1.7, 2.6, 3.01]]) {
    g.add(fondo(caja(w, h, 0.12, C.marca.crema, x, y - h / 2, -4.04, 0.03)));
  }
  g.add(fondo(caja(2.4, 0.08, 0.26, C.marca.crema, 2.6, 2.0, -3.97, 0.03))); // alféizar
  // Cama contra la pared del fondo, a la derecha (fuera de la columna del texto).
  const cama = new THREE.Group();
  cama.add(caja(3.2, 0.4, 2.1, C.juego['fachada-2'], 0, 0, 0, 0.08));
  cama.add(caja(3.1, 0.3, 2.0, C.marca.crema, 0, 0.4, 0, 0.12));
  cama.add(caja(2.0, 0.06, 2.04, C.marca['cacao-suave'], -0.5, 0.7, 0, 0.03)); // manta
  cama.add(caja(0.62, 0.18, 1.3, C.marca.arena, 1.1, 0.7, 0, 0.08)); // almohada
  cama.add(caja(0.16, 1.1, 2.1, C.juego['fachada-2'], 1.68, 0, 0, 0.06)); // respaldo
  cama.position.set(3.0, 0, -3.05);
  g.add(cama);
  // La caja abierta de los primeros pedidos: la protagonista levita sobre ella.
  const carton = P['casa-carton'];
  const W = 1.7, H = 0.8, D = 1.2, e = 0.06;
  const abierta = new THREE.Group();
  abierta.add(caja(W, e, D, carton, 0, 0, 0, 0.02));
  for (const z of [D / 2 - e / 2, -D / 2 + e / 2]) abierta.add(caja(W, H, e, carton, 0, 0, z, 0.02));
  for (const x of [W / 2 - e / 2, -W / 2 + e / 2]) abierta.add(caja(e, H, D - 2 * e, carton, x, 0, 0, 0.02));
  // Solapas: las largas se abren hacia afuera y arriba; las cortas cuelgan por fuera de los costados.
  const solapa = (largo, ancho, pos, rot, eje) => {
    const bisagra = new THREE.Group();
    bisagra.position.copy(pos);
    // el espesor queda del lado de afuera, así la solapa no se mete en la pared
    const s = caja(eje === 'x' ? largo : ancho, 0.035, eje === 'x' ? ancho : largo, carton, 0, eje === 'x' ? -0.0175 : 0.0175, 0, 0.012);
    if (eje === 'x') s.position.z = Math.sign(pos.z) * ancho / 2; else s.position.x = Math.sign(pos.x) * ancho / 2;
    bisagra.add(s);
    bisagra.rotation.copy(rot);
    abierta.add(bisagra);
  };
  solapa(W, D / 2 - 0.02, V(0, H, D / 2), new THREE.Euler(-0.5, 0, 0), 'x');
  solapa(W, D / 2 - 0.02, V(0, H, -D / 2), new THREE.Euler(0.5, 0, 0), 'x');
  solapa(D - 0.04, 0.5, V(W / 2, H, 0), new THREE.Euler(0, 0, -1.35), 'z');
  solapa(D - 0.04, 0.5, V(-W / 2, H, 0), new THREE.Euler(0, 0, 1.35), 'z');
  abierta.add(caja(W - 2 * e - 0.02, 0.07, D - 2 * e - 0.02, C.marca.crema, 0, H - 0.12, 0, 0.03)); // papel de seda
  const etiqueta = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.39), new THREE.MeshStandardMaterial({ map: etiquetaEnvio(), roughness: 0.9 }));
  etiqueta.position.set(-0.3, 0.4, D / 2 + 0.002);
  abierta.add(etiqueta);
  g.add(abierta);
  const brillo = new THREE.PointLight(P.foco, 1.6, 2.6, 2); // luz cálida que sale de la caja
  brillo.position.set(0, 0.95, 0);
  g.add(brillo);
  const ancla = new THREE.Object3D();
  ancla.position.y = H + 0.2 + LEVITA; // por encima de las solapas abiertas
  g.add(ancla);

  // Pila de cajas de los pedidos que siguieron, delante de la cama.
  [[0, 0.04], [0.36, -0.05], [0.72, 0.03]].forEach(([y, ry], k) => {
    const b = caja(0.72 - k * 0.08, 0.36, 0.56 - k * 0.04, carton, 2.75, y, -1.55, 0.035);
    b.rotation.y = ry;
    b.add(caja(0.12, 0.008, 0.565 - k * 0.04, C.juego['fachada-2'], 0, 0.18, 0, 0.003));
    g.add(b);
  });
  return {
    tema: 'crema', encuadre: 'editorial', ancla, escala: 0.8,
    // Se encuadran la caja y la prenda enteras.
    mira: V(0, 1.3, 0), distancia: 9.5,
    actualizar() {},
  };
}

/** Celular con su pantalla, encastrado en un soporte apoyado en el piso. */
function celular(textura_, w = 1.5, h = 3.0, soporte = true) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Group();
  cuerpo.add(caja(w, h, 0.16, C.marca['cacao-profundo'], 0, 0, 0, 0.2));
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, h - 0.14), new THREE.MeshBasicMaterial({ map: textura_, toneMapped: false }));
  pantalla.position.set(0, h / 2, 0.082);
  cuerpo.add(pantalla);
  if (soporte) {
    cuerpo.position.y = 0.07;
    cuerpo.rotation.x = -0.06;
    g.add(caja(w * 0.62, 0.2, 0.5, C.marca.cacao, 0, 0, -0.04, 0.08));
  }
  g.add(cuerpo);
  return g;
}
function estacionEgcUgc(g, { feeds: datos } = {}) {
  g.add(fondo(caja(13, 0.3, 7, C.marca.arena, 0, -0.3, -0.6, 0.1)));
  // Publicaciones de datos/feeds.json (si la presentación las pasa) o las de prueba de pantallas.js. `cada` (segundos
  // por publicación) también sale de ahí; el feed de UGC cambia a mitad de ciclo del de EGC, nunca a la vez.
  const cada = datos?.cada ?? 4;
  const feeds = [feed('egc', { publicaciones: datos?.egc, cada }), feed('ugc', { publicaciones: datos?.ugc, cada, desfase: -cada / 2 })];
  const anclas = {};
  [[-1, feeds[0], 'egc'], [1, feeds[1], 'ugc']].forEach(([lado, tex, clave]) => {
    const c = celular(tex);
    c.position.set(lado * 2.85, 0, -1.4);
    c.rotation.y = -lado * 0.32;
    g.add(c);
    const a = new THREE.Object3D();
    a.position.set(lado * 2.85, 0, -1.0);
    g.add(a);
    anclas[clave] = a;
  });
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.32 + LEVITA, 0.3);
  const ped = pedestal(P['pedestal-crema'], 0.9);
  ped.position.z = 0.3;
  g.add(ancla, ped);
  return {
    tema: 'crema', encuadre: 'centro', ancla, anclas, escala: 0.82,
    actualizar(dt, t, presencia) { for (const f of feeds) if (presencia > 0.3) f.avanzar(dt); else f.dormir(); },
    /** El presentador frena los dos feeds para comentar una publicación (tecla F). */
    pausarFeeds: (si) => feeds.map((f) => f.pausar(si))[0],
  };
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
function estacionViral(g, { feeds: datos } = {}) {
  g.add(pisoSombra());
  // Pared de celulares con la misma publicación, como cuando algo se hace viral. La prenda queda a la izquierda,
  // junto al texto, y la pared ocupa el resto: la tapa apenas en una esquina. El clip sale de datos/feeds.json (viral).
  const tex = publicacionViral({ archivo: datos?.viral?.archivo });
  const panel = new THREE.Group();
  const cols = 8, filas = 3, pw = 0.48, ph = 1.0, sx = 0.6, sy = 1.12;
  panel.add(caja(cols * sx + 0.24, (filas - 1) * sy + ph + 0.4, 0.14, C.marca.arena, 0, 0, -0.07, 0.07));
  const pantallas = [];
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
    const c = celular(tex, pw, ph, false);
    c.position.set((i - (cols - 1) / 2) * sx, 0.2 + j * sy, 0.08);
    panel.add(c);
    pantallas.push(c.position.clone());
  }
  panel.position.set(2.25, 0, -3.2);
  panel.rotation.y = -0.1;
  g.add(panel);
  // Corazones que brotan de los celulares (likes en vivo): suben un poco delante de su pantalla y se apagan. Nunca de
  // las dos primeras columnas, las que encuadra la pose de la remera: ahí taparían la frase.
  const geo = corazonGeo();
  const mat = clay(C.acento.rosa, { roughness: 0.8 });
  const libres = pantallas.filter((_, k) => k % cols > 1);
  const corazones = Array.from({ length: 14 }, (_, i) => {
    const m = malla(geo, mat);
    const origen = libres[(i * 7) % libres.length].clone().add(V(0, 0.3, 0.22)).applyAxisAngle(V(0, 1, 0), panel.rotation.y).add(panel.position);
    m.userData = { origen, fase: i / 14, s: 0.15 + (i % 3) * 0.03 };
    g.add(m);
    return m;
  });
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.3 + LEVITA, 0.3);
  const ped = pedestal(P['pedestal-crema'], 0.75, 0.3);
  ped.position.z = 0.3;
  g.add(ancla, ped);
  let reloj = 0;
  return {
    tema: 'crema', encuadre: 'editorial', ancla, escala: 0.72,
    // La prenda a ~57 % del ancho (no al 72 % de siempre), para dejarle lugar a la pared.
    mira: V(1.2, 1.6, 0),
    poses: {
      // La cámara se acerca de frente a la punta izquierda de la fila del medio hasta que se lee la remera (el mensaje
      // es la campaña); el texto queda sobre la pared lisa, a la izquierda de los celulares. Desvíos desde el encuadre
      // editorial: mira en (-0.55, 1.6, 0) y cámara en (-0.55, 2.2, 8.5).
      // La prenda se corre a la izquierda, fuera de cuadro: si no, queda delante de la cámara.
      remera: { mira: V(0.56, 0.3, -3.25), camara: V(1.06, -0.25, -9.25), heroe: V(-4, 0, 0) },
    },
    actualizar(dt, t, presencia) {
      // Contador de likes: arranca cuando llega la cámara y sube hasta pasar el medio millón.
      reloj = presencia > 0.95 ? reloj + dt : presencia < 0.05 ? 0 : reloj;
      const u = Math.min(reloj / 3.2, 1);
      tex.poner(500000 * (1 - (1 - u) ** 4) + Math.max(0, reloj - 3.2) * 37, t); // superó el medio millón en menos de 24 h
      if (presencia > 0.3) tex.avanzar(dt); else tex.dormir();
      const crecer = smoothstep(presencia, 0.3, 1);
      for (const m of corazones) {
        const d = m.userData;
        const v = (t / 2.6 + d.fase) % 1; // 0 → 1 mientras sube
        m.position.copy(d.origen).add(V(Math.sin((t + d.fase * 9) * 2) * 0.04, v * 0.6, 0));
        m.rotation.set(0, Math.sin(t + d.fase * 6) * 0.4, 0);
        m.scale.setScalar(d.s * crecer * Math.sin(Math.PI * v));
      }
    },
  };
}

function estacionExperiencial(g) {
  // Piso de madera, pared clara detrás del texto y pared de acento marrón (el tono de la tienda) detrás de la prenda.
  habitacion(g, { x0: -7, x1: 7, piso: P['casa-piso'], pared: C.juego['fachada-1'] });
  g.add(fondo(caja(8.6, 6, 0.32, P['casa-pared'], 2.7, -0.3, -4.24, 0.04)));
  g.add(fondo(caja(8.6, 0.16, 0.07, C.marca.crema, 2.7, 0, -4.045, 0.02))); // más alto y profundo que el de la pared clara: no comparten caras
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: neonNudeHouse(), transparent: true, toneMapped: false, depthWrite: false }));
  neon.position.set(0.9, 3.35, -4.06);
  g.add(fondo(neon));
  // Alfombra redonda bajo el perchero de la protagonista.
  const alfombra = cilindro(1.9, 0.03, C.marca.arena, 0, 0, 0.1, 96);
  alfombra.scale.z = 0.62;
  g.add(fondo(alfombra));

  // La protagonista cuelga de frente en un perchero de exhibición, girado como ella en reposo.
  const giro = 0.35, escala = 0.8, alto = 2.2, radioBarra = 0.035;
  const riel = crearRiel(2.6, alto, 0.03, radioBarra);
  riel.rotation.y = giro;
  g.add(riel);
  const pivote = new THREE.Object3D();
  pivote.position.set(0, alto, 0);
  const { grupo: percha, gancho } = crearPercha(radioBarra / escala, 'frente');
  percha.position.copy(gancho).negate();
  pivote.add(percha);
  pivote.rotation.y = giro;
  pivote.scale.setScalar(escala);
  g.add(pivote);
  const ancla = new THREE.Object3D();
  ancla.position.copy(pivote.position).addScaledVector(gancho.clone().applyAxisAngle(V(0, 1, 0), giro), -escala);
  g.add(ancla);

  // Perchero del fondo con sudaderas colgadas de costado, cada una en su percha.
  const giro2 = 0.35, alto2 = 2.0, escala2 = 0.55;
  const rack = crearRiel(2.0, alto2, 0, radioBarra);
  rack.position.set(2.5, 0, -3.0);
  rack.rotation.y = giro2;
  g.add(rack);
  const eje = V(Math.cos(giro2), 0, -Math.sin(giro2));
  [C.marca.arena, C.marca['cacao-suave'], C.marca.crema].forEach((color, i) => {
    const punto = rack.position.clone().add(V(0, alto2, 0)).addScaledVector(eje, -0.6 + i * 0.6);
    const s = crearSudadera(color);
    const { grupo: p, gancho: gk } = crearPercha(radioBarra / escala2, 'costado');
    s.grupo.add(p);
    s.grupo.scale.setScalar(escala2);
    s.grupo.rotation.y = giro2 + Math.PI / 2;
    s.grupo.position.copy(punto).addScaledVector(gk.clone().applyAxisAngle(V(0, 1, 0), giro2 + Math.PI / 2), -escala2);
    g.add(s.grupo);
  });
  // Estante con vinilos (la música de la casa) amurado a la pared de acento, con sus escuadras.
  const estante = new THREE.Group();
  estante.add(caja(2.0, 0.07, 0.42, C.marca.crema, 0, 0, 0, 0.02));
  for (const x of [-0.75, 0.75]) estante.add(caja(0.05, 0.3, 0.3, metal, x, -0.3, -0.06, 0.015));
  // Fundas de simples paradas de canto, apenas inclinadas, y una de frente apoyada en la pared.
  [C.acento.bosque, C.marca.cacao, C.acento.mostaza, C.marca['cacao-suave'], C.acento.rosa, C.marca.cacao].forEach((color, i) => {
    const funda = caja(0.025, 0.34, 0.34, color, -0.85 + i * 0.045, 0.07, 0.02, 0.008);
    funda.rotation.z = -0.05 - (i === 5 ? 0.18 : 0);
    estante.add(funda);
  });
  const portada = lienzo(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#103071'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2e1914'; ctx.beginPath(); ctx.arc(w * 0.62, h / 2, w * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe500'; ctx.beginPath(); ctx.arc(w * 0.62, h / 2, w * 0.1, 0, Math.PI * 2); ctx.fill();
  });
  const disco = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshStandardMaterial({ map: portada, roughness: 0.8 }));
  disco.position.set(-0.15, 0.07 + 0.2, -0.12);
  disco.rotation.x = -0.12;
  estante.add(disco);
  estante.add(caja(0.42, 0.14, 0.34, C.marca['cacao-suave'], 0.5, 0.07, 0, 0.03)); // tocadiscos
  estante.add(cilindro(0.13, 0.02, metal, 0.47, 0.21, 0, 48));
  estante.position.set(2.5, 2.75, -3.87);
  g.add(estante);
  // Planta en maceta en el rincón y lámpara de pie con luz cálida.
  const planta = new THREE.Group();
  planta.add(cilindro(0.32, 0.55, C.juego['fachada-3'], 0, 0, 0));
  for (const [x, y, z, r] of [[0, 0.95, 0, 0.45], [0.28, 1.35, 0.06, 0.32], [-0.22, 1.4, -0.08, 0.3]]) planta.add(malla(new THREE.SphereGeometry(r, 32, 20), clay(P['casa-planta']), x, y, z));
  planta.position.set(-2.4, 0, -3.3);
  g.add(planta);
  const lampara = new THREE.Group();
  lampara.add(pedestal(metal, 0.22, 0.05, 0.02), varilla(V(0, 0.04, 0), V(0, 2.3, 0), 0.025, metal));
  const pantalla = malla(new THREE.CylinderGeometry(0.22, 0.34, 0.4, 48, 1, true), clay(C.marca.crema, { side: THREE.DoubleSide, emissive: P.foco, emissiveIntensity: 0.35 }), 0, 2.45, 0);
  lampara.add(pantalla);
  lampara.position.set(-1.25, 0, -3.5);
  g.add(lampara);
  const luz = new THREE.PointLight(P.foco, 6, 6, 2);
  luz.position.set(-1.25, 2.4, -3.3);
  g.add(luz);
  return { tema: 'crema', encuadre: 'editorial', ancla, escala, calida: true, giroReposo: giro, percha: { pivote, gancho }, entradaFrontal: true, actualizar() {} };
}

function estacionMetricas(g) {
  g.add(pisoSombra());
  // Gráfico de pilas de sudaderas dobladas: cada una son 100 mil seguidores, comienzos de 2024 contra hoy (pose "pilas").
  const anclas = {};
  const redes = [['instagram', 8, 16], ['youtube', 5, 10], ['podcast', 1, 3]];
  const grosor = 0.1;
  redes.forEach(([red, antes, hoy], i) => {
    const x = 3.7 + i * 1.45, z = -0.4;
    [[antes, C.marca.piedra, -0.33], [hoy, C.acento.marino, 0.33]].forEach(([n, color, dx]) => {
      for (let k = 0; k < n; k++) {
        const d = caja(0.56, grosor - 0.004, 0.44, color, x + dx, k * grosor, z, 0.04);
        d.rotation.y = Math.sin(k * 3.1 + i) * 0.04;
        g.add(d);
      }
    });
    const a = new THREE.Object3D();
    a.position.set(x, 0, z + 0.3);
    g.add(a);
    anclas[`metricas-${red}`] = a;
  });
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.5, 0);
  g.add(ancla);
  const cima = V(3.7 + 0.33, 16 * grosor + LEVITA, -0.4);
  return {
    tema: 'crema', encuadre: 'editorial', ancla, escala: 0.78, desarmar: true, anclas,
    poses: {
      pilas: { mira: V(5.0, -0.38, 0), camara: V(5.0, 0.05, 0.8), heroe: cima.sub(ancla.position), escala: 0.38, desarmar: false },
    },
    actualizar() {},
  };
}

function estacionObjetivo(g) {
  g.add(pisoSombra());
  // Plano medio: la prenda levita sola, girada hacia la cita; el pie y el piso quedan fuera de cuadro.
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.48, 0);
  g.add(ancla);
  return { tema: 'crema', encuadre: 'macro', ancla, giroReposo: -0.5, macro: { mira: V(-0.95, 0.98, 0), distancia: 5.6 }, actualizar() {} };
}

function estacionDesafios(g) {
  g.add(pisoSombra());
  // Balanza: exclusividad (una sola sudadera) vs. accesibilidad (una pila).
  // Cada plato cuelga de un aro en la punta del brazo con tres hilos que se juntan arriba; los hilos quedan
  // siempre por fuera de lo que lleva el plato.
  const tono = C.marca.cacao;
  const alto = 3.3, medio = 1.45, largoHilo = 2.0, radioPlato = 0.8;
  g.add(pedestal(C.marca.arena, 0.65, 0.18, 0.06));
  g.add(varilla(V(0, 0.17, 0), V(0, alto, 0), 0.07, tono, 32));
  g.add(esfera(0.13, tono, 0, alto, 0));
  const brazo = new THREE.Group();
  brazo.position.set(0, alto, 0);
  brazo.add(varilla(V(-medio - 0.08, 0, 0), V(medio + 0.08, 0, 0), 0.05, tono, 24));
  const platos = [-medio, medio].map((x) => {
    const p = new THREE.Group();
    p.position.set(x, 0, 0);
    p.add(varilla(V(0, 0, 0), V(0, -0.12, 0), 0.014, tono, 8));
    const aro = malla(new THREE.TorusGeometry(0.045, 0.013, 8, 24), clay(tono), 0, -0.16, 0);
    p.add(aro);
    const arriba = V(0, -0.2, 0), yPlato = -0.2 - largoHilo;
    for (const a of [Math.PI / 6, Math.PI * 5 / 6, Math.PI * 1.5]) {
      p.add(varilla(arriba, V(Math.cos(a) * (radioPlato - 0.05), yPlato, Math.sin(a) * (radioPlato - 0.05)), 0.008, tono, 6));
    }
    const plato = pedestal(C.marca.arena, radioPlato, 0.07, 0.03);
    plato.position.y = yPlato - 0.07;
    const borde = malla(new THREE.TorusGeometry(radioPlato - 0.03, 0.025, 8, 64), clay(C.marca.arena), 0, yPlato, 0);
    borde.rotation.x = Math.PI / 2;
    p.add(plato, borde);
    brazo.add(p);
    return p;
  });
  // Pila de la accesibilidad: sudaderas dobladas, más angostas que el círculo que dejan libre los hilos.
  const yPlato = -0.2 - largoHilo;
  for (let k = 0; k < 6; k++) {
    const d = caja(0.5, 0.086, 0.4, [C.marca.piedra, C.marca.arena, C.marca['cacao-suave']][k % 3], 0, yPlato + k * 0.09, 0, 0.035);
    d.rotation.y = Math.sin(k * 2.3) * 0.08;
    platos[1].add(d);
  }
  g.add(brazo);
  const ancla = new THREE.Object3D();
  ancla.position.set(0, yPlato, 0);
  platos[0].add(ancla);
  const anclas = {};
  platos.forEach((p, i) => {
    const a = new THREE.Object3D();
    a.position.set(0, yPlato - 0.16, radioPlato * 0.3);
    p.add(a);
    anclas[i ? 'accesibilidad' : 'exclusividad'] = a;
  });
  let inclinacion = 0;
  return {
    tema: 'crema', encuadre: 'editorial', ancla, escala: 0.36, apoyada: true, balanceo: 0.3, anclas,
    entradaFrontal: true, // entra y sale del plato por delante, entre los hilos
    // La cámara encuadra la balanza entera, no el plato.
    mira: V(0, 1.75, 0), distancia: 9.6,
    /** valor de -1 (gana accesibilidad) a 1 (gana exclusividad): en la presentación sale de la votación. */
    valor: 0,
    actualizar(dt, t) {
      inclinacion = damp(inclinacion, this.valor * 0.14 + Math.sin(t * 0.8) * 0.008, 2, dt);
      brazo.rotation.z = inclinacion;
      for (const p of platos) p.rotation.z = -inclinacion; // los platos cuelgan derechos
    },
  };
}

function estacionDropRush(g) {
  // La calle y la vidriera de la tienda, de noche: transición al juego.
  g.add(fondo(caja(18, 0.2, 7, C.juego.asfalto, 0, -0.4, 4.6, 0.05)));
  g.add(fondo(caja(18, 0.4, 3.2, C.juego.vereda, 0, -0.4, 0.4, 0.06)));
  const tienda = C.juego.tienda;
  const fachada = new THREE.Group();
  // El zócalo de la vidriera sobresale 10 cm del piso interior, y cada pieza termina donde empieza la otra:
  // dos caras a la misma altura que se pisan titilan (z-fighting).
  fachada.add(caja(1.0, 4.8, 0.5, tienda, -2.7, 0, -1.1, 0.05), caja(1.0, 4.8, 0.5, tienda, 2.7, 0, -1.1, 0.05),
    caja(6.4, 1.2, 0.5, tienda, 0, 3.6, -1.1, 0.05), caja(4.4, 0.5, 0.5, tienda, 0, 0, -1.1, 0.05));
  // Paredes vecinas, más oscuras, para que la vidriera sea la única luz de la calle.
  fachada.add(caja(5, 6, 0.4, C.marca['cacao-profundo'], -5.7, 0, -1.3, 0.04), caja(5, 6, 0.4, C.marca['cacao-profundo'], 5.7, 0, -1.3, 0.04));
  // Interior de la vidriera: fondo cálido iluminado.
  fachada.add(caja(4.6, 3.4, 0.2, C.juego['fachada-1'], 0, 0.2, -3.0, 0.03), caja(4.2, 0.2, 1.55, C.marca.arena, 0, 0.2, -2.125, 0.03));
  fachada.add(caja(0.2, 3.4, 1.55, C.marca.arena, -2.2, 0.2, -2.125, 0.03), caja(0.2, 3.4, 1.55, C.marca.arena, 2.2, 0.2, -2.125, 0.03));
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.78), new THREE.MeshBasicMaterial({ toneMapped: false, map: cartelTienda() }));
  cartel.position.set(0, 4.2, -0.84);
  fachada.add(cartel);
  g.add(fondo(fachada));
  // Vidrio con un reflejo diagonal suave.
  const reflejo = lienzo(256, 256, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0.25, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,.22)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.05)'); gr.addColorStop(0.62, 'rgba(255,255,255,.14)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)');
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  });
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.1), new THREE.MeshBasicMaterial({ map: reflejo, transparent: true, depthWrite: false, opacity: 0.55 }));
  vidrio.position.set(0, 2.05, -0.9);
  vidrio.renderOrder = 3;
  g.add(fondo(vidrio));
  const ped = pedestal(P['pedestal-cacao'], 0.7, 0.28);
  ped.position.set(0, 0.4, -2.15); // a 10 cm del zócalo y de la pared del fondo
  g.add(ped);
  const ancla = new THREE.Object3D();
  ancla.position.set(0, 0.68 + LEVITA, -2.15);
  g.add(ancla);
  const f = foco(g, 0, 3.5, -2.15, 2.9, 1.0);
  const interior = new THREE.PointLight(P['luz-principal'], 6, 6, 2);
  interior.position.set(0, 2.6, -0.6);
  g.add(interior);
  return {
    tema: 'cacao', encuadre: 'editorial', ancla, escala: 0.82,
    mira: V(0, 2.25, -1.4), distancia: 11,
    actualizar(dt, t, presencia) {
      f.motas.userData.mover(t);
      f.encender(1, 0.2 * presencia);
    },
  };
}

const constructores = {
  portada: estacionPortada, historia: estacionHistoria, 'egc-ugc': estacionEgcUgc, viral: estacionViral,
  experiencial: estacionExperiencial, metricas: estacionMetricas, objetivo: estacionObjetivo,
  desafios: estacionDesafios, 'drop-rush': estacionDropRush,
};

/** Arma todas las estaciones del recorrido, en el orden de tokens.escena.recorrido. */
export function crearMundo(escena, opciones = {}) {
  const { separacion, estaciones } = esc.recorrido;
  return estaciones.map((nombre, i) => {
    const grupo = new THREE.Group();
    grupo.name = nombre;
    grupo.position.x = i * separacion;
    const e = constructores[nombre](grupo, opciones);
    escena.add(grupo);
    return { nombre, indice: i, grupo, escala: 1, anclas: {}, poses: {}, ...e };
  });
}
