#!/usr/bin/env node
// Empaqueta la carpeta de una presentación en UN SOLO archivo HTML que funciona sin servidor y sin internet.
//   node empaquetar.mjs <carpeta-del-proyecto> [salida.html]
// - <link rel="stylesheet" href="…"> locales → <style> en línea.
// - url(…) de los CSS (fuentes, imágenes) → data: URI.
// - Cada módulo del importmap (three, addons, motor, tema, deck) → data: URI de JavaScript. Los módulos se importan
//   entre sí por nombre (bare specifiers), así que siguen funcionando dentro del data: URI.
// - Rutas relativas a archivos existentes dentro de strings JS ('media/foto.jpg') y en src="…" del HTML → data: URI.
// Al final avisa si queda alguna referencia local sin resolver.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';

const [, , carpetaArg, salidaArg] = process.argv;
if (!carpetaArg) {
  console.error('Uso: node empaquetar.mjs <carpeta-del-proyecto> [salida.html]');
  process.exit(1);
}
const carpeta = resolve(carpetaArg);
const salida = resolve(salidaArg ?? join(carpeta, '..', `${carpeta.split(/[\\/]/).pop()}.html`));

const tipos = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream',
};
const esLocal = (ref) => ref && !/^(?:[a-z]+:|\/\/|#|%23|data:)/i.test(ref);
const archivo = (base, ref) => {
  const ruta = resolve(base, decodeURI(ref.split(/[?#]/)[0]));
  return existsSync(ruta) && statSync(ruta).isFile() ? ruta : null;
};
const dataUri = (ruta) => `data:${tipos[extname(ruta).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(ruta).toString('base64')}`;
const pendientes = [];

/** url(…) de un CSS → data: URI. */
function cssEnLinea(texto, base) {
  return texto.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (todo, comilla, ref) => {
    if (!esLocal(ref)) return todo;
    const ruta = archivo(base, ref);
    if (!ruta) { pendientes.push(`CSS: ${ref}`); return todo; }
    return `url("${dataUri(ruta)}")`;
  });
}
/** Strings JS con rutas relativas a archivos que existen (texturas, fotos, videos) → data: URI. */
function jsEnLinea(texto, base) {
  return texto.replace(/(['"`])((?:\.\.?\/)?[\w\-./ ]+\.(?:png|jpe?g|webp|avif|gif|svg|mp4|webm|mp3|glb|hdr|json|woff2?))\1/gi, (todo, comilla, ref) => {
    const ruta = archivo(base, ref) ?? archivo(carpeta, ref);
    return ruta ? `${comilla}${dataUri(ruta)}${comilla}` : todo;
  });
}

let html = readFileSync(join(carpeta, 'index.html'), 'utf8');

// Hojas de estilo locales.
html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (etiqueta) => {
  const href = etiqueta.match(/href=["']([^"']+)["']/i)?.[1];
  if (!esLocal(href)) return etiqueta;
  const ruta = archivo(carpeta, href);
  if (!ruta) { pendientes.push(`CSS: ${href}`); return etiqueta; }
  return `<style>\n${cssEnLinea(readFileSync(ruta, 'utf8'), dirname(ruta))}\n</style>`;
});
// <style> en línea del propio HTML (la paleta puede traer url() de fuentes).
html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (todo, a, cuerpo, c) => a + cssEnLinea(cuerpo, carpeta) + c);

// Importmap: cada módulo local → data: URI.
html = html.replace(/(<script\b[^>]*type=["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/i, (todo, a, cuerpo, c) => {
  const mapa = JSON.parse(cuerpo);
  for (const [nombre, ref] of Object.entries(mapa.imports ?? {})) {
    if (!esLocal(ref)) continue;
    const ruta = archivo(carpeta, ref);
    if (!ruta) { pendientes.push(`módulo ${nombre}: ${ref}`); continue; }
    const codigo = jsEnLinea(readFileSync(ruta, 'utf8'), dirname(ruta));
    const relativos = codigo.match(/\bfrom\s*["']\.{1,2}\/[^"']+["']|\bimport\s*\(\s*["']\.{1,2}\//g);
    if (relativos) pendientes.push(`módulo ${nombre} importa por ruta relativa (usar el nombre del importmap): ${relativos[0]}`);
    mapa.imports[nombre] = `data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`;
  }
  return `${a}\n${JSON.stringify(mapa)}\n${c}`;
});

// Scripts clásicos o módulos con src local.
html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, (todo, a, src, b) => {
  if (!esLocal(src)) return todo;
  const ruta = archivo(carpeta, src);
  if (!ruta) { pendientes.push(`script: ${src}`); return todo; }
  return `<script${a}${b}>\n${jsEnLinea(readFileSync(ruta, 'utf8'), dirname(ruta)).replace(/<\/script/gi, '<\\/script')}\n</script>`;
});

// src/poster de imágenes, videos y audio.
html = html.replace(/\b(src|poster)=["']([^"']+)["']/gi, (todo, attr, ref) => {
  if (!esLocal(ref)) return todo;
  const ruta = archivo(carpeta, ref);
  if (!ruta) { pendientes.push(`${attr}: ${ref}`); return todo; }
  return `${attr}="${dataUri(ruta)}"`;
});
// style="…url(…)…" en línea.
html = html.replace(/style="([^"]*url\([^"]*)"/gi, (todo, estilo) => `style="${cssEnLinea(estilo.replace(/&quot;/g, '"'), carpeta).replace(/"/g, '&quot;')}"`);

writeFileSync(salida, html);
const mb = (statSync(salida).size / 1024 / 1024).toFixed(2);
console.log(`Listo: ${salida} (${mb} MB)`);
if (Number(mb) > 15) console.warn('Atención: pesa más de 15 MB. Comprimir fotos/videos (webp, mp4 de menor bitrate) antes de empaquetar.');
if (pendientes.length) {
  console.warn('Referencias locales sin resolver (el HTML final no las va a encontrar):');
  for (const p of pendientes) console.warn(`  - ${p}`);
  process.exitCode = 2;
}
