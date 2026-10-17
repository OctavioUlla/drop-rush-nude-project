import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const ruta = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: ruta('./public'),
  base: '/',
  server: {
    // El design system vive fuera de juego/ y se comparte con la presentación.
    fs: { allow: [ruta('..')] },
  },
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
      },
    },
  },
});
