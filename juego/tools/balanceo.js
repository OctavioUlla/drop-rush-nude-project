import { parseArgs } from 'node:util';
import { esPrincipal } from '../server/principal.js';
import { CONFIG_POR_DEFECTO } from '../server/config.js';
import { Corredor } from '../public/play/runner.js';
import { Pista } from '../public/play/track.js';
import { PASOS_POR_SEGUNDO, VELOCIDAD_BASE, VELOCIDAD_MAX, ACELERACION, VALOR_LIKE } from '../public/shared/constantes.js';
import { TURBO, IMPULSO_EMPAREJAR, DURACION_ALGORITMO } from '../public/shared/poderes.js';

// Balanceo (sección 7): comprueba con la simulación real del corredor (runner.js + track.js) que
// saber del caso pese más que esquivar. Corre muchos tramos con dos jugadores extremos:
//   - "perfecto": nunca choca;
//   - "torpe": se queda en el carril del medio y no salta nunca (choca con todo lo que aparece ahí).
// La diferencia entre los dos es lo máximo que se puede perder por no saber esquivar.
//
//   npm run balanceo                       (8 preguntas, dificultad fácil)
//   npm run balanceo -- --dificultad normal --semillas 400

const PASO = 1 / PASOS_POR_SEGUNDO;

/** Un tramo de `segundos` que empieza con `previos` segundos de carrera encima (la velocidad sube con el tiempo). */
function correrTramo({ semilla, dificultad, segundos, previos, torpe, extra = false }) {
  const c = new Corredor();
  c.corriendo = true;
  c.tiempoCarrera = previos;
  c.velocidad = Math.min(VELOCIDAD_MAX, VELOCIDAD_BASE + ACELERACION * previos);
  const pista = new Pista();
  // Igual que play.js: la calle del tramo arranca 30 m adelante y termina 15 m antes del final.
  const largo = VELOCIDAD_BASE * segundos;
  pista.agregarTramo(semilla, 30, Math.max(40, largo - 15), dificultad);
  // Cambio de algoritmo de otro grupo: obstáculos extra durante 5 s desde el principio del tramo.
  const disponibles = likesAlcanzables(pista.likes);
  if (extra) pista.agregarExtra(semilla + 1, 22, 22 + c.velocidad * (DURACION_ALGORITMO / 1000));
  for (let i = 0; i < segundos * PASOS_POR_SEGUNDO; i++) {
    c.paso(PASO, torpe ? pista : null);
    pista.limpiar(c.distancia, PASO);
    c.eventos.length = 0;
  }
  return { distancia: c.distancia, choques: c.choques, likes: c.likes, disponibles };
}

/**
 * Cuántos likes de la calle puede juntar como mucho un corredor: no se pueden tomar todos, porque en cada
 * fila hay likes en más de un carril (la fila en un carril libre y el arco sobre un obstáculo bajo).
 * Se agrupan por fila (están a más de 4 m de la siguiente) y en cada una cuenta el carril con más likes.
 */
export function likesAlcanzables(likes) {
  const orden = [...likes].sort((a, b) => a.z - b.z);
  let total = 0;
  let fila = [];
  const cerrar = () => {
    const porCarril = [0, 0, 0];
    for (const l of fila) porCarril[l.carril]++;
    total += Math.max(...porCarril);
    fila = [];
  };
  for (const l of orden) {
    if (fila.length && l.z - fila.at(-1).z > 4) cerrar();
    fila.push(l);
  }
  if (fila.length) cerrar();
  return total;
}

const promedio = (lista) => lista.reduce((s, x) => s + x, 0) / lista.length;

/**
 * Mide el balance de una partida con la configuración dada. Devuelve metros (redondeados a 0,1).
 * `semillas`: cuántas calles distintas se prueban por tramo.
 */
export function medirBalance({ config = CONFIG_POR_DEFECTO, dificultad = config.dificultadObstaculos, semillas = 200 } = {}) {
  const n = config.cantidadPreguntas;
  const tramo = config.duracionTramo;
  const ciclo = tramo + config.tiempoPorDefecto; // las preguntas también se corren (sin obstáculos)
  const tramos = [];
  for (let i = 0; i <= n; i++) {
    const sprint = i === n;
    const segundos = sprint ? config.duracionSprint : tramo;
    const previos = i * ciclo;
    const perdidas = [];
    const choques = [];
    const likes = [];
    const disponibles = [];
    let perfecto = 0;
    for (let s = 0; s < semillas; s++) {
      const semilla = 1000 + s * 7919 + i * 104729;
      const p = correrTramo({ semilla, dificultad, segundos, previos, torpe: false });
      const t = correrTramo({ semilla, dificultad, segundos, previos, torpe: true });
      perfecto = p.distancia;
      perdidas.push(p.distancia - t.distancia);
      choques.push(t.choques);
      likes.push(t.likes);
      disponibles.push(t.disponibles);
    }
    tramos.push({
      sprint, perfecto, perdida: promedio(perdidas), peorPerdida: Math.max(...perdidas), choques: promedio(choques),
      likes: promedio(likes), disponibles: promedio(disponibles),
    });
  }

  const perdidaCarrera = tramos.reduce((s, t) => s + t.perdida, 0);
  const choquesCarrera = tramos.reduce((s, t) => s + t.choques, 0);
  const tramoMasLargo = Math.max(...tramos.filter((t) => !t.sprint).map((t) => t.perfecto));
  const acierto = { minimo: config.bonusAcierto, maximo: config.bonusAcierto + config.bonusRapidezMax };

  // Cambio de algoritmo: lo que pierde de más un grupo torpe en el tramo en que lo recibe.
  const algoritmo = [];
  for (let s = 0; s < semillas; s++) {
    const base = { semilla: 5000 + s * 31, dificultad, segundos: tramo, previos: ciclo * 2, torpe: true };
    algoritmo.push(correrTramo(base).distancia - correrTramo({ ...base, extra: true }).distancia);
  }

  const r = (x) => Math.round(x * 10) / 10;
  return {
    dificultad,
    preguntas: n,
    tramoPrimero: r(tramos[0].perfecto),
    tramoMasLargo: r(tramoMasLargo),
    acierto,
    perdidaPorTramo: r(promedio(tramos.filter((t) => !t.sprint).map((t) => t.perdida))),
    peorPerdidaTramo: r(Math.max(...tramos.map((t) => t.peorPerdida))),
    choquesPorTramo: r(promedio(tramos.filter((t) => !t.sprint).map((t) => t.choques))),
    costoPorChoque: r(perdidaCarrera / choquesCarrera),
    perdidaCarrera: r(perdidaCarrera),
    likesCarrera: r(tramos.reduce((s, t) => s + t.likes, 0) * VALOR_LIKE),
    likesAlcanzables: Math.round(tramos.reduce((s, t) => s + t.disponibles, 0)),
    likesMaximo: r(tramos.reduce((s, t) => s + t.disponibles, 0) * VALOR_LIKE),
    // Ventajas y poderes, en metros sobre un tramo.
    turbo: r(tramos[0].perfecto * (TURBO - 1)),
    impulsoCarrera: r((n * ciclo + config.duracionSprint) * VELOCIDAD_BASE * (IMPULSO_EMPAREJAR - 1)),
    algoritmo: r(promedio(algoritmo)),
  };
}

/** Las reglas de la carrera entera se calibraron con 6 preguntas: con más, el tope crece en proporción. */
const PREGUNTAS_REFERENCIA = 6;

/** Cuánto pueden valer, como máximo, los choques o los likes de toda la carrera: una respuesta cada 6 preguntas. */
export function topeCarrera(b) {
  return Math.round(b.acierto.minimo * Math.max(1, b.preguntas / PREGUNTAS_REFERENCIA) * 10) / 10;
}

/** Las reglas de la sección 7, como condiciones que se pueden comprobar (las usa el test). */
export function reglasDeBalance(b) {
  const tope = topeCarrera(b);
  const respuestas = tope === b.acierto.minimo ? 'una respuesta correcta' : `una respuesta correcta cada ${PREGUNTAS_REFERENCIA} preguntas`;
  return [
    {
      regla: 'Una respuesta correcta (con el extra por rapidez a la mitad) vale más que el tramo más largo',
      ok: b.acierto.minimo + (b.acierto.maximo - b.acierto.minimo) / 2 >= b.tramoMasLargo,
      detalle: `${b.acierto.minimo}–${b.acierto.maximo} m vs ${b.tramoMasLargo} m`,
    },
    {
      regla: 'Con el bonus mínimo, una respuesta correcta vale más que el primer tramo completo',
      ok: b.acierto.minimo >= b.tramoPrimero,
      detalle: `${b.acierto.minimo} m vs ${b.tramoPrimero} m`,
    },
    {
      regla: 'Chocar cuesta poco: cada choque cuesta entre 5 y 20 m',
      ok: b.costoPorChoque >= 5 && b.costoPorChoque <= 20,
      detalle: `${b.costoPorChoque} m por choque`,
    },
    {
      regla: `No esquivar nada en toda la carrera cuesta menos que ${respuestas}`,
      ok: b.perdidaCarrera < tope,
      detalle: `${b.perdidaCarrera} m perdidos vs ${tope} m`,
    },
    {
      regla: 'Una ventaja (turbo) vale menos que la respuesta que la dio',
      ok: b.turbo < b.acierto.minimo,
      detalle: `${b.turbo} m vs ${b.acierto.minimo} m`,
    },
    {
      regla: 'El Cambio de algoritmo molesta, pero cuesta menos que un tercio de respuesta',
      ok: b.algoritmo > 0 && b.algoritmo < b.acierto.minimo / 3,
      detalle: `${b.algoritmo} m`,
    },
    {
      regla: `Juntar todos los likes que se pueden en la carrera vale menos que ${respuestas}`,
      ok: b.likesMaximo < tope,
      detalle: `${b.likesAlcanzables} likes = ${b.likesMaximo} m vs ${tope} m`,
    },
  ];
}

if (esPrincipal(import.meta.url)) {
  const { values: v } = parseArgs({
    options: {
      dificultad: { type: 'string' },
      semillas: { type: 'string', default: '200' },
      preguntas: { type: 'string' },
    },
  });
  const config = { ...CONFIG_POR_DEFECTO, ...(v.preguntas ? { cantidadPreguntas: Number(v.preguntas) } : {}) };
  const b = medirBalance({ config, dificultad: v.dificultad ?? config.dificultadObstaculos, semillas: Number(v.semillas) });
  console.log(`\nBalanceo · dificultad ${b.dificultad} · ${b.preguntas} preguntas\n`);
  console.table({
    'Tramo completo (primero / más largo)': `${b.tramoPrimero} / ${b.tramoMasLargo} m`,
    'Respuesta correcta': `${b.acierto.minimo}–${b.acierto.maximo} m`,
    'Choques por tramo sin esquivar': b.choquesPorTramo,
    'Costo de cada choque': `${b.costoPorChoque} m`,
    'Pérdida por tramo sin esquivar (peor caso)': `${b.perdidaPorTramo} m (${b.peorPerdidaTramo} m)`,
    'Pérdida en toda la carrera sin esquivar': `${b.perdidaCarrera} m`,
    'Likes de toda la carrera (sin buscarlos / todos los que se pueden)': `${b.likesCarrera} m / ${b.likesMaximo} m (${b.likesAlcanzables} likes)`,
    'Turbo durante un tramo': `+${b.turbo} m`,
    'Impulso de emparejar en toda la carrera': `+${b.impulsoCarrera} m`,
    'Cambio de algoritmo recibido': `−${b.algoritmo} m`,
  });
  const reglas = reglasDeBalance(b);
  for (const r of reglas) console.log(`${r.ok ? '✅' : '❌'} ${r.regla} (${r.detalle})`);
  process.exit(reglas.every((r) => r.ok) ? 0 : 1);
}
