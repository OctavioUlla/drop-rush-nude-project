import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * ¿Este módulo se ejecutó directo con `node archivo.js`?
 * En Windows la ruta de process.argv[1] puede venir con otra mayúscula en la unidad
 * (c:\ vs C:\) o por un enlace, así que se comparan rutas reales y sin distinguir mayúsculas.
 */
export function esPrincipal(urlDelModulo) {
  if (!process.argv[1]) return false;
  const normalizar = (ruta) => {
    let real = ruta;
    try {
      real = realpathSync(ruta);
    } catch {
      /* se usa la ruta tal cual */
    }
    return process.platform === 'win32' ? real.toLowerCase() : real;
  };
  return normalizar(process.argv[1]) === normalizar(fileURLToPath(urlDelModulo));
}
