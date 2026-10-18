import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const ruta = (p) => fileURLToPath(new URL(p, import.meta.url));

// Se comprimen al compilar (no en cada pedido): el servidor manda la versión .br o .gz según el
// navegador (sección 5.5). Las fuentes woff2 y las imágenes ya vienen comprimidas.
const COMPRIMIBLES = /\.(js|css|html|svg|json|webmanifest|txt)$/;

function comprimir() {
  return {
    name: 'drop-rush-comprimir',
    apply: 'build',
    closeBundle() {
      const recorrer = (dir) => {
        for (const nombre of readdirSync(dir)) {
          const archivo = join(dir, nombre);
          if (statSync(archivo).isDirectory()) recorrer(archivo);
          else if (COMPRIMIBLES.test(nombre)) {
            const datos = readFileSync(archivo);
            if (datos.length < 1024) continue;
            writeFileSync(`${archivo}.br`, brotliCompressSync(datos, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
            writeFileSync(`${archivo}.gz`, gzipSync(datos, { level: 9 }));
          }
        }
      };
      recorrer(ruta('./dist'));
    },
  };
}

export default defineConfig({
  root: ruta('./public'),
  base: '/',
  // Archivos que se sirven tal cual en la raíz (el Service Worker tiene que estar en /sw.js).
  publicDir: ruta('./estaticos'),
  server: {
    // El design system vive fuera de juego/ y se comparte con la presentación.
    fs: { allow: [ruta('..')] },
  },
  plugins: [comprimir()],
  build: {
    outDir: ruta('./dist'),
    emptyOutDir: true,
    target: 'es2020',
    // Three.js solo ya pesa ~500 kB sin comprimir (~140 kB con gzip): es esperado.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        play: ruta('./public/play/index.html'),
        host: ruta('./public/host/index.html'),
        modelos: ruta('./public/dev/models/index.html'),
      },
    },
  },
});
