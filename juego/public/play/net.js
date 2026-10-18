import { io } from 'socket.io-client';
import { Reloj } from '../shared/reloj.js';

// Conexión del celular: socket, reloj sincronizado, cola de salida con reintento y
// envío periódico de la distancia. Un corte de red no frena nada: el juego sigue con el guion.

// Se guarda el código de la sala junto con el token: el token solo vale en esa sala.
const CLAVE_SESION = 'dropRush.sesion';
/** Como máximo 2 cambios de carril por segundo durante la pregunta (sección 5.5). */
const INTERVALO_CARRIL = 500;

function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave, valor) {
  try {
    if (valor == null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* modo privado */
  }
}
function leerSesion() {
  try {
    return JSON.parse(leer(CLAVE_SESION)) ?? {};
  } catch {
    return {};
  }
}

export class Red extends EventTarget {
  /** @param {string|null} codigoUrl código de sala que trae el QR (?sala=ABCD) */
  constructor(codigoUrl = null) {
    super();
    this.socket = io({
      // WebSocket primero; si la red lo bloquea, long-polling (sección 5.4).
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnectionDelay: 250,
      reconnectionDelayMax: 2000,
      randomizationFactor: 0.3,
    });
    this.reloj = new Reloj(this.socket);
    const sesion = leerSesion();
    // Si el QR trae otra sala, el token guardado es de una partida anterior y no sirve.
    this.sala = codigoUrl ?? sesion.code ?? null;
    this.token = sesion.code && sesion.code === this.sala ? sesion.token : null;
    this.grupo = null;
    this.carrilPendiente = null;
    this.ultimoCarril = 0;
    this.cola = new Map(); // clave → { evento, datos, alConfirmar }
    this.cortes = 0;
    this.recuperadas = 0;
    this.desconectadoDesde = null;
    this.simulandoCorte = false;

    const s = this.socket;
    s.on('connect', () => {
      this.desconectadoDesde = null;
      if (s.recovered) this.recuperadas++;
      // Si Socket.io no pudo recuperar la sesión, se vuelve a entrar con el token, sin elegir nada.
      if (!s.recovered && this.token) this.unirse(null);
      else if (!s.recovered && this.sala && this.grupo == null) this.entrarSala(this.sala);
      this.reloj.sincronizar().then(() => this.emitir('reloj'));
      this.vaciarCola();
      this.emitir('estado');
    });
    s.on('disconnect', () => {
      this.cortes++;
      this.desconectadoDesde = performance.now();
      this.emitir('estado');
    });
    s.on('player:joined', ({ code, groupId, deviceToken, maxGroups }) => {
      this.sala = code;
      this.grupo = groupId;
      this.token = deviceToken;
      guardar(CLAVE_SESION, JSON.stringify({ code, token: deviceToken }));
      this.emitir('unido', { grupo: groupId, maxGrupos: maxGroups });
    });
    s.on('player:join_rejected', ({ reason }) => {
      // Token viejo (por ejemplo, el servidor se reinició): se olvida y se elige grupo de nuevo.
      if (reason !== 'taken') this.olvidarGrupo();
      if (reason === 'room_not_found') this.sala = null;
      this.emitir('rechazado', { motivo: reason });
    });
    // El presentador liberó el grupo (por ejemplo, para que lo retome otro celular).
    s.on('player:released', () => {
      this.olvidarGrupo();
      this.emitir('liberado');
    });
    for (const evento of [
      'room:groups', 'game:script', 'game:reset', 'game:end', 'state:sync',
      'question:start', 'question:result', 'question:closed', 'run:rank', 'run:modifiers',
      // Presentación: espera, hype colectivo y votación en vivo (presentacion.js).
      'pres:estado', 'pres:etapa', 'pres:hype:cuenta', 'pres:hype:nivel', 'pres:hype:drop', 'pres:votacion:pregunta',
    ]) {
      s.on(evento, (datos) => this.emitir(evento, datos));
    }

    setInterval(() => this.reloj.sincronizar(3), 15_000);
    setInterval(() => this.vaciarCola(), 1500);
  }

  emitir(tipo, detalle) {
    this.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));
  }

  get conectado() {
    return this.socket.connected;
  }

  /** Segundos que lleva sin conexión (0 si está conectado). */
  get segundosSinRed() {
    return this.desconectadoDesde == null ? 0 : (performance.now() - this.desconectadoDesde) / 1000;
  }

  ahora() {
    return this.reloj.ahora();
  }

  /** Primer paso del ingreso: validar el código y recibir la grilla de grupos de esa sala. */
  async entrarSala(codigo) {
    const r = await this.socket.timeout(5000).emitWithAck('room:enter', { code: codigo }).catch(() => ({ ok: false, reason: 'timeout' }));
    if (r.ok) {
      this.sala = r.code;
      this.emitir('sala', { codigo: r.code, maxGrupos: r.maxGroups });
      this.emitir('room:groups', r.groups);
    } else if (r.reason === 'room_not_found') {
      this.sala = null;
      this.emitir('rechazado', { motivo: r.reason });
    }
    return r;
  }

  unirse(numero) {
    if (numero != null) {
      this.token = null;
      guardar(CLAVE_SESION, null);
    }
    this.socket.emit('player:join', { code: this.sala, groupId: numero, deviceToken: this.token });
  }

  /** Suelta el grupo antes de que arranque la partida (el número se eligió mal) y vuelve a la grilla. */
  async salirDeGrupo() {
    const r = await this.socket.timeout(5000).emitWithAck('player:leave', {}).catch(() => ({ ok: false, reason: 'timeout' }));
    if (r.ok) {
      this.olvidarGrupo();
      this.emitir('room:groups', r.groups);
    }
    return r;
  }

  olvidarGrupo() {
    this.grupo = null;
    this.token = null;
    guardar(CLAVE_SESION, null);
  }

  /** Carril elegido durante la pregunta (para el contador "posicionados"), con límite de frecuencia. */
  carril(index, lane) {
    this.carrilPendiente = { index, lane };
    const espera = this.ultimoCarril + INTERVALO_CARRIL - performance.now();
    if (espera > 0) {
      this.temporizadorCarril ??= setTimeout(() => {
        this.temporizadorCarril = null;
        this.enviarCarril();
      }, espera);
      return;
    }
    this.enviarCarril();
  }

  enviarCarril() {
    if (!this.carrilPendiente || !this.conectado || this.grupo == null) return;
    this.socket.volatile.emit('question:lane', this.carrilPendiente);
    this.carrilPendiente = null;
    this.ultimoCarril = performance.now();
  }

  /** Distancia absoluta (no incrementos): si se pierde un mensaje, el siguiente lo corrige. */
  progreso(datos) {
    if (this.conectado && this.grupo != null) this.socket.volatile.emit('run:progress', datos);
  }

  /** Mensajes que tienen que llegar sí o sí: se reintentan hasta recibir el ack. */
  encolar(clave, evento, datos, alConfirmar) {
    this.cola.set(clave, { evento, datos, alConfirmar, enviando: false });
    this.vaciarCola();
  }

  vaciarCola() {
    if (!this.conectado) return;
    for (const [clave, item] of this.cola) {
      if (item.enviando) continue;
      item.enviando = true;
      this.socket.timeout(4000).emit(item.evento, item.datos, (error, respuesta) => {
        item.enviando = false;
        if (error) return; // se reintenta en la próxima vuelta
        this.cola.delete(clave);
        item.alConfirmar?.(respuesta);
      });
    }
  }

  /**
   * Simula un corte de Wi-Fi de `segundos` (para la prueba de reconexión de la Fase 0):
   * se cierra el transporte sin avisar, igual que cuando se cae la red, y no se reintenta hasta el final.
   */
  simularCorte(segundos) {
    if (this.simulandoCorte || !this.conectado) return;
    this.simulandoCorte = true;
    const manager = this.socket.io;
    manager.reconnection(false);
    manager.engine.close();
    setTimeout(() => {
      manager.reconnection(true);
      this.socket.connect();
      this.simulandoCorte = false;
    }, segundos * 1000);
  }
}
