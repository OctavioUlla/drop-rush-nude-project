// Motor del plano secuencia: renderer, luz de cine, la sudadera protagonista y el viaje de cámara entre estaciones.
// iniciar({ lienzo, escenario, eventos }) → { ir, siguiente, anterior, actual, total, proyectar, arrancar, estaciones }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tokens, colores3d, colorways, segundos } from '../tokens.js';
import { crearSudadera } from './sudadera.js';
import { crearMundo } from './mundo.js';

const esc = tokens.escena;
const P = colores3d.presentacion;
const { damp, clamp, lerp, smoothstep } = THREE.MathUtils;

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
/** Mezcla dos colores en sRGB: entre cacao y crema pasa por un tostado cálido, no por gris. */
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

export function iniciar({ lienzo, escenario, eventos = {} }) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = esc.luz.exposicion;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = esc.luz.entorno;
  escena.fog = new THREE.Fog(P['estudio-crema-fondo'], esc.niebla.cerca, esc.niebla.lejos);

  const camara = new THREE.PerspectiveCamera(esc.camara.campo, 16 / 9, 0.1, 120);

  // ---------- Luz de estudio cálida (tonos Nude House) ----------
  const hemi = new THREE.HemisphereLight(P['luz-ambiente'], P['casa-piso'], esc.luz.ambiente);
  const principal = new THREE.DirectionalLight(P['luz-principal'], esc.luz.principal);
  principal.castShadow = true;
  const s = esc.sombra;
  Object.assign(principal.shadow.camera, { left: -s.area, right: s.area, top: s.area, bottom: -s.area, near: 1, far: 30 });
  principal.shadow.mapSize.setScalar(s.mapa);
  principal.shadow.radius = s.radio;
  principal.shadow.blurSamples = 16;
  principal.shadow.bias = -0.0004;
  const relleno = new THREE.DirectionalLight(P['luz-relleno'], esc.luz.relleno);
  const contorno = new THREE.DirectionalLight(P['luz-contorno'], esc.luz.contorno);
  escena.add(hemi, principal, principal.target, relleno, relleno.target, contorno, contorno.target);

  // ---------- Mundo y protagonista ----------
  const estaciones = crearMundo(escena);
  const heroe = crearSudadera(colorways[0].color3d);
  escena.add(heroe.grupo);
  escena.updateMatrixWorld(true);

  // Pose de cámara de cada estación, calculada una vez desde su ancla.
  const { distancia, altura } = esc.camara;
  for (const e of estaciones) {
    const a = e.ancla.getWorldPosition(new THREE.Vector3());
    e.puntoAncla = a;
    const k = e.escala ?? 1;
    const d = e.distancia ?? distancia;
    if (e.encuadre === 'editorial') { // la sudadera a la derecha, el texto en los 5/12 de la izquierda
      const centro = e.mira ? e.mira.clone().add(e.grupo.position) : new THREE.Vector3(a.x, Math.max(1.15, a.y + 1.1 * k), a.z);
      e.mira = centro.clone().add(new THREE.Vector3(-1.75 * (d / distancia), 0, 0));
      e.camara = e.mira.clone().add(new THREE.Vector3(0, altura - 1.1, d));
    } else if (e.encuadre === 'macro') { // el logo bordado a la derecha; la cita, en la columna libre
      e.mira = new THREE.Vector3(a.x - 0.85, a.y + 1.35, a.z);
      e.camara = e.mira.clone().add(new THREE.Vector3(0.05, 0.05, 3.3));
    } else {
      e.mira = new THREE.Vector3(a.x, a.y + 1.15, a.z);
      e.camara = e.mira.clone().add(new THREE.Vector3(0, altura - 0.95, d * (e.nombre === 'portada' ? 1.12 : 1)));
    }
    e.colorway = colorways.find((c) => c.escena === e.nombre) ?? colorways[0];
    e.fondo = new THREE.Color(e.tema === 'cacao' ? P['estudio-cacao-fondo'] : P['estudio-crema-fondo']);
  }

  // ---------- Estado del viaje ----------
  const facil = curva(tokens.movimiento['curva-viaje']);
  const dur = segundos('viaje');
  let actual = 0;
  let viaje = null; // { desde, hasta, t, d, entro }
  let posicion = 0; // índice continuo: 1.5 = a mitad de camino entre la estación 1 y la 2
  let intro = reducido ? 1 : 0;
  let arrancado = false;
  let giro = 0;
  let desarme = 0;
  const puntero = new THREE.Vector2();
  const paralaje = new THREE.Vector2();

  let pendiente = null; // si se pide otra estación durante un viaje, se encola (la cámara nunca salta)
  function ir(i) {
    i = clamp(i, 0, estaciones.length - 1);
    if (viaje) { pendiente = i === viaje.hasta ? null : i; return; }
    if (i === actual) return;
    eventos.salir?.(actual, i);
    const saltos = Math.abs(i - actual);
    viaje = { desde: actual, hasta: i, t: 0, d: reducido ? 0.001 : dur * Math.min(1 + 0.18 * (saltos - 1), 1.7), entro: false, giro0: giro };
    actual = i;
  }

  // ---------- Cuadro a cuadro ----------
  const v = new THREE.Vector3(), m1 = new THREE.Vector3(), m2 = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3();
  const colorA = new THREE.Color(), colorB = new THREE.Color(), fondo = new THREE.Color();
  const reloj = new THREE.Clock();
  const { producto } = esc;
  const periodo = Number.parseFloat(producto['flotar-periodo']);

  function cuadro() {
    const dt = Math.min(reloj.getDelta(), 1 / 20);
    const t = reloj.elapsedTime;
    let s = 0, a = actual, b = actual;
    if (viaje) {
      viaje.t += dt / viaje.d;
      s = facil(Math.min(viaje.t, 1));
      a = viaje.desde; b = viaje.hasta;
      if (!viaje.entro && s > 0.55) { viaje.entro = true; eventos.entrar?.(b); }
      if (viaje.t >= 1) {
        viaje = null; s = 0; a = b = actual;
        eventos.llegar?.(actual);
        if (pendiente !== null) { const p = pendiente; pendiente = null; ir(p); }
      }
    }
    const ea = estaciones[a], eb = estaciones[b];
    posicion = lerp(a, b, s);
    const arco = Math.sin(Math.PI * s); // 0 en las puntas, 1 a mitad del viaje

    // Cámara: travelling con grúa (sube y retrocede a mitad de camino), más una respiración y paralaje del puntero.
    m1.copy(ea.mira).lerp(eb.mira, s);
    c1.copy(ea.camara).lerp(eb.camara, s);
    c1.y += arco * esc.camara['elevacion-viaje'];
    c1.z += arco * esc.camara['retroceso-viaje'];
    paralaje.x = damp(paralaje.x, puntero.x * esc.camara.paralaje, 3, dt);
    paralaje.y = damp(paralaje.y, puntero.y * esc.camara.paralaje * 0.5, 3, dt);
    const factorMacro = ea.encuadre === 'macro' || eb.encuadre === 'macro' ? 0.25 : 1;
    camara.position.set(c1.x + paralaje.x * factorMacro + Math.sin(t * 0.21) * 0.06, c1.y + paralaje.y * factorMacro + Math.sin(t * 0.17) * 0.04, c1.z);
    camara.lookAt(m1);

    // Luz principal y su sombra acompañan a la cámara.
    v.copy(m1); v.y = 0;
    principal.target.position.copy(v);
    principal.position.copy(v).add(m2.set(-4, 8, 5));
    relleno.target.position.copy(v);
    relleno.position.copy(v).add(m2.set(6, 3, 6));
    contorno.target.position.copy(v);
    contorno.position.copy(v).add(m2.set(2, 5, -7));

    // Fondo y niebla: crema o cacao según la estación (el CSS pinta detrás del canvas transparente).
    mezclarSrgb(fondo, ea.fondo, eb.fondo, s);
    escena.fog.color.copy(fondo);
    escenario.style.setProperty('--fondo-escena', `#${fondo.getHexString()}`);

    // Protagonista: viaja de ancla en ancla con un arco, acelera el giro y cambia de colorway con un fundido.
    c2.copy(ea.puntoAncla);
    ea.ancla.getWorldPosition(c2);
    eb.ancla.getWorldPosition(m2);
    c2.lerp(m2, s);
    c2.y += arco * 1.4;
    const caida = arrancado ? (reducido ? 1 : rebote(Math.min(intro += dt / 1.1, 1))) : 0;
    const flotar = Math.sin((t / periodo) * Math.PI * 2) * producto['flotar-amplitud'];
    const cuelga = eb.encuadre !== 'macro' && (s > 0.5 ? eb : ea).calida;
    heroe.grupo.position.set(c2.x, c2.y + (cuelga ? 0 : flotar) + (1 - caida) * 7, c2.z);
    heroe.grupo.scale.setScalar(lerp(ea.escala ?? 1, eb.escala ?? 1, s));

    const llegada = s > 0.5 ? eb : ea;
    const quieta = !viaje && (llegada.encuadre === 'macro' || llegada.calida);
    // En reposo la prenda se balancea mostrando el frente y los tres cuartos (nunca queda de espaldas);
    // en el viaje da una vuelta completa y frena en el frente de la estación siguiente.
    const vuelta = Math.round(giro / (Math.PI * 2)) * Math.PI * 2;
    if (viaje) giro = viaje.giro0 + Math.PI * 2 * producto['vueltas-viaje'] * s;
    else if (quieta) giro = damp(giro, vuelta + (llegada.calida ? 0.35 : -0.25), 2.5, dt);
    else if (llegada.nombre === 'egc-ugc') giro = damp(giro, vuelta + Math.sin(t * 0.5) * 0.9, 2, dt);
    else giro = damp(giro, vuelta + Math.sin(t * producto['balanceo-velocidad']) * producto['balanceo-amplitud'], 1.5, dt);
    heroe.grupo.rotation.set(arco * 0.25, giro, cuelga && !viaje ? Math.sin(t * 0.9) * 0.025 : arco * -0.15);

    colorA.setHex(ea.colorway.color3d);
    colorB.setHex(eb.colorway.color3d);
    heroe.ponerColor(mezclarSrgb(colorA, colorA, colorB, smoothstep(s, 0.3, 0.7)));

    desarme = damp(desarme, !viaje && estaciones[actual].desarmar ? 1 : 0, 3, dt);
    heroe.desarmar(desarme);

    for (const e of estaciones) {
      const presencia = clamp(1 - Math.abs(posicion - e.indice), 0, 1);
      e.grupo.visible = Math.abs(posicion - e.indice) < 1.6;
      if (e.grupo.visible) e.actualizar(dt, t, presencia);
    }

    renderer.render(escena, camara);
  }

  // ---------- Tamaño, puntero y arranque ----------
  function medir() {
    const { width, height } = escenario.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(devicePixelRatio, esc.render['escala-maxima']));
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

  // Compila los shaders antes de mostrar nada, así el primer viaje no se traba.
  renderer.compile(escena, camara);
  renderer.setAnimationLoop(cuadro);

  /** Posición en pantalla (en %) de una pieza de la protagonista, para las etiquetas flotantes. */
  function proyectar(pieza, desplazamiento = [0, 0, 0]) {
    const g = heroe.piezas[pieza];
    const caja = new THREE.Box3().setFromObject(g);
    caja.getCenter(v);
    v.x += desplazamiento[0]; v.y += desplazamiento[1]; v.z += desplazamiento[2];
    v.project(camara);
    return { x: (v.x * 0.5 + 0.5) * 100, y: (-v.y * 0.5 + 0.5) * 100 };
  }

  return {
    ir, estaciones,
    siguiente: () => ir((pendiente ?? actual) + 1),
    anterior: () => ir((pendiente ?? actual) - 1),
    get actual() { return actual; },
    get viajando() { return Boolean(viaje); },
    total: estaciones.length,
    proyectar,
    /** Suelta la sudadera sobre el pedestal (después del cargador). */
    arrancar() { arrancado = true; },
    /** Saltar sin viaje (al cargar con #n en la URL). */
    saltar(i) { actual = clamp(i, 0, estaciones.length - 1); viaje = null; },
  };
}
