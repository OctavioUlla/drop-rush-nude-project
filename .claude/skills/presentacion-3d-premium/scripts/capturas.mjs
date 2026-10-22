#!/usr/bin/env node
// Captura cada diapositiva de una presentación (con la escena asentada) para revisarlas como imágenes.
//   node capturas.mjs <presentacion.html | carpeta-del-proyecto> [carpeta-de-salida] [--ancho 1600]
// - Un .html empaquetado se abre directo (file://). Una carpeta se sirve por HTTP en un puerto libre
//   (los módulos ES no cargan desde file:// si no están empaquetados).
// - Escribe NN.png por diapositiva y muestra los errores de la consola. Sale con código 1 si hubo errores.
// Necesita Playwright (global o local). Si el Chromium de Playwright no está, usa CHROMIUM_PATH o /opt/pw-browsers.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { resolve, join, extname, dirname, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const ancho = Number(opcion('--ancho', 1600));
const [entrada, salidaArg] = args;
if (!entrada) { console.error('Uso: node capturas.mjs <presentacion.html | carpeta> [salida] [--ancho 1600]'); process.exit(1); }

async function cargarPlaywright() {
  try { return await import('playwright'); } catch {}
  const global = execSync('npm root -g').toString().trim();
  const require = createRequire(join(global, 'noop.js'));
  return require('playwright');
}
const { chromium } = await cargarPlaywright();

const ruta = resolve(entrada);
const esCarpeta = statSync(ruta).isDirectory();
const salida = resolve(salidaArg ?? join(esCarpeta ? ruta : dirname(ruta), 'capturas'));
mkdirSync(salida, { recursive: true });

let servidor, url;
if (esCarpeta) {
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4' };
  servidor = createServer((req, res) => {
    const p = join(ruta, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const f = existsSync(p) && statSync(p).isDirectory() ? join(p, 'index.html') : p;
    if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': tipos[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  }).listen(0);
  url = `http://localhost:${servidor.address().port}/index.html`;
} else url = pathToFileURL(ruta).href;

const lanzar = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
let navegador;
try { navegador = await chromium.launch(lanzar); } catch {
  const candidatos = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const base of ['/opt/pw-browsers']) if (existsSync(base)) for (const d of readdirSync(base)) if (d.startsWith('chromium-')) candidatos.push(join(base, d, 'chrome-linux', 'chrome'));
  const exe = candidatos.find((c) => existsSync(c) && statSync(c).isFile());
  navegador = await chromium.launch({ ...lanzar, executablePath: exe });
}
const pagina = await navegador.newPage({ viewport: { width: ancho, height: Math.round((ancho * 9) / 16) } });
const errores = [];
pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(`[${m.type()}] ${m.text()}`); });
pagina.on('pageerror', (e) => errores.push(`[excepción] ${e.message}`));

await pagina.goto(`${url}?capturar`);
await pagina.waitForFunction(() => window.presentacionLista === true, null, { timeout: 120000 });
await pagina.waitForTimeout(1500); // el telón del cargador
const sinWebgl = await pagina.evaluate(() => document.documentElement.hasAttribute('data-sin-webgl'));
const total = await pagina.evaluate(() => window.deck.total);
for (let i = 0; i < total; i++) {
  await pagina.evaluate((n) => window.deck.saltar(n), i);
  // Que terminen el texto que sube, los fundidos y las etiquetas (con tope, por si hay animaciones infinitas).
  await pagina.waitForTimeout(700);
  await pagina.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, 4000)),
  ]));
  await pagina.waitForTimeout(400);
  const archivo = join(salida, `${String(i).padStart(2, '0')}.png`);
  await pagina.screenshot({ path: archivo });
  console.log(`diapositiva ${i} → ${archivo}`);
}
await navegador.close();
servidor?.close();
if (sinWebgl) console.warn('Atención: el navegador de prueba no tuvo WebGL; las capturas no muestran la escena 3D.');
if (errores.length) {
  console.error(`\nConsola (${errores.length}):`);
  for (const e of [...new Set(errores)]) console.error(`  ${e}`);
  process.exitCode = 1;
} else console.log(`\n${total} diapositivas, sin errores en la consola. (${basename(salida)}/)`);
