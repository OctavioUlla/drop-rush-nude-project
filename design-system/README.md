# 🎨 Design System · Nude Project

Un solo lenguaje visual para la **presentación** del caso y para el juego **Drop Rush**, construido a partir de la identidad real de Nude Project.

👉 Abrí [`index.html`](index.html) en el navegador para ver la guía visual completa (colores, tipografía, componentes, pantallas del juego y diapositivas de ejemplo).

---

## 1. De dónde sale: la identidad de Nude Project

| Fuente | Qué aporta |
|---|---|
| **Web oficial** ([nude-project.com](https://nude-project.com/)) | El color de marca es el **marrón cacao `#482922`** (es el color de texto, cabecera y botones del sitio), sobre **blanco** y con un **gris cálido `#dad4d3`** para bordes y estados deshabilitados. La tipografía es **Neue Haas Unica** (neo-grotesca suiza). Formas rectas, casi sin redondeos. |
| **Logo** (imagen para redes del sitio) | Logotipo tipográfico *Nude® Project* en grotesca **bold** con interletra muy cerrada, en **crema `#fff8ee`** sobre fondo **cacao**. |
| **Tiendas** ([Forbes](https://forbes.es/economia/675785/nude-project-se-expande-en-espana-con-la-apertura-de-su-primera-flagship-en-madrid/), [FashionUnited](https://fashionunited.es/noticias/retail/nude-project-abre-tienda-en-ibiza/2024061443371)) | La flagship de Madrid (Fuencarral 18, la *Nude House*) mantiene **el tono marrón que define a la marca** y se piensa como una casa cálida: salón, sala de lectura, sala de juegos. Ibiza: paredes encaladas, madera vista, libros y vinilos. → **Calidez, materiales naturales, hogar.** |
| **Lema** | ***By artists, for artists.*** |
| **Caso de la cátedra** ([`docs/caso-nude-project.pdf`](../docs/caso-nude-project.pdf)) | Autenticidad (*nude* = mostrarse como uno es), cercanía, tono transparente y emocional, comunidad y pertenencia, drops limitados, hype. Estética cuidada y coherente entre discurso y acción. |
| **Colecciones** | Además del cacao, la tienda usa colores de producto puntuales: amarillo `#ffe500`, rosa `#ffc0cb`, azul marino `#103071`, verde bosque `#0b4d3b`. Son los acentos del sistema. |

### Personalidad visual (en 4 palabras)
**Cálida · Minimalista · Segura · Cercana.** Minimalismo streetwear europeo, pero en marrón y crema en lugar de blanco y negro: se siente como la *Nude House*, no como una tienda fría.

---

## 2. Principios

1. **Cacao y crema primero.** El 90 % de cualquier pantalla o diapositiva es cacao, crema o arena. Nunca negro puro (`#000`).
2. **Un acento por vez.** Mostaza, rosa, marino, bosque o ladrillo señalan *una sola cosa* por pantalla (el "QUEDA 1", un like, un error).
3. **Tipografía como imagen.** Títulos grandes, bold, interletra cerrada. Pocas palabras.
4. **Aire.** Una idea por diapositiva. Márgenes generosos. El vacío también es marca.
5. **Recto y plano.** Sin esquinas redondeadas (salvo insignias tipo píldora), sin sombras ni degradados pesados. El único degradado es el cielo del juego.
6. **Legible en proyector.** Contraste alto (texto principal ≥ 7:1, números de grupo ≥ 4:1) y tamaños grandes: la presentación y el host se ven en un aula.

---

## 3. Color

### Marca
| Token | Hex | Uso |
|---|---|---|
| `cacao` | `#482922` | Color principal: texto, portadas, botones, logo. |
| `cacao-profundo` | `#2e1914` | Hover, sombras, máximo contraste. |
| `cacao-suave` | `#6e4a40` | Texto secundario sobre crema. |
| `crema` | `#fff8ee` | Fondo principal y texto sobre cacao. |
| `arena` | `#f3e9dc` | Fondos alternos, tarjetas, niebla del mundo 3D. |
| `piedra` | `#dad4d3` | Bordes, separadores, deshabilitado. |
| `blanco` | `#ffffff` | Solo superficies elevadas o fotos. |

### Acentos
| Token | Hex | Significado |
|---|---|---|
| `mostaza` | `#ffe500` | Urgencia / hype: "QUEDA 1", obstáculos bajos, subrayados. Nunca como color de texto sobre crema. |
| `rosa` | `#ffc0cb` | Comunidad: likes, reacciones. |
| `marino` | `#103071` | Datos y métricas (segunda serie en gráficos). |
| `bosque` | `#0b4d3b` | Acierto. |
| `ladrillo` | `#b3261e` | Error, obstáculos altos, SOLD OUT. |

### Juego
- **Mundo 3D:** asfalto `#5a4640`, vereda `#cfc3b6`, fachadas de Madrid en tonos tierra (`#efe2d0` → `#a8664a`), cielo de `#e9d6c2` a `#fff8ee`, niebla `#f3e9dc`, tienda cacao con cartel crema.
- **Elementos:** obstáculo alto = ladrillo, obstáculo bajo = mostaza, like = rosa. Cada tipo se reconoce por color *y* por silueta.
- **40 grupos:** 10 tonos × 4 luminosidades, ordenados para que los primeros 10 grupos sean los más distintos entre sí. Cada color trae su color de texto (crema o cacao) con contraste ≥ 4:1 para el número.

---

## 4. Tipografía

| Rol | Familia | Peso | Interletra |
|---|---|---|---|
| Logo | Inter Tight | 700 | −0.055em |
| Display / títulos | Inter Tight | 700–800 | −0.04em / −0.02em |
| Texto | Inter | 400–500 | 0 |
| Etiquetas | Inter | 500, MAYÚSCULAS | +0.08em |

**Inter Tight + Inter** reemplazan a Neue Haas Unica (comercial, no se puede redistribuir) con la misma estructura neo-grotesca. Están incluidas en [`fonts/`](fonts/) (licencia SIL OFL), así el juego y la presentación funcionan **sin internet**. En Google Slides o Canva se eligen igual: *Inter Tight* e *Inter*.

---

## 5. Voz y tono

- **Cercano, como un amigo** (así habla Bruno en redes). Frases cortas, segunda persona: *"Escaneá el QR"*, *"¡Corré!"*.
- **Transparente:** decir las cosas como son, sin vender humo.
- **Palabras de la cultura de la marca** en inglés cuando son parte del ritual: *drop*, *sold out*, *hype*, *by artists, for artists*.
- **Mayúsculas** solo en etiquetas cortas y carteles (`QUEDA 1`, `SOLD OUT`), nunca en párrafos.

---

## 6. Archivos

| Archivo | Qué es |
|---|---|
| [`tokens.json`](tokens.json) | **Fuente única de verdad**: colores, 40 grupos, tipografía, espacios, radios, sombras y movimiento. |
| [`build.mjs`](build.mjs) | Genera `tokens.css` y `tokens.js` desde `tokens.json`: `node design-system/build.mjs` |
| [`tokens.css`](tokens.css) | *(generado)* Variables CSS `--np-*`, `@font-face` y los temas crema y cacao. |
| [`tokens.js`](tokens.js) | *(generado)* Módulo ES con los mismos valores, más `colores3d` (números `0x482922` para Three.js) y `colorDeGrupo(n)`. |
| [`components.css`](components.css) | Componentes con prefijo `np-`: logo, tipografía, botones, insignias, cartel, sello, tarjetas, datos, fichas de grupo, opciones A/B/C, temporizador, HUD, ranking y diapositivas 16:9. |
| [`index.html`](index.html) | Guía visual con todo lo anterior en uso. |
| [`fonts/`](fonts/) | Inter e Inter Tight (woff2 variables, subconjunto latino) + licencia. |

> ✏️ Para cambiar un color o una medida: editar `tokens.json` y correr `node design-system/build.mjs`. Nunca editar `tokens.css` ni `tokens.js` a mano.

---

## 7. Cómo usarlo

### En HTML (presentación, host y celular)
```html
<link rel="stylesheet" href="../design-system/tokens.css">
<link rel="stylesheet" href="../design-system/components.css">

<body class="np-base">                      <!-- tema crema -->
<section data-np-tema="cacao"> … </section> <!-- tema cacao -->
```

### En el juego (JavaScript / Three.js)
```js
import { colores3d, colorDeGrupo } from '../../design-system/tokens.js';

scene.fog = new THREE.Fog(colores3d.juego.niebla, 30, 120);
const { color3d } = colorDeGrupo(numeroDeGrupo); // tinte del corredor
```

### En Google Slides / Canva / PowerPoint
Si la presentación se arma en otra herramienta: tema con fondo crema `#fff8ee` y texto cacao `#482922`, portadas y separadores con fondo cacao y texto crema, tipografías Inter Tight (títulos) e Inter (texto) y un solo acento por diapositiva. Las diapositivas de ejemplo de [`index.html`](index.html) sirven de referencia de layout.

### Componentes principales
| Clase | Para qué |
|---|---|
| `np-logo` | `<span class="np-logo">Nude<sup>®</sup>Project</span>` |
| `np-logo-juego` | `<span class="np-logo-juego">Drop <span>Rush</span></span>` |
| `np-display`, `np-titulo`, `np-subtitulo`, `np-etiqueta`, `np-cita`, `np-subrayado` | Jerarquía tipográfica |
| `np-boton` (+ `--secundario`, `--acento`, `--grande`) | Botones (mín. 48 px de alto para el celular) |
| `np-insignia`, `np-cartel`, `np-sello` | Etiquetas, "QUEDA 1", "SOLD OUT" |
| `np-tarjeta`, `np-dato` | Bloques y métricas grandes |
| `np-ficha` | Número de grupo con su color: `style="--g: var(--np-grupo-7); --gt: var(--np-grupo-7-texto)"` |
| `np-grilla-grupos`, `np-ranking` | Lobby de 40 grupos y ranking en vivo |
| `np-opcion` (+ `--correcta`, `--incorrecta`), `np-temporizador`, `np-hud`, `np-destello` | Pantallas de pregunta y runner |
| `np-diapo` (+ `__cuerpo`, `__columnas`, `__datos`, `__pie`) | Diapositivas 16:9 que escalan con su ancho |

---

## 8. Nota sobre la marca
Nude Project y su logo son marcas de sus dueños. Este design system es una **interpretación con fines académicos** para un trabajo práctico de la facultad; el logo se compone con tipografía libre y no se distribuyen archivos oficiales de la marca.
