// Imágenes pre-renderizadas de cada encuadre de la presentación (PLANIFICACION de la presentación, sección 3.4):
// se ven si la notebook no tiene WebGL, en el PDF de respaldo (?imprimir) y como miniaturas del modo presentador.
// Abre la presentación con ?render (solo la escena y sus etiquetas, sin texto ni interfaz), deja que se asiente cada
// estación y guarda presentacion/renders/<escena>[-<pose>].jpg a 1920×1080.
// Uso: npm run renders:presentacion (necesita Playwright: npx playwright install chromium la primera vez).
import { createReadStream, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const destino = join(raiz, 'presentacion/renders');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Falta Playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

// Servidor estático mínimo desde la raíz del repositorio (la presentación importa ../design-system).
const servidor = createServer((req, res) => {
  const ruta = normalize(join(raiz, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  let archivo = ruta.startsWith(raiz) ? ruta : null;
  try { if (archivo && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html'); statSync(archivo); } catch { archivo = null; }
  if (!archivo) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': tipos[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
}).listen(0);
const base = `http://localhost:${servidor.address().port}/presentacion/`;

mkdirSync(destino, { recursive: true });
const navegador = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
pagina.on('pageerror', (e) => console.error(e));

// Una imagen por encuadre: las diapositivas seguidas con la misma escena y pose comparten imagen.
await pagina.goto(`${base}?render`);
await pagina.waitForFunction(() => window.deckListo);
const encuadres = await pagina.evaluate(() => {
  const vistos = new Map();
  document.querySelectorAll('section[data-escena]').forEach((s, i) => {
    const nombre = s.dataset.escena + (s.dataset.pose ? `-${s.dataset.pose}` : '');
    if (!vistos.has(nombre)) vistos.set(nombre, i);
  });
  return [...vistos];
});

for (const [nombre, diapositiva] of encuadres) {
  await pagina.goto(`${base}?render&escala=1&n=${diapositiva}#${diapositiva}`);
  await pagina.waitForFunction(() => document.getElementById('cargador')?.classList.contains('np-cargador--listo'), null, { timeout: 120000 });
  await pagina.waitForTimeout(500); // arranca la caída de la sudadera
  // La escena se adelanta sin esperar: cámara, prenda, contadores y feeds quedan asentados.
  await pagina.evaluate(() => { window.motor.depuracion.pausar(true); window.motor.adelantar(7); });
  await pagina.waitForTimeout(2200); // entran las etiquetas
  await pagina.locator('#escenario').screenshot({ path: join(destino, `${nombre}.jpg`), type: 'jpeg', quality: 84 });
  console.log(`✔ renders/${nombre}.jpg`);
}

await navegador.close();
servidor.close();
