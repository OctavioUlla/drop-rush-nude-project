// Medidor de rendimiento de la escena 3D (fase 0: medir fps en la notebook que se va a usar).
// Tecla M: fps en vivo. ?medir (o el botón): recorrido de prueba por las 9 estaciones, ida y vuelta, con un informe.
// Si no llega al objetivo, probar con ?escala=1 (resolución interna más baja) y volver a medir.
import { tokens } from '../design-system/tokens.js';

const objetivo = tokens.escena.render['fps-objetivo'];
const formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const n = (x) => formato.format(x);

const percentil = (ordenados, p) => ordenados[Math.min(ordenados.length - 1, Math.floor((ordenados.length - 1) * p))];
function resumir(cuadros) {
  if (!cuadros.length) return null;
  const o = [...cuadros].sort((a, b) => a - b);
  const media = cuadros.reduce((s, x) => s + x, 0) / cuadros.length;
  return {
    cuadros: cuadros.length,
    fps: 1000 / media,
    lento: 1000 / percentil(o, 0.99), // fps del 1 % de cuadros más lentos
    p95: percentil(o, 0.95),
    peor: o.at(-1),
    trabas: cuadros.filter((x) => x > 25).length / cuadros.length, // cuadros por debajo de 40 fps
  };
}
function veredicto(r) {
  if (r.fps >= objetivo * 0.95 && r.trabas <= 0.01) return { clase: 'bien', texto: `Llega a ${objetivo} fps: lista para el proyector.` };
  if (r.fps >= objetivo * 0.75) return { clase: 'regular', texto: 'Se ve fluida, con algunas trabas: probar con ?escala=1.' };
  return { clase: 'mal', texto: 'No llega: probar con ?escala=1; si sigue igual, usar las imágenes pre-renderizadas.' };
}

/** Datos del equipo: placa de video, resolución interna del canvas y de la pantalla. */
function equipo(lienzo) {
  const gl = lienzo.getContext('webgl2'); // devuelve el contexto que ya creó three.js
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  const placa = gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'sin WebGL';
  const escala = lienzo.width / Math.max(1, lienzo.clientWidth);
  return {
    placa: String(placa).replace(/^ANGLE \((.*)\)$/, '$1'),
    interna: `${lienzo.width}×${lienzo.height} (×${n(escala)})`,
    pantalla: `${Math.round(screen.width * devicePixelRatio)}×${Math.round(screen.height * devicePixelRatio)} · ventana ${innerWidth}×${innerHeight}`,
  };
}

export function crearMedidor({ escenario, lienzo, motor, bloques, ir }) {
  const el = document.createElement('div');
  el.className = 'medidor';
  el.setAttribute('aria-live', 'polite');
  escenario.append(el);

  let visible = false;
  let grabando = null; // { viaje: [], quieta: [] } durante el recorrido
  let ultimos = []; // ventana de 1 s para el valor en vivo
  let anterior = 0;
  let informe = ''; // para copiar
  let resumen = ''; // en pantalla

  const cuadro = (t) => {
    const dt = anterior ? t - anterior : 0;
    anterior = t;
    if (dt > 0 && dt < 250) { // más de 250 ms: la pestaña estuvo oculta, no cuenta
      ultimos.push([t, dt]);
      grabando?.[motor.viajando ? 'viaje' : 'quieta'].push(dt);
    }
    while (ultimos.length && t - ultimos[0][0] > 1000) ultimos.shift();
    if (visible || grabando) requestAnimationFrame(cuadro);
    else anterior = 0;
  };
  const latir = () => { if (!anterior) requestAnimationFrame(cuadro); };

  // Estructura fija: solo se actualizan los textos (si se rehace el HTML, se pierden clics en los botones).
  el.innerHTML = `
    <b><span data-v="fps">—</span><small>fps · objetivo ${objetivo}</small></b>
    <dl>
      <dt>Cuadro p95</dt><dd data-v="p95">—</dd>
      <dt>Interna</dt><dd data-v="interna"></dd>
      <dt>Pantalla</dt><dd data-v="pantalla"></dd>
      <dt>Placa</dt><dd data-v="placa"></dd>
    </dl>
    <pre data-v="informe" hidden></pre>
    <div class="medidor__acciones">
      <button data-accion="recorrer">Recorrido de prueba</button>
      <button data-accion="copiar" hidden>Copiar informe</button>
    </div>`;
  const campo = (k) => el.querySelector(`[data-v="${k}"]`);
  const botonRecorrer = el.querySelector('[data-accion="recorrer"]');
  const botonCopiar = el.querySelector('[data-accion="copiar"]');

  function pintar() {
    const r = resumir(ultimos.map(([, dt]) => dt));
    const e = equipo(lienzo);
    campo('fps').textContent = r ? Math.round(r.fps) : '—';
    campo('p95').textContent = r ? `${n(r.p95)} ms` : '—';
    campo('interna').textContent = e.interna;
    campo('pantalla').textContent = e.pantalla;
    campo('placa').textContent = e.placa;
    campo('informe').hidden = !resumen;
    campo('informe').textContent = resumen;
    botonCopiar.hidden = !informe;
    botonRecorrer.textContent = grabando ? 'Midiendo…' : 'Recorrido de prueba';
  }
  el.addEventListener('click', (ev) => {
    const accion = ev.target.closest('button')?.dataset.accion;
    if (accion === 'recorrer') recorrer();
    if (accion === 'copiar') navigator.clipboard?.writeText(informe);
  });

  let refresco = 0;
  function alternar(si = !visible) {
    visible = si;
    el.classList.toggle('medidor--visible', visible);
    clearInterval(refresco);
    if (visible) { latir(); pintar(); refresco = setInterval(pintar, 500); }
  }

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const llegada = () => new Promise((r) => { const f = () => (motor.viajando ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); });

  /** Viaja por todas las estaciones de a una, se queda 1,2 s en cada una y vuelve a la portada de un salto. */
  async function recorrer() {
    if (grabando) return;
    informe = resumen = '';
    alternar(true);
    ir(bloques[0].diapos[0]);
    await llegada();
    await esperar(1500); // que se asiente la sudadera después del cargador
    grabando = { viaje: [], quieta: [] };
    latir();
    for (const b of bloques.slice(1)) {
      ir(b.diapos[0]);
      await llegada();
      await esperar(1200);
    }
    ir(bloques[0].diapos[0]);
    await llegada();
    await esperar(1000);
    const { viaje, quieta } = grabando;
    grabando = null;

    const total = resumir([...viaje, ...quieta]);
    const v = veredicto(total);
    const e = equipo(lienzo);
    const linea = (nombre, r) => r && `${nombre}: ${n(r.fps)} fps de media · 1 % más lento ${n(r.lento)} fps · peor cuadro ${n(r.peor)} ms · trabas ${n(r.trabas * 100)} %`;
    // En pantalla, el veredicto y las cifras; el informe que se copia suma el equipo y el navegador.
    resumen = [
      `${v.clase === 'bien' ? '✔' : v.clase === 'regular' ? '⚠' : '✖'} ${v.texto}`,
      linea('Todo', total),
      linea('En los viajes', resumir(viaje)),
      linea('Quieta', resumir(quieta)),
    ].filter(Boolean).join('\n');
    informe = [
      resumen,
      `Interna ${e.interna} · pantalla ${e.pantalla}`,
      `Placa: ${e.placa}`,
      `${new Date().toLocaleString('es-AR')} · ${navigator.userAgent}`,
    ].join('\n');
    campo('informe').className = `medidor__veredicto--${v.clase}`;
    console.info(`Recorrido de prueba\n${informe}`);
    pintar();
    return { total, viaje: resumir(viaje), quieta: resumir(quieta), equipo: e };
  }

  return { alternar, recorrer };
}
