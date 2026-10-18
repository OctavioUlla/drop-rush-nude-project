// PDFs para enviar a la cátedra antes de la presentación (issue #61):
// - docs/presentacion-nude-project.pdf: todas las diapositivas, una por página (el PDF de respaldo de ?imprimir,
//   sobre las imágenes de renders/).
// - docs/guion-nude-project.pdf: el guion de los oradores (presentacion/GUION.md), con la identidad del design system.
// Uso: npm run pdf:presentacion (necesita Playwright: npx playwright install chromium la primera vez).
// Si cambian las diapositivas o el guion, volver a correrlo; si cambió la escena, antes npm run renders:presentacion.
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Falta Playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

// Servidor estático mínimo desde la raíz del repositorio (la presentación importa ../design-system).
// /guion.html es el guion convertido a HTML.
const servidor = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/guion.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(paginaGuion());
    return;
  }
  const ruta = normalize(join(raiz, decodeURIComponent(pathname)));
  let archivo = ruta.startsWith(raiz) ? ruta : null;
  try { if (archivo && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html'); statSync(archivo); } catch { archivo = null; }
  if (!archivo) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': tipos[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
}).listen(0);
const base = `http://localhost:${servidor.address().port}`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
pagina.on('pageerror', (e) => console.error(e));

// ---------- Diapositivas ----------
// ?imprimir no carga la escena 3D: cada diapositiva va sobre la imagen de su encuadre, sin QR ni interfaz en vivo.
await pagina.goto(`${base}/presentacion/?imprimir`);
await pagina.waitForFunction(() => window.deckListo);
await pagina.evaluate(async () => {
  await document.fonts.ready;
  // Las imágenes de fondo (--respaldo) se piden recién al pintarse: se precargan para que ninguna página salga vacía.
  const urls = new Set([...document.querySelectorAll('section[data-escena]')].map((s) => getComputedStyle(s).backgroundImage.match(/url\("?(.+?)"?\)/)?.[1]).filter(Boolean));
  await Promise.all([...urls].map((url) => new Promise((listo) => { const img = new Image(); img.onload = img.onerror = listo; img.src = url; })));
});
const diapositivas = await pagina.locator('section[data-escena]').count();
await pagina.pdf({ path: join(raiz, 'docs/presentacion-nude-project.pdf'), preferCSSPageSize: true, printBackground: true });
console.log(`✔ docs/presentacion-nude-project.pdf (${diapositivas} diapositivas)`);

// ---------- Guion ----------
await pagina.goto(`${base}/guion.html`);
await pagina.evaluate(() => document.fonts.ready);
await pagina.pdf({
  path: join(raiz, 'docs/guion-nude-project.pdf'), format: 'A4', printBackground: true,
  margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' },
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="width: 100%; padding: 0 18mm; font: 8px Arial, sans-serif; color: #6e4a40; display: flex; justify-content: space-between;"><span>Nude Project · Guion de la presentación</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
console.log('✔ docs/guion-nude-project.pdf');

await navegador.close();
servidor.close();

/** GUION.md en una página HTML para imprimir. Se deja afuera la sección de pendientes (es interna del equipo). */
function paginaGuion() {
  const md = readFileSync(join(raiz, 'presentacion/GUION.md'), 'utf8').replace(/\n## Pendientes\n[\s\S]*$/, '\n');
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Guion · Nude Project</title>
  <link rel="stylesheet" href="/design-system/tokens.css">
  <style>
    body { margin: 0; font: 10.5pt/1.5 var(--np-fuente-texto); color: var(--np-marca-cacao); background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    h1, h2, h3 { font-family: var(--np-fuente-display); letter-spacing: -0.02em; line-height: 1.1; break-after: avoid; }
    h1 { font-size: 26pt; margin: 0 0 4mm; }
    h2 { font-size: 15pt; margin: 9mm 0 2mm; padding-top: 3mm; border-top: 2px solid var(--np-marca-cacao); }
    p, li { orphans: 3; widows: 3; }
    p { margin: 0 0 2.5mm; }
    .orador { display: inline-block; margin: 0 0 2mm; padding: 0.6mm 2.5mm; background: var(--np-marca-cacao); color: var(--np-marca-crema); font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; break-after: avoid; }
    h2 + p, .orador + p { break-before: avoid; }
    .escena { color: var(--np-marca-cacao-suave); font-size: 9pt; font-style: italic; }
    blockquote { margin: 0 0 4mm; padding: 3mm 4mm; background: var(--np-marca-crema); border-left: 3px solid var(--np-acento-mostaza); }
    blockquote p, blockquote ul { margin: 0 0 1.5mm; }
    ul { margin: 0 0 3mm; padding-left: 5mm; }
    table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9pt; break-inside: avoid; }
    th, td { text-align: left; vertical-align: top; padding: 1.4mm 2mm; border-bottom: 1px solid #e9dccb; }
    th { background: var(--np-marca-cacao); color: var(--np-marca-crema); font-weight: 700; }
    code { font: 0.9em var(--np-fuente-mono); padding: 0 0.8mm; background: var(--np-marca-crema); border: 1px solid #e9dccb; border-radius: 1mm; }
    a { color: inherit; }
    hr { display: none; }
  </style>
</head>
<body>
${markdown(md)}
</body>
</html>`;
}

/** Markdown mínimo del guion: títulos, párrafos, citas, listas, tablas y formato en línea. */
function markdown(texto) {
  const bloques = texto.trim().split(/\n{2,}/);
  return bloques.map((b) => {
    const lineas = b.split('\n');
    if (/^#{1,6} /.test(b)) {
      const nivel = b.match(/^#+/)[0].length;
      return `<h${nivel}>${enLinea(b.replace(/^#+ /, ''))}</h${nivel}>`;
    }
    if (b === '---') return '<hr>';
    if (b.startsWith('> ')) return `<blockquote>${markdown(lineas.map((l) => l.replace(/^> ?/, '')).join('\n').replace(/\n(?=- )/, '\n\n'))}</blockquote>`;
    if (lineas.every((l) => l.startsWith('|'))) {
      const celdas = (l) => l.slice(1, -1).split('|').map((c) => enLinea(c.trim()));
      const [cabecera, , ...filas] = lineas;
      return `<table><thead><tr>${celdas(cabecera).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${celdas(f).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (b.startsWith('- ')) {
      // Ítems con sub-ítems indentados con dos espacios.
      const items = b.split(/\n(?=- )/).map((item) => {
        const [primera, ...sub] = item.slice(2).split(/\n {2}- /);
        return `<li>${enLinea(primera)}${sub.length ? `<ul>${sub.map((s) => `<li>${enLinea(s)}</li>`).join('')}</ul>` : ''}</li>`;
      });
      return `<ul>${items.join('')}</ul>`;
    }
    if (/^\*\*Orador [A-E]\*\*$/.test(b)) return `<p class="orador">${b.replaceAll('*', '')}</p>`;
    // Indicaciones de escena: párrafo entero entre *[ ]*.
    if (/^\*\[[^\]]*\]\*$/.test(b)) return `<p class="escena">${enLinea(b.slice(1, -1))}</p>`;
    return `<p>${enLinea(b).replace(/\n/g, ' ')}</p>`;
  }).join('\n');
}

function enLinea(t) {
  return t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Los enlaces relativos (a otros archivos del repositorio) no sirven en el PDF: queda solo el texto.
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    // Indicaciones de escena dentro de un párrafo: *[ ... ]*.
    .replace(/\*(\[[^\]]*\])\*/g, '<span class="escena">$1</span>')
    .replace(/\*([^*\s][^*]*?)\*/g, '<i>$1</i>');
}
