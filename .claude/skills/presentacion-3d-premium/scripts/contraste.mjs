#!/usr/bin/env node
// Mide el contraste (WCAG) de los pares de color que importan en la presentación, leyendo la paleta de index.html.
//   node contraste.mjs <carpeta-del-proyecto | index.html>
// Texto principal ≥ 7:1 (proyector), secundario ≥ 4,5:1. Sale con código 1 si algún par no llega.
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const entrada = resolve(process.argv[2] ?? '.');
const html = readFileSync(statSync(entrada).isDirectory() ? join(entrada, 'index.html') : entrada, 'utf8');
const bloque = html.match(/<style id="paleta">([\s\S]*?)<\/style>/)?.[1] ?? html;
const vars = Object.fromEntries([...bloque.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{3,8})\b/gi)].map(([, k, v]) => [k, v]));

const rgb = (hex) => {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255);
};
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const pares = [
  ['--oscuro', '--estudio-claro', 7, 'texto principal sobre el estudio claro'],
  ['--claro', '--estudio-oscuro', 7, 'texto principal sobre el estudio oscuro'],
  ['--oscuro-suave', '--estudio-claro', 4.5, 'texto secundario sobre claro'],
  ['--claro-suave', '--estudio-oscuro', 4.5, 'texto secundario sobre oscuro'],
  ['--oscuro', '--claro', 7, 'etiquetas flotantes (oscuro sobre claro)'],
  ['--oscuro', '--acento', 4.5, 'texto del cartel sobre el acento'],
];
let mal = 0;
for (const [a, b, min, que] of pares) {
  if (!vars[a] || !vars[b]) { console.log(`?  ${a} / ${b}: falta en la paleta`); continue; }
  const r = ratio(vars[a], vars[b]);
  const ok = r >= min;
  if (!ok) mal++;
  console.log(`${ok ? 'ok' : 'NO'} ${r.toFixed(1).padStart(5)}:1 (mín. ${min}) ${a} ${vars[a]} / ${b} ${vars[b]} — ${que}`);
}
// Los colorways tienen que separarse de los dos estudios (el héroe no puede desaparecer en el fondo).
for (const [k, v] of Object.entries(vars).filter(([k]) => /^--color-\d/.test(k))) {
  const c = Math.min(ratio(v, vars['--estudio-claro'] ?? '#ffffff'), ratio(v, vars['--estudio-oscuro'] ?? '#000000'));
  console.log(`${c >= 1.4 ? 'ok' : '! '} ${k} ${v}: contraste mínimo con los estudios ${c.toFixed(1)}:1${c < 1.4 ? ' (se pierde en uno de los fondos)' : ''}`);
}
process.exitCode = mal ? 1 : 0;
