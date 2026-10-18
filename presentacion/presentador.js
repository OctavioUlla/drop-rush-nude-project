// Modo presentador (PLANIFICACION, sección 5): diapositiva actual y siguiente, notas, cronómetro por bloque
// y estado. Se sincroniza con el proyector por BroadcastChannel, en la misma compu y sin servidor.
// Las diapositivas se leen del mismo index.html, así que no hay nada que mantener por duplicado.
import { CANAL, dosDigitos, leerDiapositivas, reloj as formatear } from './comun.js';

const $ = (s) => document.querySelector(s);
const AVISO = 20; // segundos: el cronómetro se pone en mostaza

const html = await (await fetch('./index.html')).text();
const { diapos, bloques } = leerDiapositivas(new DOMParser().parseFromString(html, 'text/html'));
const exposicion = bloques.reduce((s, b) => s + b.tiempo, 0);

const canal = new BroadcastChannel(CANAL);
let estado = null; // el último que mandó el proyector
let recibido = 0;
let mostrada = null;

/** Copia de la diapositiva sobre un escenario 16:9, con la imagen pre-renderizada de la escena de fondo. */
function miniatura(contenedor, d) {
  if (!d) { contenedor.innerHTML = '<p class="miniatura__fin">Fin de la presentación</p>'; return; }
  const escenario = document.createElement('div');
  escenario.className = 'np-escenario';
  escenario.setAttribute('data-np-tema', d.tema);
  escenario.style.setProperty('--fondo-escena', `var(--np-presentacion-estudio-${d.tema}-fondo)`);
  const capas = document.createElement('div');
  capas.className = 'np-capas';
  const capa = document.importNode(d.el, true);
  capa.querySelectorAll('aside.notas, .np-etiquetas, .hype, .ingreso').forEach((x) => x.remove());
  capa.classList.add('np-diapo--activa');
  // Fondo: la imagen pre-renderizada de su encuadre (renders/), así la miniatura muestra la escena.
  capa.style.setProperty('--respaldo', `url("${new URL(`./renders/${d.escena}${d.pose ? `-${d.pose}` : ''}.jpg`, location.href)}")`);
  capas.append(capa);
  escenario.append(capas);
  contenedor.replaceChildren(escenario);
}

function mostrarDiapositiva(i) {
  mostrada = i;
  const d = diapos[i];
  const b = bloques[d.bloque];
  $('#donde').textContent = `${dosDigitos(b.indice)} — ${b.nombre}`;
  // Orador del bloque y, en su última diapositiva, a quién le pasa la palabra.
  const proximo = diapos[i + 1] && bloques[diapos[i + 1].bloque];
  const orador = b.orador ? ` · 🎤 Orador ${b.orador}` : '';
  const pasa = proximo && proximo !== b && proximo.orador && proximo.orador !== b.orador ? ` → pasa a ${proximo.orador}` : '';
  $('#cual').textContent = `Diapositiva ${i + 1} de ${diapos.length}${b.diapos.length > 1 ? ` · ${b.diapos.indexOf(i) + 1}/${b.diapos.length} del bloque` : ''}${orador}${pasa}`;
  miniatura($('#actual'), d);
  miniatura($('#siguiente'), diapos[i + 1]);
  $('#notas').innerHTML = d.notas || '<p><em>Sin notas.</em></p>';
  $('#notas').scrollTop = 0;
  document.title = `${dosDigitos(b.indice)} ${b.nombre} · Presentador`;
}

function cronometro(el, segundos, texto, { limite } = {}) {
  el.firstElementChild.textContent = segundos === null ? '—' : formatear(segundos, { signo: true });
  el.lastElementChild.textContent = texto;
  el.classList.toggle('np-cronometro--aviso', limite !== undefined && segundos !== null && segundos >= 0 && segundos <= AVISO);
  el.classList.toggle('np-cronometro--pasado', limite !== undefined && segundos !== null && segundos < 0);
}

/** Sala y grupos conectados, hype y votación (los manda el proyector, que es el que habla con el servidor). */
function insigniasInteractivas(i) {
  if (!i) return [];
  const lista = [];
  if (i.servidor === 'conectado') lista.push(`<span class="np-insignia np-insignia--relleno">Sala ${i.sala} · ${i.conectados}/${i.max} conectados</span>`);
  else if (i.servidor === 'conectando') lista.push('<span class="np-insignia">Conectando con el servidor…</span>');
  else lista.push('<span class="np-insignia np-insignia--alerta">Sin servidor: hype y votación de ensayo</span>');
  if (i.qrGrande) lista.push('<span class="np-insignia np-insignia--rosa">QR a pantalla completa (Q)</span>');
  const h = i.hype;
  const ensayo = (x) => (x?.modo === 'ensayo' ? ' (ensayo)' : '');
  if (h?.fase === 'cuenta') lista.push(`<span class="np-insignia np-insignia--rosa">Hype: cuenta regresiva${ensayo(h)}</span>`);
  if (h?.fase === 'llenando') lista.push(`<span class="np-insignia np-insignia--rosa">Hype ${Math.floor(h.nivel * 100)} % · ${h.sumando}/${h.conectados} grupos${ensayo(h)} · H lo completa</span>`);
  if (h?.fase === 'drop') lista.push(`<span class="np-insignia np-insignia--rosa">Hype: ¡drop! ${h.toques} toques${ensayo(h)}</span>`);
  const v = i.votacion;
  if (v?.estado === 'abierta') lista.push(`<span class="np-insignia np-insignia--rosa">Votación abierta · ${v.votaron}/${v.conectados}${ensayo(v)} · ${v.resumen}</span>`);
  if (v?.estado === 'cerrada') lista.push(`<span class="np-insignia">Votación${ensayo(v)} · ${v.votaron} votos · ${v.resumen}</span>`);
  // Fotos de la clase (selfies y fit checks de la espera) para el feed de UGC del bloque 2.
  if (i.clase) lista.push(`<span class="np-insignia np-insignia--rosa">Feed UGC: ${i.clase.fotos} fotos de la clase${i.clase.ensayo ? ' (ensayo)' : ''} · U las saca</span>`);
  else if (i.servidor === 'conectado') lista.push(`<span class="np-insignia">📸 ${i.fotos} ${i.fotos === 1 ? 'foto' : 'fotos'} de la clase${i.fotos ? '' : ': U muestra las de ensayo'}</span>`);
  return lista;
}

function pintar() {
  const conectado = estado && Date.now() - recibido < 2500;
  const insignias = [
    conectado ? '<span class="np-insignia np-insignia--relleno">Proyector conectado</span>' : '<span class="np-insignia np-insignia--alerta">Proyector sin conexión: abrilo y tocá P</span>',
    estado?.pausa ? '<span class="np-insignia np-insignia--rosa">Pantalla en pausa (B)</span>' : '',
    estado?.feedsPausados ? '<span class="np-insignia np-insignia--rosa">Feeds en pausa (F)</span>' : '',
    ...insigniasInteractivas(conectado ? estado.interactivo : null),
  ];
  $('#estado').innerHTML = insignias.join('');
  if (!estado) return;

  const { reloj, actual } = estado;
  const b = bloques[diapos[actual].bloque];
  const ahora = Date.now();
  const corriendo = reloj.inicio !== null;
  const enBloque = (reloj.porBloque[b.indice] + (corriendo && reloj.bloque === b.indice ? ahora - reloj.desde : 0)) / 1000;
  cronometro($('#crono-bloque'), corriendo ? b.tiempo - enBloque : b.tiempo,
    `${corriendo ? 'Quedan' : 'Tiempo'} del bloque ${dosDigitos(b.indice)} · ${formatear(b.tiempo)}`, { limite: true });
  cronometro($('#crono-total'), corriendo ? (ahora - reloj.inicio) / 1000 : null,
    corriendo ? `Total · plan ${formatear(exposicion)}` : 'Total · el cronómetro arranca al pasar de la portada');
  $('#boton-reloj').textContent = corriendo ? 'Reiniciar cronómetro' : 'Empezar cronómetro';
}

canal.addEventListener('message', ({ data }) => {
  if (data.tipo !== 'estado') return;
  estado = data;
  recibido = Date.now();
  if (data.actual !== mostrada) mostrarDiapositiva(data.actual);
  pintar();
});

const enviar = (tipo, datos = {}) => canal.postMessage({ tipo, ...datos });
const reloj = () => enviar('reloj', { accion: estado?.reloj.inicio === null ? 'empezar' : 'reiniciar' });
document.addEventListener('click', (ev) => {
  const accion = ev.target.closest('[data-accion]')?.dataset.accion;
  if (accion === 'reloj') reloj();
  else if (accion === 'reiniciar-interactivo') {
    if (confirm('¿Borrar el hype y la votación guardados en el servidor? (para después de un ensayo)')) enviar(accion);
  }
  else if (accion) enviar(accion);
});
addEventListener('keydown', (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const tecla = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(tecla)) { ev.preventDefault(); enviar('siguiente'); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(tecla)) { ev.preventDefault(); enviar('anterior'); }
  else if (tecla === 'Home') enviar('ir', { diapositiva: 0 });
  else if (tecla === 'End') enviar('ir', { diapositiva: diapos.length - 1 });
  else if (tecla === 'b' || tecla === '.') enviar('pausa');
  else if (tecla === 't') reloj();
  else if (tecla === 'f') enviar('feeds');
  else if (tecla === 'u') enviar('clase');
  else if (tecla === 'h') enviar('hype');
  else if (tecla === 'q') enviar('qr');
  else if (tecla === 'v') enviar('votacion');
});

mostrarDiapositiva(0);
pintar();
enviar('hola');
setInterval(pintar, 250);
