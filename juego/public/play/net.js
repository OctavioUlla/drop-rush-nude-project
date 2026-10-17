import { io } from 'socket.io-client';
import { Reloj } from '../shared/reloj.js';

// Conexión del celular: socket, reloj sincronizado, cola de salida con reintento y
// envío periódico de la distancia. Un corte de red no frena nada: el juego sigue con el guion.

const CLAVE_TOKEN = 'dropRush.token';

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

export class Red extends EventTarget {
  constructor() {
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
    this.token = leer(CLAVE_TOKEN);
    this.grupo = null;
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
      this.reloj.sincronizar().then(() => this.emitir('reloj'));
      this.vaciarCola();
      this.emitir('estado');
    });
    s.on('disconnect', () => {
      this.cortes++;
      this.desconectadoDesde = performance.now();
      this.emitir('estado');
    });
    s.on('player:joined', ({ groupId, deviceToken, maxGroups }) => {
      this.grupo = groupId;
      this.token = deviceToken;
      guardar(CLAVE_TOKEN, deviceToken);
      this.emitir('unido', { grupo: groupId, maxGrupos: maxGroups });
    });
    s.on('player:join_rejected', ({ reason }) => {
      // Token viejo (por ejemplo, el servidor se reinició): se olvida y se elige grupo de nuevo.
      if (reason !== 'taken') this.olvidarGrupo();
      this.emitir('rechazado', { motivo: reason });
    });
    for (const evento of ['room:groups', 'game:script', 'game:reset', 'game:end', 'state:sync', 'question:start', 'question:result', 'run:rank']) {
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

  unirse(numero) {
    if (numero != null) {
      this.token = null;
      guardar(CLAVE_TOKEN, null);
    }
    this.socket.emit('player:join', { groupId: numero, deviceToken: this.token });
  }

  olvidarGrupo() {
    this.grupo = null;
    this.token = null;
    guardar(CLAVE_TOKEN, null);
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
