// Guarda three.js dentro de presentacion/vendor/ para que la presentación funcione sin internet
// (PLANIFICACION de la presentación, sección 3.4). Usa la misma versión que el juego.
// Uso: npm run vendor:presentacion (después de actualizar three en package.json)
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'rolldown';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const three = join(raiz, 'juego/node_modules/three');
const destino = join(raiz, 'presentacion/vendor');
// Complementos que usa la escena (design-system/escena/): importan 'three' y lo resuelve el import map.
const COMPLEMENTOS = ['environments/RoomEnvironment.js', 'geometries/RoundedBoxGeometry.js'];

const { version } = JSON.parse(readFileSync(join(three, 'package.json'), 'utf8'));
rmSync(destino, { recursive: true, force: true });

// three.module.js + three.core.js en un solo archivo minificado.
const entrada = join(destino, '.entrada.js');
mkdirSync(destino, { recursive: true });
writeFileSync(entrada, `export * from ${JSON.stringify(join(three, 'build/three.module.js').replaceAll('\\', '/'))};\n`);
await build({
  input: entrada,
  output: { file: join(destino, 'three.module.min.js'), format: 'esm', minify: true },
  logLevel: 'warn',
});
rmSync(entrada);

for (const c of COMPLEMENTOS) {
  mkdirSync(dirname(join(destino, 'addons', c)), { recursive: true });
  copyFileSync(join(three, 'examples/jsm', c), join(destino, 'addons', c));
}
copyFileSync(join(three, 'LICENSE'), join(destino, 'LICENSE-three.txt'));
console.log(`three ${version} guardado en presentacion/vendor/`);
