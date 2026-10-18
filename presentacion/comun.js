// Lo que comparten la ventana del proyector (deck.js) y el modo presentador (presentador.js).
import { tokens } from '../design-system/tokens.js';

/** Canal entre las dos ventanas, en la misma compu y sin pasar por el servidor (sección 5). */
export const CANAL = 'np-presentacion';

const recorrido = tokens.escena.recorrido.estaciones;

/** "1:30" → 90 */
const aSegundos = (texto = '') => texto.split(':').reduce((s, parte) => s * 60 + Number(parte), 0);

/** 90 → "1:30"; con signo, -12 → "−0:12" */
export function reloj(segundos, { signo = false } = {}) {
  const s = Math.round(Math.abs(segundos));
  const texto = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return signo && segundos < 0 ? `−${texto}` : texto;
}

export const dosDigitos = (n) => String(n).padStart(2, '0');

/**
 * Lee las diapositivas de un documento (el del proyector o el index.html que baja el presentador).
 * Cada <section data-escena> es una diapositiva; las que comparten escena forman un bloque, y la primera
 * del bloque declara su nombre (data-bloque) y su tiempo (data-tiempo="2:00").
 */
export function leerDiapositivas(doc) {
  const diapos = [...doc.querySelectorAll('section[data-escena]')].map((el, indice) => ({
    el,
    indice,
    escena: el.dataset.escena,
    estacion: recorrido.indexOf(el.dataset.escena),
    tema: el.dataset.npTema === 'cacao' ? 'cacao' : 'crema',
    notas: el.querySelector('aside.notas')?.innerHTML.trim() ?? '',
  }));
  const bloques = [];
  for (const d of diapos) {
    if (d.estacion < 0) throw new Error(`La escena "${d.escena}" no está en tokens.escena.recorrido`);
    let b = bloques.at(-1);
    if (!b || b.escena !== d.escena) {
      b = { indice: bloques.length, escena: d.escena, estacion: d.estacion, nombre: d.el.dataset.bloque ?? d.escena, tiempo: aSegundos(d.el.dataset.tiempo), diapos: [] };
      bloques.push(b);
    }
    d.bloque = b.indice;
    b.diapos.push(d.indice);
  }
  return { diapos, bloques };
}
