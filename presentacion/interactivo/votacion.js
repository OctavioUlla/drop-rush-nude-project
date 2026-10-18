// Votación en vivo (PLANIFICACION, sección 2.3), del lado del proyector. Se abre en el bloque de la historia (tecla V)
// y se retoma en los desafíos: el resultado inclina la balanza y queda en la diapositiva.
// - En vivo: un voto por grupo desde el celular, que se puede cambiar mientras está abierta; el servidor manda el
//   conteo (pres:votacion:conteo) y lo guarda aunque se recargue la página.
// - Ensayo: sin servidor o sin celulares conectados, votan 40 grupos simulados.
// La pregunta y las opciones salen de datos/votacion.json.

const GRUPOS_ENSAYO = 40;
const PESOS_ENSAYO = [0.55, 0.2, 0.25, 0.1];

/**
 * @param {object} p
 * @param {{ id: string, pregunta: string, opciones: { texto: string, balanza?: number }[] }} p.datos
 * @param {HTMLElement[]} p.contenedores  cada [data-votacion] de las diapositivas
 * @param {HTMLElement} p.escenario       recibe data-votacion (sin-abrir | abierta | cerrada) y data-votos
 * @param {object|null} p.motor
 * @param {() => object|null} p.sala
 * @param {() => void} p.alCambiar
 */
export function crearVotacion({ datos, contenedores, escenario, motor, sala, alCambiar = () => {} }) {
  const opciones = datos.opciones.map((o) => o.texto);
  const balanza = motor?.estaciones.find((e) => e.nombre === 'desafios');
  const e = { estado: 'sin-abrir', modo: 'ensayo', votos: opciones.map(() => 0), votaron: 0, conectados: 0 };
  let simulacion = 0;

  for (const c of contenedores) {
    c.innerHTML = `
      <p class="np-etiqueta votacion__pregunta"></p>
      <ol class="np-votacion">${opciones.map(() => '<li class="np-votacion__opcion"><span class="np-votacion__texto"></span><span class="np-votacion__barra"></span><span class="np-votacion__cifra"></span></li>').join('')}</ol>
      <p class="np-votacion__estado"></p>`;
    c.querySelector('.votacion__pregunta').textContent = datos.pregunta;
    c.querySelectorAll('.np-votacion__texto').forEach((t, i) => (t.textContent = opciones[i]));
  }

  const porcentaje = (n) => (e.votaron ? Math.round((n / e.votaron) * 100) : 0);

  function pintar() {
    escenario.dataset.votacion = e.estado;
    escenario.toggleAttribute('data-votos', e.votaron > 0);
    // La opción más votada se destaca al cerrar (si hay empate, ninguna).
    const tope = Math.max(...e.votos);
    const ganadora = e.estado === 'cerrada' && e.votaron && e.votos.filter((v) => v === tope).length === 1 ? e.votos.indexOf(tope) : -1;
    const ensayo = e.modo === 'ensayo' ? ' · ensayo sin celulares' : '';
    const estado =
      e.estado === 'abierta'
        ? `${e.votaron}/${e.conectados} grupos votaron · se vota desde el celular${ensayo}`
        : `Votación cerrada · ${e.votaron} ${e.votaron === 1 ? 'voto' : 'votos'}${ensayo}`;
    for (const c of contenedores) {
      c.querySelectorAll('.np-votacion__opcion').forEach((li, i) => {
        li.style.setProperty('--valor', `${porcentaje(e.votos[i])}%`);
        li.classList.toggle('np-votacion__opcion--destacada', i === ganadora);
        li.querySelector('.np-votacion__cifra').textContent = `${porcentaje(e.votos[i])} % · ${e.votos[i]}`;
      });
      c.querySelector('.np-votacion__estado').textContent = estado;
    }
    // La balanza de los desafíos: de -1 (gana la accesibilidad) a 1 (gana la exclusividad).
    if (balanza) balanza.valor = e.votaron ? datos.opciones.reduce((s, o, i) => s + (o.balanza ?? 0) * e.votos[i], 0) / e.votaron : 0;
    alCambiar();
  }

  /** Conteo del servidor (en vivo) o de la simulación. */
  function aplicar(c, modo) {
    Object.assign(e, { modo, estado: c.abierta ? 'abierta' : 'cerrada', votos: c.votos, votaron: c.votaron, conectados: c.conectados });
    pintar();
  }

  // ---------- Ensayo: 40 grupos simulados ----------
  function simular() {
    const elegidos = new Map();
    const pesos = PESOS_ENSAYO.slice(0, opciones.length);
    const sortear = () => {
      let r = Math.random() * pesos.reduce((s, p) => s + p, 0);
      return pesos.findIndex((p) => (r -= p) < 0);
    };
    clearInterval(simulacion);
    simulacion = setInterval(() => {
      for (let g = 1; g <= GRUPOS_ENSAYO; g++) {
        if (!elegidos.has(g) && Math.random() < 0.09) elegidos.set(g, sortear());
        else if (elegidos.has(g) && Math.random() < 0.004) elegidos.set(g, sortear()); // alguno cambia su voto
      }
      const votos = opciones.map(() => 0);
      for (const o of elegidos.values()) votos[o]++;
      aplicar({ abierta: true, votos, votaron: elegidos.size, conectados: GRUPOS_ENSAYO }, 'ensayo');
    }, 250);
  }

  // ---------- En vivo ----------
  let escuchando = null;
  function conectar(s) {
    if (escuchando === s) return;
    escuchando = s;
    const recibir = (c) => {
      if (c?.id !== datos.id) return; // otra pregunta (de un ensayo con otro votacion.json)
      clearInterval(simulacion);
      aplicar(c, 'vivo');
    };
    s.addEventListener('pres:votacion:conteo', ({ detail }) => recibir(detail));
    s.addEventListener('pres:estado', ({ detail }) => {
      if (detail.votacion) recibir(detail.votacion);
      else if (e.modo === 'vivo') {
        // El presentador reinició el hype y la votación (ensayos).
        Object.assign(e, { estado: 'sin-abrir', votos: opciones.map(() => 0), votaron: 0 });
        pintar();
      }
    });
    // El denominador ("31/40 votaron") sigue a los grupos conectados.
    s.addEventListener('cambio', () => {
      if (e.modo === 'vivo' && e.estado === 'abierta') {
        e.conectados = s.conectados;
        pintar();
      }
    });
  }

  pintar();

  return {
    conectar,
    /** Tecla V: abre la votación (en vivo si hay celulares conectados) o la cierra. */
    async alternar() {
      const s = sala();
      if (e.estado === 'abierta') {
        if (e.modo === 'vivo' && (await s?.pedir('pres:votacion:cerrar'))?.ok) return;
        clearInterval(simulacion);
        e.estado = 'cerrada';
        return pintar();
      }
      if (s?.conectado && s.conectados > 0) {
        const r = await s.pedir('pres:votacion:abrir', { id: datos.id, pregunta: datos.pregunta, opciones });
        if (r?.ok) return; // el conteo llega con pres:votacion:conteo
      }
      if (e.modo === 'ensayo') Object.assign(e, { votos: opciones.map(() => 0), votaron: 0 });
      e.estado = 'abierta';
      simular();
    },
    /** Para el modo presentador: "Sí 70 % · No 20 % · Depende 10 %". */
    get estado() {
      return { estado: e.estado, modo: e.modo, votaron: e.votaron, conectados: e.conectados, resumen: opciones.map((o, i) => `${o} ${porcentaje(e.votos[i])} %`).join(' · ') };
    },
  };
}
