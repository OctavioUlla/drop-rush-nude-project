// Cola de la tienda: la barra de progreso de la presentación (PLANIFICACION de la presentación, sección 2.2).
// Una fila de personas espera en la puerta de la Nude House. Delante nuestro (la persona en mostaza) hay tantas
// personas como bloques faltan: en cada bloque la puerta se abre, entra la primera y la fila da un paso.
// En el último bloque nos toca: la puerta queda abierta y aparece el cartel QUEDA 1.
// El movimiento lo resuelve el CSS (components.css, np-cola) con --bloque; este módulo arma el HTML y avisa
// cuándo caminan, para que las piernas se muevan solo durante el paso (nada se mueve mientras se habla).
//
// const cola = crearCola(document.querySelector('.np-cola'), { bloques: 9 });
// cola.ir(3);                 // con paso
// cola.ir(3, { animar: false }); // sin paso (al cargar)
// cola.grupos(['#2f52bc', '#3bb075']); // la forman los grupos conectados: cada persona con el color de su grupo
import { tokens } from './tokens.js';

const DETRAS = 14; // personas detrás nuestro: la fila se pierde a la izquierda
const TONOS = [100, 78, 90, 66, 84]; // % de tinta: la fila se lee como gente distinta sin sumar colores
const ALTOS = [1, 0.94, 1.04, 0.97, 1.02, 0.92];
const ms = (clave) => Number.parseFloat(tokens.movimiento[clave]);

export function crearCola(el, { bloques }) {
  const ultimo = bloques - 1;
  const personas = Array.from({ length: ultimo + 1 + DETRAS }, (_, j) => {
    const nosotros = j === ultimo;
    return `<span class="np-cola__persona${nosotros ? ' np-cola__persona--nosotros' : ''}" style="--j: ${j}; --tono: ${TONOS[j % TONOS.length]}%; --alto: ${nosotros ? 1 : ALTOS[j % ALTOS.length]}"><i></i><i></i><b></b></span>`;
  }).join('');
  el.innerHTML = `
    <p class="np-cola__texto" aria-live="polite"><span class="np-cola__etiqueta"></span><span class="np-cola__cifra"></span></p>
    <div class="np-cola__vereda">
      <div class="np-cola__fila">${personas}</div>
      <div class="np-cola__tienda">
        <span class="np-cola__queda">Queda 1</span>
        <span class="np-cola__cartel">Nude<sup>®</sup>Project</span>
        <span class="np-cola__puerta"><span class="np-cola__hoja"></span></span>
        <span class="np-cola__vidriera"></span>
      </div>
    </div>`;
  el.style.setProperty('--ultimo', ultimo);
  const etiqueta = el.querySelector('.np-cola__etiqueta');
  const cifra = el.querySelector('.np-cola__cifra');
  const tienda = el.querySelector('.np-cola__tienda');
  // Lo que tarda el paso: la primera arranca enseguida y las de atrás la siguen escalonadas (como una fila real).
  const paso = ms('escena') + 12 * ms('escalonado') * 0.6;
  let actual = null, andando = 0, pasa = 0;

  function ir(bloque, { animar = true } = {}) {
    bloque = Math.max(0, Math.min(ultimo, bloque));
    if (bloque === actual) return;
    const habia = actual;
    actual = bloque;
    el.classList.toggle('np-cola--quieta', !animar || habia === null);
    el.style.setProperty('--bloque', bloque);
    tienda.classList.toggle('np-cola__tienda--abierta', bloque === ultimo);
    if (animar && habia !== null) {
      el.classList.add('np-cola--andando');
      el.classList.toggle('np-cola--atras', bloque < habia);
      clearTimeout(andando);
      andando = setTimeout(() => el.classList.remove('np-cola--andando', 'np-cola--atras'), paso);
      // La puerta se abre mientras entra (o sale, si se vuelve atrás) la primera de la fila.
      tienda.classList.add('np-cola__tienda--pasa');
      clearTimeout(pasa);
      pasa = setTimeout(() => tienda.classList.remove('np-cola__tienda--pasa'), ms('escena') + ms('lento'));
    }
    const faltan = ultimo - bloque;
    etiqueta.textContent = faltan ? 'Cola del drop' : 'Puerta abierta';
    cifra.innerHTML = faltan ? `<b>${faltan}</b> ${faltan === 1 ? 'persona' : 'personas'} adelante` : '<b>Nos toca</b>';
    if (animar && habia !== null) {
      cifra.classList.remove('np-cola__cifra--cambia');
      void cifra.offsetWidth; // reinicia la animación de la cifra
      cifra.classList.add('np-cola__cifra--cambia');
    }
  }

  /**
   * La cola la forman los grupos conectados (PLANIFICACION 2.2): cada persona, salvo nosotros, toma el color de un
   * grupo en orden; las que sobran vuelven al tono de la tinta. Así la clase se ve a sí misma esperando.
   */
  const otras = [...el.querySelectorAll('.np-cola__persona:not(.np-cola__persona--nosotros)')];
  function grupos(colores = []) {
    otras.forEach((p, k) => {
      if (colores[k]) p.style.setProperty('--g', colores[k]);
      else p.style.removeProperty('--g');
    });
  }

  return { ir, grupos, get bloque() { return actual; } };
}
