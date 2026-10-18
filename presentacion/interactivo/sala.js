// Conexión de la presentación con el servidor del juego (PLANIFICACION, sección 6.1): la presentación es un proyector
// más de la sala. Abre la misma sala que después usa el proyector del juego (/host/ guarda la clave en el mismo lugar),
// así los celulares entran una sola vez con el QR de la portada y pasan de la presentación al juego sin elegir nada.
//
// const sala = await abrirSala({ etapa: 'presentacion' });   // falla si no hay servidor (se ensaya sin celulares)
// sala.conectado, sala.codigo, sala.conectados, sala.grupos, sala.estado (hype y votación guardados), sala.fotos
// await sala.pedir('pres:hype:preparar', { segundos: 3 })     // null si no hay conexión
// sala.addEventListener('pres:hype:nivel', (e) => …)
//
// socket.io-client y el reloj sincronizado los sirve el mismo servidor del juego: si la presentación se abre desde
// otro servidor, el import falla y la presentación sigue sola.

const CLAVE_SESION = 'dropRush.host'; // la misma que public/host/host.js
const EVENTOS = ['pres:estado', 'pres:etapa', 'pres:hype:cuenta', 'pres:hype:nivel', 'pres:hype:drop', 'pres:votacion:conteo'];

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) ?? {};
  } catch {
    return {};
  }
}
function guardarSesion(datos) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
  } catch {
    /* modo privado: al recargar se crea otra sala */
  }
}

export async function abrirSala({ etapa = 'presentacion', nueva = false } = {}) {
  const [{ io }, { Reloj }] = await Promise.all([
    import('../../socket.io/socket.io.esm.min.js'),
    import('../../compartido/reloj.js'),
  ]);
  return new Sala({ io, Reloj, etapa, nueva });
}

class Sala extends EventTarget {
  constructor({ io, Reloj, etapa, nueva }) {
    super();
    this.socket = io({ transports: ['websocket', 'polling'], tryAllTransports: true, reconnectionDelayMax: 2000 });
    this.reloj = new Reloj(this.socket);
    this.etapaActual = etapa;
    this.nueva = nueva;
    this.conectado = false; // con la sala abierta (no basta con el socket)
    this.codigo = null;
    this.max = 40;
    this.grupos = []; // [{ number, taken, connected, photo }] de room:groups
    this.clave = null; // clave del proyector: también sirve para pedir las fotos de los grupos
    this.estado = null; // { etapa, hype, votacion } que guarda el servidor
    this.urlCelulares = null;

    const s = this.socket;
    s.on('connect', () => this.entrar());
    s.on('disconnect', () => {
      this.conectado = false;
      this.avisar('cambio');
    });
    s.on('room:groups', (lista) => {
      this.grupos = lista;
      this.avisar('cambio');
    });
    for (const evento of EVENTOS) s.on(evento, (datos) => {
      if (evento === 'pres:estado') this.estado = datos;
      this.avisar(evento, datos);
    });
    setInterval(() => s.connected && this.reloj.sincronizar(3), 15_000);
  }

  avisar(tipo, detalle) {
    this.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));
  }

  /** Vuelve a la sala guardada (si se recargó) o crea una; después pasa los celulares a la etapa de la presentación. */
  async entrar() {
    const guardada = leerSesion();
    let r = null;
    if (!this.nueva && guardada.code) r = await this.pedir('host:hello', guardada, { siempre: true });
    if (!r?.ok) r = await this.pedir('host:create_room', {}, { siempre: true });
    if (!r?.ok) return;
    this.nueva = false;
    guardarSesion({ code: r.code, hostKey: r.hostKey });
    this.codigo = r.code;
    this.clave = r.hostKey;
    this.max = r.maxGroups;
    this.urlCelulares ??= await origenParaCelulares();
    const estado = await this.pedir('pres:conectar', { etapa: this.etapaActual }, { siempre: true });
    if (estado?.ok) this.estado = estado;
    await this.reloj.sincronizar();
    this.conectado = this.socket.connected;
    this.avisar('cambio');
    if (estado?.ok) this.avisar('pres:estado', estado);
  }

  /** Evento con respuesta; null si no hay conexión o el servidor no contesta a tiempo. */
  async pedir(evento, datos = {}, { siempre = false } = {}) {
    if (!this.socket.connected || (!siempre && !this.conectado)) return null;
    return this.socket.timeout(4000).emitWithAck(evento, datos).catch(() => null);
  }

  /** Hora del servidor (la cuenta regresiva del hype empieza a la misma hora en el proyector y en los celulares). */
  ahora() {
    return this.reloj.ahora();
  }

  /** 'presentacion' (espera, hype y votación en los celulares) o 'juego' (el lobby de Drop Rush). */
  etapa(etapa) {
    if (etapa === this.etapaActual) return;
    this.etapaActual = etapa;
    this.pedir('pres:etapa', { etapa });
  }

  /** Grupos de alumnos conectados (la cifra "12/40"; los profes no ocupan lugar de grupo). */
  get conectados() {
    return this.grupos.filter((g) => g.connected && !g.teacher).length;
  }

  /**
   * Fotos de los grupos (selfie o fit check, las sacan en la espera) para el feed de UGC: [{ numero, profe, url }].
   * room:groups trae la versión de cada una; la imagen se pide con la clave del proyector.
   */
  get fotos() {
    if (!this.conectado) return [];
    return this.grupos
      .filter((g) => g.photo)
      .map((g) => ({ numero: g.number, profe: Boolean(g.teacher), url: `/api/fotos/${this.codigo}/${g.number}?v=${g.photo}&clave=${encodeURIComponent(this.clave)}` }));
  }

  /** Dirección que abre el QR: la sala ya elegida, así el celular solo toca su número. */
  get urlQr() {
    return this.codigo && this.urlCelulares ? `${this.urlCelulares}/play/?sala=${this.codigo}` : null;
  }
}

/** Si el proyector abrió localhost, los celulares necesitan la IP de la notebook en la red (igual que /host/). */
async function origenParaCelulares() {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return location.origin;
  const { ips = [] } = await fetch('/api/red').then((r) => r.json()).catch(() => ({}));
  return ips[0] ? `${location.protocol}//${ips[0]}${location.port ? `:${location.port}` : ''}` : location.origin;
}
