# 🎨 Design System · Nude Project

Un solo lenguaje visual para la **presentación interactiva** del caso (HTML con una sudadera 3D estilo *clay*) y para el juego **Drop Rush**, construido a partir de la identidad real de Nude Project.

👉 Abrí [`index.html`](index.html) en el navegador para ver la guía visual completa: colores, tipografía, componentes, pantallas del juego, la escena 3D con sus colorways, diapositivas e interacciones de la presentación y el modo presentador.

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
2. **Un acento por vez.** Mostaza, rosa, marino, bosque o ladrillo señalan *una sola cosa* por pantalla (el "QUEDA 1", un like, un error). En la presentación, **la sudadera es el acento**: si su colorway es rosa o mostaza, no se suma otro acento en la diapositiva.
3. **Tipografía como imagen.** Títulos grandes, bold, interletra cerrada. Pocas palabras.
4. **Aire.** Una idea por diapositiva. Márgenes generosos. El vacío también es marca.
5. **Interfaz plana, escena con volumen.** La interfaz (botones, tarjetas, diapositivas, pantallas del celular) es recta y plana: sin esquinas redondeadas (salvo insignias tipo píldora), sin sombras ni degradados. El volumen vive **solo en el 3D**: en la presentación, la sudadera *clay* con luz de estudio, sombras suaves y grano (ver [3.1](#31-escena-3d-de-la-presentación)); en el juego, el mundo *low-poly* con su cielo degradado.
6. **Legible en proyector.** Contraste alto (texto principal ≥ 7:1, números de grupo ≥ 4:1) y tamaños grandes: la presentación y el host se ven en un aula.

---

## 3. Color, escena y movimiento

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

### Estudio 3D de la presentación
| Token | Hex | Uso |
|---|---|---|
| `presentacion-estudio-crema-fondo` / `-piso` | `#fff8ee` / `#efe2d0` | Ciclorama del tema crema (se funde con el fondo de la diapositiva). |
| `presentacion-estudio-cacao-fondo` / `-piso` | `#2e1914` / `#3a201a` | Ciclorama del tema cacao. Es cacao profundo para que una sudadera cacao se separe del fondo. |
| `presentacion-pedestal-crema` / `-cacao` | `#e9dccb` / `#573429` | Pedestal según el estudio. |
| `presentacion-luz-principal`, `-relleno`, `-contorno`, `-ambiente` | `#fff1de`, `#f3e9dc`, `#ffffff`, `#e9d6c2` | Luces cálidas de estudio (tonos Nude House). |
| `presentacion-sombra-contacto` | `#2e1914` | Sombra difusa bajo la prenda. |

### Juego
- **Mundo 3D:** asfalto `#5a4640`, vereda `#cfc3b6`, fachadas de Madrid en tonos tierra (`#efe2d0` → `#a8664a`), cielo de `#e9d6c2` a `#fff8ee`, niebla `#f3e9dc`, tienda cacao con cartel crema.
- **Detalles del mundo:** piel `#c68863`, árboles en verde oliva apagado (`#6f8a4a`, tronco `#6e4a40`) para no competir con los acentos, toldos de los locales en bosque `#0b4d3b`, partículas de polvo `#cfc3b6` y líneas de velocidad crema.
- **Elementos:** obstáculo alto = ladrillo, obstáculo bajo = mostaza, like = rosa. Cada tipo se reconoce por color *y* por silueta.
- **40 grupos:** 10 tonos × 4 luminosidades, ordenados para que los primeros 10 grupos sean los más distintos entre sí. Cada color trae su color de texto (crema o cacao) con contraste ≥ 4:1 para el número.

### 3.1 Escena 3D de la presentación
La presentación es el **lanzamiento de un producto**: una sudadera 3D estilo *clay* está detrás de todas las diapositivas (ver la [dirección visual](../presentacion/PLANIFICACION.md#3-dirección-visual-la-sudadera-como-producto)). Sus valores están en `tokens.json → escena`:

| Token | Valor | Para qué |
|---|---|---|
| `material` | rugosidad `0.92`, metálico `0`, brillo de tela `0.55` | Algodón grueso mate (`MeshPhysicalMaterial` con `sheen`). |
| `luz` | principal `2.4`, relleno `0.6`, contorno `1.4`, ambiente `0.5` | Intensidades; los colores salen de `color.presentacion`. |
| `sombra-contacto` | opacidad `0.35`, escala `1.6` | Plano con degradado bajo la prenda (sin mapas de sombras). |
| `grano` | opacidad `0.05` | Grano de película sobre todo (`np-grano`). |
| `render` | escala máxima `1.5`, `60` fps | Límite de resolución interna. |
| `layout` | `5` / `7` columnas | Texto a la izquierda / sudadera a la derecha (`np-diapo__editorial`). |

**Colorways por bloque.** Un color por bloque, siempre del design system (`escena.colorways`, también como `--np-colorway-0` … `--np-colorway-8`):

| Bloque | Colorway | Estudio |
|---|---|---|
| 0. Portada + hype colectivo | cacao | cacao |
| 1. La historia | crema | crema |
| 2. EGC vs. UGC | arena | crema |
| 3. Marketing viral | rosa | crema |
| 4. Marketing experiencial | bosque | crema |
| 5. Métricas | marino | crema |
| 6. Objetivo comunicacional | cacao | crema |
| 7. Desafíos | mostaza | crema |
| 8. Drop Rush | cacao | cacao |

Reglas de la escena:
- **Nada de texto sobre la prenda.** El texto va en su columna de 5/12; la sudadera ocupa los 7/12. En las diapositivas de cita o de cifra gigante, la sudadera pasa al fondo, desenfocada.
- **La única excepción son las etiquetas flotantes** de la vista desarmada (`np-etiqueta-3d`): fondo crema y borde cacao, siempre legibles sobre cualquier colorway.
- **Formas redondeadas solo en el 3D.** El *clay* es redondo; la interfaz que lo rodea sigue recta.

### 3.2 Movimiento
| Token | Valor | Uso |
|---|---|---|
| `rapido` / `base` / `lento` | 120 / 220 / 420 ms | Interfaz: botones, barras, destellos. |
| `escena` + `curva-escena` | 800 ms, `cubic-bezier(.65,0,.35,1)` | Transición continua de cámara y prenda entre bloques, la cola y los feeds. |
| `texto` + `escalonado` | 700 ms, 90 ms por línea | Títulos que suben desde una máscara (`np-revelar__linea`). |
| `cifra` | 1200 ms | Cifras que cuentan desde 0. |
| `latido` | 900 ms | Cartel *QUEDA 1* antes del juego y botón HYPE al tocarlo (`np-latido`). |
| `cinta` | 24 s | Vuelta completa de la cinta de los separadores (`np-cinta`). |

En JavaScript, `segundos('escena')` devuelve `0.8`, listo para GSAP. Con `prefers-reduced-motion`, las animaciones pasan a fundidos cortos y la cinta y el latido se detienen.

---

## 4. Tipografía

| Rol | Familia | Peso | Interletra |
|---|---|---|---|
| Logo | Inter Tight | 700 | −0.055em |
| Display / títulos | Inter Tight | 700–800 | −0.04em / −0.02em |
| Texto | Inter | 400–500 | 0 |
| Etiquetas | Inter | 500, MAYÚSCULAS | +0.08em |

**Inter Tight + Inter** reemplazan a Neue Haas Unica (comercial, no se puede redistribuir) con la misma estructura neo-grotesca. Están incluidas en [`fonts/`](fonts/) (licencia SIL OFL), así el juego y la presentación funcionan **sin internet**.

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
| [`tokens.json`](tokens.json) | **Fuente única de verdad**: colores, 40 grupos, tipografía, espacios, radios, sombras, movimiento y la escena 3D de la presentación. |
| [`build.mjs`](build.mjs) | Genera `tokens.css` y `tokens.js` desde `tokens.json`: `node design-system/build.mjs` |
| [`tokens.css`](tokens.css) | *(generado)* Variables CSS `--np-*`, `@font-face` y los temas crema y cacao. |
| [`tokens.js`](tokens.js) | *(generado)* Módulo ES con los mismos valores, más `colores3d` (números `0x482922` para Three.js), `colorDeGrupo(n)`, `colorwayDeBloque(n)` y `segundos(nombre)`. |
| [`components.css`](components.css) | Componentes con prefijo `np-`: logo, tipografía, botones, insignias, cartel, sello, tarjetas, datos, fichas de grupo, opciones A/B/C, temporizador, HUD, ranking, diapositivas 16:9 y las piezas de la presentación (escena, texto animado, cinta, grano, cola, votación, feeds, hype, etiquetas 3D y modo presentador). |
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

Diapositiva sobre la escena 3D (el motor agrega `np-diapo--activa` a la diapositiva actual):
```html
<section class="np-diapo np-diapo--escena" data-escena="viral" style="--respaldo: url(renders/viral.webp)">
  <div class="np-diapo__editorial">
    <div class="np-diapo__texto">
      <span class="np-etiqueta">03 · Marketing viral</span>
      <h2 class="np-titulo np-revelar">
        <span class="np-revelar__linea" style="--i: 0"><span>Un video,</span></span>
        <span class="np-revelar__linea" style="--i: 1"><span>12 M de vistas.</span></span>
      </h2>
    </div>
    <div class="np-diapo__hueco"></div> <!-- lugar de la sudadera -->
  </div>
</section>
```
Sin WebGL, poner `data-np-sin-webgl` en `<html>`: cada `np-diapo--escena` muestra su `--respaldo` (la misma imagen se usa al imprimir el PDF).

### En la escena 3D de la presentación (Three.js)
```js
import { colores3d, colorwayDeBloque, tokens, segundos } from '../../design-system/tokens.js';

const { escena } = tokens;
const tela = new THREE.MeshPhysicalMaterial({
  color: colorwayDeBloque(3).color3d,           // rosa
  roughness: escena.material.rugosidad,
  sheen: escena.material['brillo-tela'],
  sheenRoughness: escena.material['brillo-tela-rugosidad'],
});
const luz = new THREE.DirectionalLight(colores3d.presentacion['luz-principal'], escena.luz.principal);
gsap.to(camara.position, { ...destino, duration: segundos('escena') });
```

### En el juego (JavaScript / Three.js)
```js
import { colores3d, colorDeGrupo } from '../../design-system/tokens.js';

scene.fog = new THREE.Fog(colores3d.juego.niebla, 30, 120);
const { color3d } = colorDeGrupo(numeroDeGrupo); // tinte del corredor
```

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

### Componentes de la presentación
| Clase | Para qué |
|---|---|
| `np-diapo--escena`, `np-diapo--activa` | Diapositiva transparente sobre el canvas 3D (con `--respaldo` para PDF y sin WebGL) / diapositiva actual, dispara las animaciones |
| `np-diapo__editorial` (+ `__texto`, `__hueco`) | Layout 5/12 texto + 7/12 sudadera |
| `np-revelar__linea`, `np-cifra` | Títulos que suben línea por línea / cifras con ancho fijo para contar desde 0 |
| `np-cinta`, `np-latido`, `np-grano` | Cinta *DROP 001 — QUEDA 1* de los separadores, cartel latiendo y grano de película |
| `np-cola` (+ `__fila`, `__persona`, `__persona--nosotros`, `__bloque`, `__puerta`, `__puerta--abierta`) | Cola de la tienda como barra de progreso (`--avance` de 0 a 1; `--g` con el color de cada grupo) |
| `np-votacion` (+ `__opcion`, `__barra`, `__cifra`, `__estado`) | Barras de la votación en vivo (`--valor` en %) |
| `np-feeds`, `np-feed` (+ `__pista`, `__pub`, `__pie`, `__cuenta`, `__cifra`, `--pausado`) | Feeds 9:16 de EGC vs. UGC (`--actual` = publicación visible) |
| `np-cuenta`, `np-hype`, `np-hype-boton` | Cuenta regresiva gigante, medidor de hype con las fichas de los grupos y botón HYPE a pantalla completa del celular |
| `np-etiqueta-3d` (+ `__valor`, `__texto`) | Etiquetas flotantes de la vista desarmada (`--x`, `--y` proyectados desde la escena) |
| `np-presentador` (+ `__actual`, `__notas`, `__estado`), `np-cronometro` (+ `--aviso`, `--pasado`) | Modo presentador: notas, siguiente diapositiva y cronómetro por bloque |

---

## 8. Nota sobre la marca
Nude Project y su logo son marcas de sus dueños. Este design system es una **interpretación con fines académicos** para un trabajo práctico de la facultad; el logo se compone con tipografía libre y no se distribuyen archivos oficiales de la marca.
