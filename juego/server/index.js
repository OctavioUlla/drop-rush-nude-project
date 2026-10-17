import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import express from 'express';
import { Server } from 'socket.io';
import { cargarConfig, cargarPreguntas } from './config.js';
import { Sala } from './rooms.js';
import { Partida } from './game.js';

// Un solo proceso sirve la página, el JavaScript del juego y el tiempo real (sección 5).

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

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

  const sala = new Sala(config.maxGrupos);
  const metricas = { entrada: 0, salida: 0 };
  const informes = [];
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();

  const enviar = (destino, evento, datos) => {
    if (destino === 'todos') {
      io.emit(evento, datos);
      metricas.salida += io.engine.clientsCount;
    } else if (destino === 'hosts') {
      io.to('hosts').emit(evento, datos);
      metricas.salida++;
    } else {
      io.to(`g:${destino}`).emit(evento, datos);
      metricas.salida++;
    }
  };

  const partida = new Partida({ config, banco, sala, enviar });

  let gruposPendiente = null;
  const avisarGrupos = () => {
    // Agrupa varios cambios seguidos (por ejemplo, 40 celulares entrando a la vez).
    gruposPendiente ??= setTimeout(() => {
      gruposPendiente = null;
      enviar('todos', 'room:groups', sala.resumen());
    }, 100);
  };

  const conectarGrupo = (socket, grupo) => {
    socket.data.grupo = grupo.numero;
    socket.join(`g:${grupo.numero}`);
    grupo.conectado = true;
    grupo.socketId = socket.id;
    avisarGrupos();
  };

  io.on('connection', (socket) => {
    socket.onAny(() => metricas.entrada++);
    socket.emit('room:groups', sala.resumen());

    // Si Socket.io recuperó la sesión tras un microcorte, el celular sigue en su grupo sin hacer nada.
    if (socket.recovered && socket.data.grupo) {
      const grupo = sala.grupos.get(socket.data.grupo);
      if (grupo) {
        conectarGrupo(socket, grupo);
        socket.emit('state:sync', partida.estadoDe(grupo));
      }
    }

    socket.on('time:ping', (_clientTime, ack) => {
      if (typeof ack === 'function') ack(Date.now());
    });

    socket.on('player:join', (datos, ack) => {
      const r = sala.unir(Number(datos?.groupId), datos?.deviceToken);
      if (!r.ok) {
        socket.emit('player:join_rejected', { reason: r.motivo });
        if (typeof ack === 'function') ack({ ok: false, reason: r.motivo });
        return;
      }
      conectarGrupo(socket, r.grupo);
      const respuesta = { groupId: r.grupo.numero, deviceToken: r.grupo.token, maxGroups: config.maxGrupos };
      socket.emit('player:joined', respuesta);
      if (typeof ack === 'function') ack({ ok: true, ...respuesta });
      if (partida.guion) socket.emit('game:script', partida.guion);
      socket.emit('state:sync', partida.estadoDe(r.grupo));
    });

    socket.on('run:progress', (datos) => {
      const grupo = sala.grupos.get(socket.data.grupo);
      if (grupo) partida.registrarProgreso(grupo, datos);
    });

    socket.on('question:answer', (datos, ack) => {
      const grupo = sala.grupos.get(socket.data.grupo);
      const r = grupo ? partida.registrarRespuesta(grupo, datos) : { ok: false, motivo: 'no_group' };
      // El ack se manda siempre: el celular deja de reintentar aunque la respuesta no valga.
      if (typeof ack === 'function') ack({ index: datos?.index, ...r });
    });

    socket.on('debug:report', (datos) => {
      informes.unshift({ ...datos, group: socket.data.grupo ?? null, receivedAt: Date.now() });
      informes.length = Math.min(informes.length, 100);
      enviar('hosts', 'debug:reports', informes);
    });

    // Pantalla del proyector. En la Fase 0 no hay clave: la sala es única.
    socket.on('host:hello', () => {
      socket.join('hosts');
      socket.emit('room:groups', sala.resumen());
      socket.emit('debug:reports', informes);
      if (partida.guion) socket.emit('game:script', partida.guion);
    });
    socket.on('host:start', (ajustes) => {
      if (socket.rooms.has('hosts')) partida.iniciar(ajustes ?? {});
    });
    socket.on('host:end', () => {
      if (!socket.rooms.has('hosts')) return;
      partida.detener();
      enviar('todos', 'game:reset', {});
    });
    socket.on('host:release_all', () => {
      if (!socket.rooms.has('hosts')) return;
      partida.detener();
      sala.liberarTodos();
      for (const s of io.sockets.sockets.values()) {
        if (s.data.grupo) {
          s.leave(`g:${s.data.grupo}`);
          delete s.data.grupo;
        }
      }
      enviar('todos', 'game:reset', { released: true });
      avisarGrupos();
    });

    socket.on('disconnect', () => {
      const grupo = sala.grupos.get(socket.data.grupo);
      // Solo se marca desconectado si no hay un socket más nuevo del mismo celular.
      if (grupo && grupo.socketId === socket.id) {
        grupo.conectado = false;
        avisarGrupos();
      }
    });
  });

  // Posiciones agregadas al host 5 veces por segundo; cada celular recibe solo su puesto, 1 vez por segundo.
  let ticks = 0;
  const intervalo = setInterval(() => {
    ticks++;
    if (partida.activa) {
      enviar('hosts', 'run:positions', partida.posiciones());
      if (ticks % 5 === 0) {
        const ranking = partida.ranking();
        ranking.forEach((g, i) => {
          if (g.conectado) enviar(g.numero, 'run:rank', { position: i + 1, total: ranking.length });
        });
      }
    }
    if (ticks % 5 === 0) {
      enviar('hosts', 'server:stats', {
        sockets: io.engine.clientsCount,
        groups: sala.grupos.size,
        connected: sala.conectados(),
        inPerSecond: metricas.entrada,
        outPerSecond: metricas.salida,
        eventLoopLagMs: Math.round(lag.mean / 1e6),
        memoryMb: Math.round(process.memoryUsage().rss / 1e6),
      });
      metricas.entrada = 0;
      metricas.salida = 0;
      lag.reset();
    }
  }, 200);

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
  app.get('/api/informes', (_req, res) => res.json(informes));

  const produccion = process.env.NODE_ENV === 'production';
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
    partida,
    sala,
    raiz: RAIZ,
    async cerrar() {
      clearInterval(intervalo);
      partida.detener();
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.env.PORT) || 3000;
  const servidor = await iniciarServidor({ puerto, host: '0.0.0.0' });
  console.log(`\n  Drop Rush (Fase 0) en marcha`);
  console.log(`  Celular:   http://localhost:${servidor.puerto}/play/`);
  console.log(`  Proyector: http://localhost:${servidor.puerto}/host/`);
  for (const ip of direccionesLocales()) console.log(`  En la red: http://${ip}:${servidor.puerto}/play/`);
  console.log('');
}
