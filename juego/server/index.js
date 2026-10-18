import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import express from 'express';
import QRCode from 'qrcode';
import { Server } from 'socket.io';
import { cargarConfig, cargarPreguntas } from './config.js';
import { Salas } from './rooms.js';
import { Partida } from './game.js';
import { esPrincipal } from './principal.js';

// Un solo proceso sirve la página, el JavaScript del juego y el tiempo real (sección 5).

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SALA_ABANDONADA = 12 * 60 * 60 * 1000;

export async function iniciarServidor({ puerto = 3000, host, config: extra = {}, archivos = 'auto' } = {}) {
  const config = cargarConfig(extra);
  const banco = cargarPreguntas();
  const app = express();
  const http = createServer(app);

  const io = new Server(http, {
    // Microcortes: tardar en dar por caída una conexión (sección 5.4).
    pingInterval: 10_000,
    pingTimeout: 20_000,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: true },
    // El WebSocket de recarga de Vite comparte el servidor HTTP: no cortar sus upgrades.
    destroyUpgrade: false,
  });

  const salas = new Salas();
  const metricas = { entrada: 0, salida: 0 };
  const informes = [];
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();

  // Canales de Socket.io de cada sala: todos sus celulares y proyectores, solo los proyectores y cada grupo.
  const canal = {
    sala: (codigo) => `s:${codigo}`,
    hosts: (codigo) => `s:${codigo}:hosts`,
    grupo: (codigo, numero) => `s:${codigo}:g:${numero}`,
  };
  const tamano = (nombre) => io.sockets.adapter.rooms.get(nombre)?.size ?? 0;

  const enviarA = (sala) => (destino, evento, datos) => {
    const nombre =
      destino === 'todos' ? canal.sala(sala.codigo) : destino === 'hosts' ? canal.hosts(sala.codigo) : canal.grupo(sala.codigo, destino);
    io.to(nombre).emit(evento, datos);
    metricas.salida += destino === 'todos' ? tamano(nombre) : 1;
  };

  const crearSala = (maxGrupos) => {
    const n = Math.round(Number(maxGrupos));
    const sala = salas.crear(n >= 1 && n <= config.maxGrupos ? n : config.maxGrupos);
    sala.partida = new Partida({ config, banco, sala, enviar: enviarA(sala) });
    return sala;
  };

  const pendientes = new Map();
  const avisarGrupos = (sala) => {
    // Agrupa varios cambios seguidos (por ejemplo, 40 celulares entrando a la vez).
    if (pendientes.has(sala.codigo)) return;
    pendientes.set(
      sala.codigo,
      setTimeout(() => {
        pendientes.delete(sala.codigo);
        enviarA(sala)('todos', 'room:groups', sala.resumen());
      }, 100),
    );
  };

  const salaDe = (socket) => (socket.data.sala ? salas.get(socket.data.sala) : null);
  const grupoDe = (socket) => salaDe(socket)?.grupos.get(socket.data.grupo) ?? null;
  const esHost = (socket) => {
    const sala = salaDe(socket);
    return sala && socket.data.host === sala.codigo ? sala : null;
  };

  const entrarASala = (socket, sala) => {
    if (socket.data.sala && socket.data.sala !== sala.codigo) salirDeSala(socket);
    socket.data.sala = sala.codigo;
    socket.join(canal.sala(sala.codigo));
  };

  const salirDeGrupo = (socket) => {
    if (socket.data.grupo == null) return;
    socket.leave(canal.grupo(socket.data.sala, socket.data.grupo));
    delete socket.data.grupo;
  };

  const salirDeSala = (socket) => {
    salirDeGrupo(socket);
    socket.leave(canal.sala(socket.data.sala));
    socket.leave(canal.hosts(socket.data.sala));
    delete socket.data.sala;
    delete socket.data.host;
  };

  const conectarGrupo = (socket, sala, grupo) => {
    if (socket.data.grupo !== grupo.numero) salirDeGrupo(socket);
    socket.data.grupo = grupo.numero;
    socket.join(canal.grupo(sala.codigo, grupo.numero));
    grupo.conectado = true;
    grupo.socketId = socket.id;
    avisarGrupos(sala);
  };

  const responder = (ack, datos) => {
    if (typeof ack === 'function') ack(datos);
  };

  io.on('connection', (socket) => {
    socket.onAny(() => {
      metricas.entrada++;
      const sala = salaDe(socket);
      if (sala) sala.ultimaActividad = Date.now();
    });

    // Si Socket.io recuperó la sesión tras un microcorte, el celular sigue en su sala y su grupo sin hacer nada.
    if (socket.recovered) {
      const sala = salaDe(socket);
      const grupo = grupoDe(socket);
      if (sala && grupo && !grupo.libre) {
        conectarGrupo(socket, sala, grupo);
        socket.emit('state:sync', sala.partida.estadoDe(grupo));
      }
    }

    socket.on('time:ping', (_clientTime, ack) => responder(ack, Date.now()));

    // ---------- Celulares ----------
    // Primer paso: el código de la sala (lo trae el QR o se escribe a mano).
    socket.on('room:enter', (datos, ack) => {
      const sala = salas.get(datos?.code);
      if (!sala) return responder(ack, { ok: false, reason: 'room_not_found' });
      entrarASala(socket, sala);
      responder(ack, { ok: true, code: sala.codigo, maxGroups: sala.maxGrupos, groups: sala.resumen() });
    });

    socket.on('player:join', (datos, ack) => {
      const sala = salas.get(datos?.code);
      const r = sala ? sala.unir(Number(datos?.groupId), datos?.deviceToken) : { ok: false, motivo: 'room_not_found' };
      if (!r.ok) {
        socket.emit('player:join_rejected', { reason: r.motivo });
        return responder(ack, { ok: false, reason: r.motivo });
      }
      entrarASala(socket, sala);
      conectarGrupo(socket, sala, r.grupo);
      const respuesta = { code: sala.codigo, groupId: r.grupo.numero, deviceToken: r.grupo.token, maxGroups: sala.maxGrupos };
      socket.emit('player:joined', respuesta);
      responder(ack, { ok: true, ...respuesta });
      socket.emit('room:groups', sala.resumen());
      if (sala.partida.guion) socket.emit('game:script', sala.partida.guion);
      socket.emit('state:sync', sala.partida.estadoDe(r.grupo));
    });

    socket.on('run:progress', (datos) => {
      const grupo = grupoDe(socket);
      if (grupo) salaDe(socket).partida.registrarProgreso(grupo, datos);
    });

    socket.on('question:lane', (datos) => {
      const grupo = grupoDe(socket);
      if (grupo) salaDe(socket).partida.registrarCarril(grupo, datos);
    });

    socket.on('question:answer', (datos, ack) => {
      const grupo = grupoDe(socket);
      const r = grupo ? salaDe(socket).partida.registrarRespuesta(grupo, datos) : { ok: false, motivo: 'no_group' };
      // El ack se manda siempre: el celular deja de reintentar aunque la respuesta no valga.
      responder(ack, { index: datos?.index, ...r });
    });

    // Poder guardado: el celular lo reintenta hasta el ack y el servidor lo aplica una sola vez.
    socket.on('player:use_power', (datos, ack) => {
      const grupo = grupoDe(socket);
      responder(ack, grupo ? salaDe(socket).partida.usarPoder(grupo, datos) : { ok: false, motivo: 'no_group' });
    });

    socket.on('debug:report', (datos) => {
      informes.unshift({ ...datos, room: socket.data.sala ?? null, group: socket.data.grupo ?? null, receivedAt: Date.now() });
      informes.length = Math.min(informes.length, 100);
      io.to('debug').emit('debug:reports', informes);
    });

    // ---------- Proyector ----------
    const prepararHost = (sala) => {
      entrarASala(socket, sala);
      socket.data.host = sala.codigo;
      socket.join(canal.hosts(sala.codigo));
      socket.join('debug');
      socket.emit('room:groups', sala.resumen());
      socket.emit('debug:reports', informes);
      socket.emit('host:state', sala.partida.estadoHost());
      return { ok: true, code: sala.codigo, hostKey: sala.claveHost, maxGroups: sala.maxGrupos, settings: ajustesLobby(sala) };
    };

    socket.on('host:create_room', (datos, ack) => {
      const sala = crearSala(datos?.maxGroups);
      const respuesta = prepararHost(sala);
      socket.emit('room:created', { code: sala.codigo });
      responder(ack, respuesta);
    });

    // Al recargar el proyector se vuelve a la misma sala con la clave que guardó.
    socket.on('host:hello', (datos, ack) => {
      const sala = salas.get(datos?.code);
      if (!sala || sala.claveHost !== datos?.hostKey) return responder(ack, { ok: false, reason: 'room_not_found' });
      responder(ack, prepararHost(sala));
    });

    socket.on('host:start', (ajustes) => {
      const sala = esHost(socket);
      if (sala) sala.partida.iniciar(ajustes ?? {});
    });

    socket.on('host:end', () => {
      const sala = esHost(socket);
      if (!sala) return;
      sala.partida.detener();
      sala.limpiarLiberados();
      enviarA(sala)('todos', 'game:reset', {});
      avisarGrupos(sala);
    });

    socket.on('host:review', (_datos, ack) => {
      const sala = esHost(socket);
      responder(ack, sala ? sala.partida.repaso() : []);
    });

    socket.on('host:release_group', (datos) => {
      const sala = esHost(socket);
      const numero = Number(datos?.groupId);
      if (!sala || !sala.liberar(numero)) return;
      for (const s of io.sockets.adapter.rooms.get(canal.grupo(sala.codigo, numero)) ?? []) {
        const otro = io.sockets.sockets.get(s);
        otro?.emit('player:released', { groupId: numero });
        if (otro) salirDeGrupo(otro);
      }
      avisarGrupos(sala);
    });

    socket.on('host:release_all', () => {
      const sala = esHost(socket);
      if (!sala) return;
      sala.partida.detener();
      sala.liberarTodos();
      for (const s of io.sockets.adapter.rooms.get(canal.sala(sala.codigo)) ?? []) {
        const otro = io.sockets.sockets.get(s);
        if (otro) salirDeGrupo(otro);
      }
      enviarA(sala)('todos', 'game:reset', { released: true });
      avisarGrupos(sala);
    });

    socket.on('disconnect', () => {
      const sala = salaDe(socket);
      const grupo = grupoDe(socket);
      // Solo se marca desconectado si no hay un socket más nuevo del mismo celular.
      if (sala && grupo && grupo.socketId === socket.id) {
        grupo.conectado = false;
        avisarGrupos(sala);
      }
    });
  });

  // Posiciones agregadas al host 5 veces por segundo; cada celular recibe solo su puesto, 1 vez por segundo.
  let ticks = 0;
  const ultimoPosicionados = new Map();
  const intervalo = setInterval(() => {
    ticks++;
    for (const sala of salas) {
      const { partida } = sala;
      const enviar = enviarA(sala);
      if (partida.activa) {
        enviar('hosts', 'run:positions', partida.posiciones());
        const p = partida.posicionados();
        const clave = p ? `${p.index}:${p.count}:${p.total}` : null;
        if (p && ultimoPosicionados.get(sala.codigo) !== clave) enviar('hosts', 'question:positioned', p);
        ultimoPosicionados.set(sala.codigo, clave);
        if (ticks % 5 === 0) {
          const ranking = partida.ranking();
          ranking.forEach((g, i) => {
            if (g.conectado) enviar(g.numero, 'run:rank', partida.rango(i + 1, ranking.length));
          });
        }
      }
      if (ticks % 5 === 0 && tamano(canal.hosts(sala.codigo))) {
        enviar('hosts', 'server:stats', {
          sockets: io.engine.clientsCount,
          rooms: salas.size,
          groups: sala.ocupados,
          connected: sala.conectados(),
          inPerSecond: metricas.entrada,
          outPerSecond: metricas.salida,
          eventLoopLagMs: Math.round(lag.mean / 1e6),
          memoryMb: Math.round(process.memoryUsage().rss / 1e6),
        });
      }
    }
    if (ticks % 5 === 0) {
      metricas.entrada = 0;
      metricas.salida = 0;
      lag.reset();
    }
    // Salas abandonadas (sin actividad ni nadie conectado durante horas) se borran.
    if (ticks % 3000 === 0) {
      for (const sala of [...salas]) {
        if (Date.now() - sala.ultimaActividad > SALA_ABANDONADA && !tamano(canal.sala(sala.codigo))) {
          sala.partida.detener();
          salas.borrar(sala.codigo);
        }
      }
    }
  }, 200);

  const ajustesLobby = (sala) => {
    const c = sala.partida.configActual;
    return {
      cantidadPreguntas: Math.min(c.cantidadPreguntas, banco.length),
      maxPreguntas: banco.length,
      duracionTramo: c.duracionTramo,
      tiempoPorDefecto: c.tiempoPorDefecto,
      dificultadObstaculos: c.dificultadObstaculos,
      preguntasEnRepaso: c.preguntasEnRepaso,
      poderesActivos: c.poderesActivos,
      emparejar: c.emparejar,
      sonido: c.sonido,
    };
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
  app.get('/api/informes', (_req, res) => res.json(informes));

  // QR del lobby, generado en el servidor para no sumar peso al juego del celular.
  app.get('/api/qr.svg', async (req, res) => {
    const texto = String(req.query.texto ?? '').slice(0, 300);
    if (!texto) return res.status(400).end();
    const svg = await QRCode.toString(texto, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#482922', light: '#fff8ee' },
    });
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(svg);
  });

  // Direcciones de la notebook en la red local: el QR las usa si el proyector abrió localhost.
  app.get('/api/red', (_req, res) => res.json({ ips: direccionesLocales() }));

  // `--produccion` en vez de NODE_ENV=production: así `npm start` anda igual en Windows.
  const produccion = process.env.NODE_ENV === 'production' || process.argv.includes('--produccion');
  let vite = null;
  if (archivos === 'auto' && !produccion) {
    const { createServer: crearVite } = await import('vite');
    vite = await crearVite({
      root: fileURLToPath(new URL('../public/', import.meta.url)),
      configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
      server: { middlewareMode: true, ws: { server: http } },
      appType: 'mpa',
    });
    app.get('/', (_req, res) => res.redirect('/play/'));
    app.use(vite.middlewares);
  } else if (archivos === 'auto') {
    // Archivos con hash: se descargan una sola vez por celular.
    app.use('/assets', express.static(`${DIST}assets`, { immutable: true, maxAge: '1y' }));
    app.get('/', (_req, res) => res.redirect('/play/'));
    app.use(express.static(DIST, { maxAge: 0 }));
  }

  await new Promise((resolve) => http.listen(puerto, host, resolve));
  const { port } = http.address();

  return {
    puerto: port,
    url: `http://localhost:${port}`,
    io,
    salas,
    crearSala,
    raiz: RAIZ,
    async cerrar() {
      clearInterval(intervalo);
      for (const sala of salas) sala.partida.detener();
      for (const t of pendientes.values()) clearTimeout(t);
      lag.disable();
      await vite?.close();
      await io.close();
    },
  };
}

function direccionesLocales() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

if (esPrincipal(import.meta.url)) {
  const puerto = Number(process.env.PORT) || 3000;
  const servidor = await iniciarServidor({ puerto, host: '0.0.0.0' });
  console.log(`\n  Drop Rush en marcha`);
  console.log(`  Celular:   http://localhost:${servidor.puerto}/play/`);
  console.log(`  Proyector: http://localhost:${servidor.puerto}/host/  (crea la sala y muestra el código y el QR)`);
  for (const ip of direccionesLocales()) console.log(`  En la red: http://${ip}:${servidor.puerto}/play/`);
  console.log('');
}
