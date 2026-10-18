// Genera tokens.css y tokens.js a partir de tokens.json (la única fuente de verdad).
// Uso: node design-system/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(dir, 'tokens.json'), 'utf8'));
const aviso = 'ARCHIVO GENERADO por build.mjs a partir de tokens.json. No editar a mano.';

// ---------- tokens.css ----------
const vars = [];
for (const [grupo, colores] of Object.entries(t.color)) {
  for (const [nombre, { valor }] of Object.entries(colores)) {
    vars.push(`  --np-${grupo}-${nombre}: ${valor};`);
  }
}
for (const g of t.grupos) {
  vars.push(`  --np-grupo-${g.grupo}: ${g.color};`, `  --np-grupo-${g.grupo}-texto: ${g.texto};`);
}
const tipo = t.tipografia;
for (const [k, v] of Object.entries(tipo.familia)) vars.push(`  --np-fuente-${k}: ${v};`);
for (const [k, v] of Object.entries(tipo.peso)) vars.push(`  --np-peso-${k}: ${v};`);
for (const [k, v] of Object.entries(tipo.tamano)) vars.push(`  --np-texto-${k}: ${v};`);
for (const [k, v] of Object.entries(tipo.interletra)) vars.push(`  --np-interletra-${k}: ${v};`);
for (const [k, v] of Object.entries(tipo.interlinea)) vars.push(`  --np-interlinea-${k}: ${v};`);
for (const [k, v] of Object.entries(t.espacio)) vars.push(`  --np-espacio-${k}: ${v};`);
for (const [k, v] of Object.entries(t.radio)) vars.push(`  --np-radio-${k}: ${v};`);
for (const [k, v] of Object.entries(t.borde)) vars.push(`  --np-borde-${k}: ${v};`);
for (const [k, v] of Object.entries(t.sombra)) vars.push(`  --np-sombra-${k}: ${v};`);
for (const [k, v] of Object.entries(t.movimiento)) vars.push(`  --np-movimiento-${k}: ${v};`);

// Escena 3D de la presentación: colorway de cada bloque y lo que también usa el CSS.
const valorDe = (ref) => ref.split('.').reduce((o, k) => o[k], t.color).valor;
const esc = t.escena;
for (const c of esc.colorways) vars.push(`  --np-colorway-${c.bloque}: var(--np-${c.color.replace('.', '-')});`);
vars.push(
  `  --np-escena-grano-opacidad: ${esc.grano.opacidad};`,
  `  --np-escena-vineta-opacidad: ${esc.vineta.opacidad};`,
  `  --np-escena-columnas-texto: ${esc.layout['columnas-texto']};`,
  `  --np-escena-columnas-escena: ${esc.layout['columnas-escena']};`,
);

const css = `/* ${aviso} */

@font-face {
  font-family: 'Inter Tight';
  src: url('./fonts/InterTight-latin.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('./fonts/Inter-latin.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

:root {
${vars.join('\n')}

  /* Roles semánticos: tema crema (por defecto) */
  --np-fondo: var(--np-marca-crema);
  --np-fondo-alterno: var(--np-marca-arena);
  --np-superficie: var(--np-marca-blanco);
  --np-tinta: var(--np-marca-cacao);
  --np-tinta-suave: var(--np-marca-cacao-suave);
  --np-linea: var(--np-marca-piedra);
  --np-invertido-fondo: var(--np-marca-cacao);
  --np-invertido-tinta: var(--np-marca-crema);
}

/* Tema crema explícito: para volver a crema dentro de algo en cacao (miniaturas del modo presentador) */
[data-np-tema="crema"] {
  --np-fondo: var(--np-marca-crema);
  --np-fondo-alterno: var(--np-marca-arena);
  --np-superficie: var(--np-marca-blanco);
  --np-tinta: var(--np-marca-cacao);
  --np-tinta-suave: var(--np-marca-cacao-suave);
  --np-linea: var(--np-marca-piedra);
  --np-invertido-fondo: var(--np-marca-cacao);
  --np-invertido-tinta: var(--np-marca-crema);
}

/* Tema cacao: portadas, separadores de sección y pantalla del host */
[data-np-tema="cacao"] {
  --np-fondo: var(--np-marca-cacao);
  --np-fondo-alterno: var(--np-marca-cacao-profundo);
  --np-superficie: #573429;
  --np-tinta: var(--np-marca-crema);
  --np-tinta-suave: #d9c6b8;
  --np-linea: #6e4a40;
  --np-invertido-fondo: var(--np-marca-crema);
  --np-invertido-tinta: var(--np-marca-cacao);
}
`;
writeFileSync(join(dir, 'tokens.css'), css);

// ---------- tokens.js ----------
// Además de los strings CSS, exporta los colores como números (0x482922) para Three.js.
const hex = (s) => Number.parseInt(s.slice(1), 16);
const colores = {};
const colores3d = {};
for (const [grupo, lista] of Object.entries(t.color)) {
  colores[grupo] = {};
  colores3d[grupo] = {};
  for (const [nombre, { valor }] of Object.entries(lista)) {
    colores[grupo][nombre] = valor;
    colores3d[grupo][nombre] = hex(valor);
  }
}
const grupos = t.grupos.map((g) => ({ ...g, color3d: hex(g.color) }));
const colorways = esc.colorways.map((c) => ({ ...c, valor: valorDe(c.color), color3d: hex(valorDe(c.color)) }));
const { $descripcion, color, grupos: _g, ...resto } = t;

const js = `// ${aviso}
export const colores = ${JSON.stringify(colores, null, 2)};

/** Mismos colores como números, listos para THREE.Color o colores por vértice. */
export const colores3d = ${JSON.stringify(colores3d, null, 2)};

/** Color de cada grupo (1 a 40) y el color de texto que contrasta encima. */
export const grupos = ${JSON.stringify(grupos)};

export const colorDeGrupo = (n) => grupos[(n - 1) % grupos.length];

/** Colorway de la sudadera en cada bloque de la presentación (0 a 8), con su estudio crema o cacao. */
export const colorways = ${JSON.stringify(colorways)};

export const colorwayDeBloque = (n) => colorways.find((c) => c.bloque === n);

/** Duración de un token de movimiento en segundos, para GSAP: segundos('escena') → 0.8 */
export const segundos = (nombre) => Number.parseFloat(tokens.movimiento[nombre]) / (tokens.movimiento[nombre].endsWith('ms') ? 1000 : 1);

export const tokens = ${JSON.stringify(resto, null, 2)};
`;
writeFileSync(join(dir, 'tokens.js'), js);

console.log('tokens.css y tokens.js generados.');
