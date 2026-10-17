import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DATA = new URL('../data/', import.meta.url);

/** Valores por defecto de la sección 7 de PLANIFICACION.md. */
export const CONFIG_POR_DEFECTO = {
  maxGrupos: 40,
  cantidadPreguntas: 6,
  ordenAleatorio: true,
  mezclarOpciones: true,
  tiempoPorDefecto: 15,
  duracionTramo: 15,
  duracionCuenta: 4,
  duracionSprint: 10,
  duracionRevelado: 3,
  dificultadObstaculos: 'facil',
  toleranciaRespuestaTardia: 10,
  bonusAcierto: 150,
  bonusRapidezMax: 100,
};

function leerJson(nombre) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(nombre, DATA)), 'utf8'));
}

export function cargarConfig(extra = {}) {
  let archivo = {};
  try {
    archivo = leerJson('config.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { ...CONFIG_POR_DEFECTO, ...archivo, ...extra };
}

export function cargarPreguntas() {
  const { preguntas } = leerJson('preguntas.json');
  for (const p of preguntas) {
    if (p.opciones.length < 2 || p.opciones.length > 3) {
      throw new Error(`La pregunta ${p.id} tiene que tener 2 o 3 opciones (una por carril).`);
    }
    if (!(p.correcta >= 0 && p.correcta < p.opciones.length)) {
      throw new Error(`La pregunta ${p.id} tiene un índice "correcta" inválido.`);
    }
  }
  return preguntas;
}
