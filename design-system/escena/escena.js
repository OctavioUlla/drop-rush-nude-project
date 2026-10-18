// Motor del plano secuencia: renderer, luz de cine, la sudadera protagonista y el viaje de cámara entre estaciones.
// iniciar({ lienzo, escenario, eventos, escalaMaxima }) → { ir, siguiente, anterior, actual, total, proyectar, arrancar, estaciones }
// escalaMaxima: tope de la resolución interna (por defecto tokens.escena.render['escala-maxima']); bajarlo si la notebook no llega a 60 fps.
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

export function iniciar({ lienzo, escenario, eventos = {}, escalaMaxima = esc.render['escala-maxima'] }) {
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
    const k = e.escala ?? 1;
    const d = e.distancia ?? distancia;
    if (e.encuadre === 'editorial') { // la sudadera a la derecha, el texto en los 5/12 de la izquierda
      const centro = e.mira ? e.mira.clone().add(e.grupo.position) : new THREE.Vector3(a.x, Math.max(1.15, a.y + 1.1 * k), a.z);
      e.mira = centro.clone().add(new THREE.Vector3(-1.75 * (d / distancia), 0, 0));
      e.camara = e.mira.clone().add(new THREE.Vector3(0, altura - 1.1, d));
    } else if (e.encuadre === 'macro') { // el logo bordado a la derecha; la cita, en la columna libre
      const { mira = new THREE.Vector3(-0.85, 1.35, 0), distancia: dm = 3.3 } = e.macro ?? {};
      e.mira = a.clone().add(mira);
      e.camara = e.mira.clone().add(new THREE.Vector3(0.05, 0.05, dm));
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
  const lambdaPose = 3 / (segundos('escena') * 1.4); // las poses se acomodan en ~1 s: la prenda viaja más que en un cambio de texto
  let actual = 0;
  let viaje = null; // { desde, hasta, t, d, entro, giro0 }
  let posicion = 0; // índice continuo: 1.5 = a mitad de camino entre la estación 1 y la 2
  let intro = reducido ? 1 : 0;
  let alturaCaida = 7;
  let arrancado = false;
  let giro = 0;
  let desarme = 0;
  let flota = 1; // 1 = flota, 0 = apoyada o colgada (se funde para no saltar)
  let tiempo = 0;
  const puntero = new THREE.Vector2();
  const paralaje = new THREE.Vector2();
  // Pose dentro de la estación (diapositivas con data-pose): desvíos que se acomodan con suavidad.
  let pose = null;
  const desvio = { camara: new THREE.Vector3(), mira: new THREE.Vector3(), heroe: new THREE.Vector3() };
  let factorEscala = 1;
  // Coreografía del hype en la portada.
  const hype = { fase: 'reposo', nivel: 0 };
  let luzHype = 1, subida = 0;
  const portada = estaciones.find((e) => e.nombre === 'portada');

  let pendiente = null; // si se pide otra estación durante un viaje, se encola (la cámara nunca salta)
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
  const colgada = new THREE.Vector3(), cero = new THREE.Vector3();
  const colorA = new THREE.Color(), colorB = new THREE.Color(), fondo = new THREE.Color();
  const { producto } = esc;
  const periodo = Number.parseFloat(producto['flotar-periodo']);
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

    // Pose: desvíos de cámara, mira y protagonista de la estación de destino.
    const p = estaciones[actual].poses[pose] ?? null;
    amortiguar(desvio.camara, p?.camara ?? cero, lambdaPose, dt);
    amortiguar(desvio.mira, p?.mira ?? cero, lambdaPose, dt);
    amortiguar(desvio.heroe, p?.heroe ?? cero, lambdaPose, dt);
    factorEscala = damp(factorEscala, p?.escala ? p.escala / estaciones[actual].escala : 1, lambdaPose, dt);

    // Cámara: travelling con grúa (sube y retrocede a mitad de camino), más una respiración y paralaje del puntero.
    m1.copy(ea.mira).lerp(eb.mira, s).add(desvio.mira);
    c1.copy(ea.camara).lerp(eb.camara, s).add(desvio.camara);
    c1.y += arco * esc.camara['elevacion-viaje'];
    c1.z += arco * esc.camara['retroceso-viaje'];
    paralaje.x = damp(paralaje.x, puntero.x * esc.camara.paralaje, 3, dt);
    paralaje.y = damp(paralaje.y, puntero.y * esc.camara.paralaje * 0.5, 3, dt);
    const factorMacro = ea.encuadre === 'macro' || eb.encuadre === 'macro' ? 0.25 : 1;
    camara.position.set(c1.x + paralaje.x * factorMacro + Math.sin(t * 0.21) * 0.06, c1.y + paralaje.y * factorMacro + Math.sin(t * 0.17) * 0.04, c1.z);
    camara.lookAt(m1);

    // Hype de la portada: la luz se apaga en la cuenta regresiva y vuelve con el medidor; la protagonista sube
    // fuera de cuadro y baja en proporción al hype.
    const enPortada = actual === portada.indice && !viaje;
    const enHype = enPortada && (hype.fase === 'cuenta' || hype.fase === 'llenando');
    const luzObjetivo = !enHype ? 1 : hype.fase === 'cuenta' ? 0.1 : 0.1 + 0.9 * hype.nivel;
    const subidaObjetivo = !enHype ? 0 : hype.fase === 'cuenta' ? 6.5 : 0.6 + 5.9 * (1 - smoothstep(hype.nivel, 0.1, 0.95)) ** 2;
    luzHype = damp(luzHype, luzObjetivo, hype.fase === 'cuenta' ? 2.5 : 4, dt);
    subida = damp(subida, subidaObjetivo, hype.fase === 'cuenta' ? 1.6 : 2.4, dt);
    portada.luz(luzHype);
    const tenue = 0.25 + 0.75 * luzHype;
    principal.intensity = esc.luz.principal * tenue;
    hemi.intensity = esc.luz.ambiente * tenue;
    contorno.intensity = esc.luz.contorno * tenue;

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
    // Si sale de una percha o de un plato (o entra), primero se adelanta y recién después se corre de costado:
    // así no atraviesa la barra ni los hilos.
    ea.ancla.getWorldPosition(c2);
    eb.ancla.getWorldPosition(m2);
    const margenA = viaje && ea.entradaFrontal ? 0.16 : 0, margenB = viaje && eb.entradaFrontal ? 0.16 : 0;
    const lateral = clamp((s - margenA) / (1 - margenA - margenB), 0, 1);
    c2.lerp(m2, lateral).add(desvio.heroe);
    c2.y += arco * 1.4;
    if (margenA || margenB) c2.z += arco * 1.6;
    const caida = arrancado ? (reducido ? 1 : rebote(Math.min(intro += dt / 1.1, 1))) : 0;
    const cuelga = llegada.encuadre !== 'macro' && llegada.percha && !p?.heroe;
    flota = damp(flota, llegada.apoyada || cuelga ? 0 : 1, 6, dt);
    const flotar = Math.sin((t / periodo) * Math.PI * 2) * producto['flotar-amplitud'] * flota;
    c2.y += flotar + (1 - caida) * alturaCaida + subida;
    const escala = lerp(ea.escala, eb.escala, s) * factorEscala;
    heroe.grupo.scale.setScalar(escala);

    const quieta = !viaje && (llegada.encuadre === 'macro' || llegada.calida);
    // En reposo la prenda se balancea mostrando el frente y los tres cuartos (nunca queda de espaldas);
    // en el viaje da una vuelta completa y frena en el frente de la estación siguiente.
    const vuelta = Math.round(giro / (Math.PI * 2)) * Math.PI * 2;
    if (viaje) giro = viaje.giro0 + Math.PI * 2 * producto['vueltas-viaje'] * s;
    else if (quieta) giro = damp(giro, vuelta + (llegada.giroReposo ?? (llegada.calida ? 0.35 : -0.25)), 2.5, dt);
    else if (llegada.nombre === 'egc-ugc') giro = damp(giro, vuelta + Math.sin(t * 0.5) * 0.9, 2, dt);
    else giro = damp(giro, vuelta + Math.sin(t * producto['balanceo-velocidad']) * (llegada.balanceo ?? producto['balanceo-amplitud']), 1.5, dt);
    const vaiven = cuelga && !viaje ? Math.sin(t * 0.9) * 0.025 : 0;
    heroe.grupo.rotation.set(arco * 0.25, giro, cuelga ? vaiven : arco * -0.15);

    // Colgada: oscila desde la barra, no desde el pie. La percha (de la estación) se mueve igual que ella.
    if (cuelga) {
      const { pivote, gancho } = llegada.percha;
      pivote.rotation.set(0, llegada.giroReposo ?? 0, vaiven);
      pivote.getWorldPosition(colgada);
      colgada.addScaledVector(v.copy(gancho).applyEuler(heroe.grupo.rotation), -escala);
      c2.lerp(colgada, 1 - arco);
    }
    heroe.grupo.position.copy(c2);

    colorA.setHex(ea.colorway.color3d);
    colorB.setHex(eb.colorway.color3d);
    heroe.ponerColor(mezclarSrgb(colorA, colorA, colorB, smoothstep(s, 0.3, 0.7)));

    desarme = damp(desarme, !viaje && estaciones[actual].desarmar && (p?.desarmar ?? true) ? 1 : 0, 3, dt);
    heroe.desarmar(desarme);

    for (const e of estaciones) {
      const presencia = clamp(1 - Math.abs(posicion - e.indice), 0, 1);
      e.grupo.visible = Math.abs(posicion - e.indice) < 1.6;
      if (e.grupo.visible) e.actualizar(dt, t, presencia);
    }
  }
  const render = () => renderer.render(escena, camara);

  // ---------- Tamaño, puntero y arranque ----------
  function medir() {
    const { width, height } = escenario.getBoundingClientRect();
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

  // Compila los shaders antes de mostrar nada, así el primer viaje no se traba.
  renderer.compile(escena, camara);
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
   * Posición en pantalla (en %) de una pieza de la protagonista (capucha, mangaDerecha, bolsillo…) o de un ancla
   * de la estación actual, para las etiquetas flotantes. punto: [x, y, z] de -1 a 1 dentro de la caja de la pieza
   * (por ejemplo [0, 1, 0] = arriba al centro); en las anclas, un desplazamiento en metros.
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
    ir, estaciones,
    siguiente: () => ir((pendiente?.i ?? actual) + 1),
    anterior: () => ir((pendiente?.i ?? actual) - 1),
    get actual() { return actual; },
    get viajando() { return Boolean(viaje); },
    total: estaciones.length,
    proyectar,
    /** Cambia de pose sin salir de la estación (la cámara solo se acomoda). */
    pose(nombre) { if (!viaje) pose = nombre; else if (pendiente) pendiente.pose = nombre; else pendiente = { i: actual, pose: nombre }; },
    /**
     * Coreografía del hype en la portada: fase 'cuenta' (la luz se apaga y la sudadera sube fuera de cuadro),
     * 'llenando' con nivel de 0 a 1 (la luz vuelve y la sudadera baja), 'drop' (cae al pedestal entre papelitos)
     * y 'reposo'.
     */
    hype(fase, nivel = hype.nivel) {
      if (fase === 'drop') {
        alturaCaida = subida; subida = 0; intro = reducido ? 1 : 0;
        portada.lanzarPapelitos();
        Object.assign(hype, { fase: 'reposo', nivel: 1 });
      } else Object.assign(hype, { fase, nivel: clamp(nivel, 0, 1) });
    },
    /** Suelta la sudadera sobre el pedestal (después del cargador). */
    arrancar() { arrancado = true; },
    /** Saltar sin viaje (al cargar con #n en la URL). */
    saltar(i, nombrePose = null) { actual = clamp(i, 0, estaciones.length - 1); viaje = null; pose = nombrePose; },
    /** Avanza la animación sin esperar y dibuja (renders de respaldo y pruebas: la escena queda asentada). */
    adelantar(segundosAdelante) {
      for (let k = 0; k < segundosAdelante * 60; k++) actualizar(1 / 60);
      render();
    },
    /** Para herramientas (medidor, control de solapes, renders): no se usan en la presentación. */
    depuracion: { renderer, escena, camara, heroe, render, pausar: (si) => { ultimo = null; renderer.setAnimationLoop(si ? null : bucle); } },
  };
}
