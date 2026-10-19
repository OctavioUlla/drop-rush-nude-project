import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

// Juego en la notebook + Cloudflare Tunnel (sección Deploy del README): levanta el servidor en modo producción,
// abre un túnel rápido de Cloudflare (https://….trycloudflare.com, gratis y sin cuenta) y muestra sus direcciones.
// El proyector y la presentación se abren con esa dirección: así el QR apunta al túnel y los celulares entran por
// Wi-Fi o por datos. La dirección cambia cada vez que se corre: no hace falta anotarla, el QR la toma solo.
//
//   npm run tunel                          (compila si falta dist/ o si el código cambió; no abre el navegador)
//   npm run tunel -- --abrir host          (además abre /host/; --abrir presentacion abre /presentacion/)
//   npm run tunel -- --build --puerto 3001 (compila igual y usa otro puerto)

const { values: op } = parseArgs({
  options: {
    puerto: { type: 'string', default: '3000' },
    abrir: { type: 'string', default: 'no' }, // no | host | presentacion
    build: { type: 'boolean', default: false },
  },
});

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const puerto = Number(op.puerto);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const hijos = [];

function salir(codigo = 0) {
  for (const h of hijos) if (h.exitCode === null) h.kill();
  process.exit(codigo);
}
process.on('SIGINT', () => salir(0));
process.on('SIGTERM', () => salir(0));

// 1. cloudflared instalado.
if (spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).error) {
  console.error('\n  Falta cloudflared. Instalarlo y volver a abrir la terminal:');
  console.error('    Windows: winget install --id Cloudflare.cloudflared');
  console.error('    macOS:   brew install cloudflared');
  console.error('    Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n');
  process.exit(1);
}

// 2. Build (el modo producción sirve dist/). Se recompila si falta o si el código es más nuevo: si no, después de un
// pull los celulares reciben el juego viejo (pasó con la foto del grupo, #42).
/** Fecha de modificación más nueva de un archivo o carpeta (recorriéndola), 0 si no existe. */
function masNuevo(ruta) {
  if (!existsSync(ruta)) return 0;
  const info = statSync(ruta);
  if (!info.isDirectory()) return info.mtimeMs;
  return Math.max(0, ...readdirSync(ruta).map((nombre) => masNuevo(join(ruta, nombre))));
}
const compilado = masNuevo(`${RAIZ}dist/play/index.html`);
const fuentes = ['public', 'estaticos', 'vite.config.js', 'package-lock.json', '../design-system'].map((p) => masNuevo(join(RAIZ, p)));
if (op.build || !compilado || Math.max(...fuentes) > compilado) {
  console.log(compilado ? '  El código cambió desde la última compilación: compilando el juego…' : '  Compilando el juego…');
  const r = spawnSync('npm', ['run', 'build'], { cwd: RAIZ, stdio: 'inherit', shell: true });
  if (r.status !== 0) salir(1);
}

// 3. Servidor. Si se cae con el túnel ya abierto, se vuelve a levantar en el mismo puerto: la dirección del túnel (y el
// QR) no cambia. La sala vive en memoria y se pierde: el proyector y la presentación crean otra solos al reconectarse
// y los celulares piden el código nuevo.
let tunelAbierto = false;
function levantarServidor() {
  const servidor = spawn(process.execPath, ['server/index.js', '--produccion'], {
    cwd: RAIZ,
    env: { ...process.env, PORT: String(puerto) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  hijos.push(servidor);
  servidor.on('exit', (c) => {
    if (!tunelAbierto) {
      console.error(`\n  El servidor se cerró (código ${c}).`);
      salir(1);
    }
    console.error(`\n  El servidor se cerró (código ${c}): se vuelve a levantar con la misma dirección.`);
    console.error('  La sala se perdió: el proyector muestra un código nuevo y los celulares lo escriben.');
    setTimeout(levantarServidor, 1000);
  });
  return new Promise((resolve) => {
    servidor.stdout.on('data', function listo(d) {
      if (String(d).includes('Drop Rush en marcha')) {
        servidor.stdout.off('data', listo);
        servidor.stdout.pipe(process.stdout);
        resolve();
      }
    });
  });
}
await levantarServidor();

// 4. Túnel. cloudflared escribe la dirección en stderr.
const tunel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${puerto}`, '--no-autoupdate'], {
  stdio: ['ignore', 'ignore', 'pipe'],
});
hijos.push(tunel);
tunel.on('exit', (c) => {
  console.error(`\n  El túnel se cerró (código ${c}). ¿La red bloquea el puerto 7844? Probar con los datos del celular.`);
  salir(1);
});
let registro = '';
const url = await new Promise((resolve, reject) => {
  const limite = setTimeout(() => reject(new Error('cloudflared no dio una dirección en 60 s')), 60_000);
  tunel.stderr.on('data', function leer(d) {
    registro += d;
    const m = registro.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) {
      clearTimeout(limite);
      tunel.stderr.off('data', leer);
      resolve(m[0]);
    }
  });
}).catch((e) => {
  console.error(`\n  ${e.message}\n${registro}`);
  salir(1);
});
// Errores del túnel (cortes, reconexiones) a la vista; el resto del registro de cloudflared, no.
tunel.stderr.on('data', (d) => {
  for (const linea of String(d).split('\n')) if (/\bERR\b/.test(linea)) console.error(`  [túnel] ${linea.trim()}`);
});

// 5. Esperar a que la dirección responda (el DNS del túnel tarda unos segundos).
process.stdout.write('  Esperando el túnel');
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) })).ok) break;
  } catch {}
  if (i === 30) {
    console.error(`\n  ${url} no responde. Revisar la conexión de la notebook.`);
    salir(1);
  }
  process.stdout.write('.');
  await espera(2000);
}

tunelAbierto = true;
console.log(`\n\n  Túnel listo: ${url}`);
console.log(`  Proyector:    ${url}/host/`);
console.log(`  Presentación: ${url}/presentacion/`);
console.log(`  Celulares:    ${url}/play/   (o el QR del proyector)`);
console.log('\n  Abrir el proyector y la presentación con esta dirección, no con localhost, para que el QR apunte al túnel.');
console.log('  Ctrl+C cierra el servidor y el túnel.\n');

// 6. Abrir el navegador.
if (op.abrir !== 'no') {
  const destino = `${url}/${op.abrir === 'presentacion' ? 'presentacion' : 'host'}/`;
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', destino]]
    : process.platform === 'darwin' ? ['open', [destino]]
    : ['xdg-open', [destino]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}
