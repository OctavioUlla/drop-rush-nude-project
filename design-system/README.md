# 🎨 Design System · Nude Project

Un solo lenguaje visual para la **presentación interactiva** del caso (un plano secuencia 3D por la Nude House en estilo *clay*, con la sudadera como protagonista) y para el juego **Drop Rush**, construido a partir de la identidad real de Nude Project.

👉 Abrí [`index.html`](index.html) en el navegador para ver la guía visual completa: colores, tipografía, componentes, pantallas del juego, la escena 3D en vivo con sus estaciones y colorways, las interacciones de la presentación y el modo presentador.

🎬 [`escena.html`](escena.html) es la **escena de la presentación funcionando** (Three.js): recorrela con ← →. Necesita servirse por HTTP, por ejemplo `npx serve .` desde la raíz del repositorio.

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
5. **Interfaz plana, escena con volumen.** La interfaz (botones, tarjetas, diapositivas, pantallas del celular) es recta y plana: sin esquinas redondeadas (salvo insignias tipo píldora), sin sombras ni degradados. El volumen vive **solo en el 3D**: en la presentación, el plano secuencia *clay* con luz de cine, sombras suaves, polvo y grano (ver [3.1](#31-escena-3d-de-la-presentación-un-plano-secuencia)); en el juego, el mundo *low-poly* con su cielo degradado.
6. **Legible en proyector.** Contraste alto (texto principal ≥ 7:1, números de grupo ≥ 4:1) y tamaños grandes: la presentación y el host se ven en un aula.
7. **Calidad de lanzamiento.** La presentación tiene que verse como la web de una marca premium, no como diapositivas: nada aparece de golpe (todo entra con su curva), nada queda quieto del todo (la prenda flota, el polvo se mueve) y nunca hay un corte entre bloques.

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
| `presentacion-sombra-contacto` | `#2e1914` | Sombra difusa bajo la prenda y los objetos. |
| `presentacion-foco` / `-polvo` | `#ffe9c9` / `#fff1de` | Foco cenital con haz visible y las partículas de polvo dentro del haz. |
| `presentacion-casa-pared` / `-piso` | `#6e4a40` / `#cf9f7a` | Paredes marrones y piso de madera de la Nude House y de la habitación. |
| `presentacion-casa-carton` / `-planta` | `#c08a5e` / `#6f8a4a` | Cajas de envío de los primeros pedidos; plantas en oliva apagado. |
| `presentacion-pantalla` | `#fffaf3` | Luz de las pantallas de los feeds y de la ventana. |

### Juego
- **Mundo 3D:** asfalto `#5a4640`, vereda `#cfc3b6`, fachadas de Madrid en tonos tierra (`#efe2d0` → `#a8664a`), cielo de `#e9d6c2` a `#fff8ee`, niebla `#f3e9dc`, tienda cacao con cartel crema.
- **Detalles del mundo:** piel `#c68863`, árboles en verde oliva apagado (`#6f8a4a`, tronco `#6e4a40`) para no competir con los acentos, toldos de los locales en bosque `#0b4d3b`, partículas de polvo `#cfc3b6` y líneas de velocidad crema.
- **Elementos:** obstáculo alto = ladrillo, obstáculo bajo = mostaza, like = rosa. Cada tipo se reconoce por color *y* por silueta.
- **40 grupos:** 10 tonos × 4 luminosidades, ordenados para que los primeros 10 grupos sean los más distintos entre sí. Cada color trae su color de texto (crema o cacao) con contraste ≥ 4:1 para el número.

### 3.1 Escena 3D de la presentación: un plano secuencia
La presentación es el **lanzamiento de un producto contado en una sola toma** (ver la [dirección visual](../presentacion/PLANIFICACION.md#3-dirección-visual-un-plano-secuencia-por-la-nude-house)). La cámara recorre una **Nude House en miniatura hecha en *clay*** y cada bloque es una **estación** del recorrido; la sudadera protagonista viaja con la cámara y nunca sale de cuadro. Referencias ([#23](https://github.com/OctavioUlla/drop-rush-nude-project/issues/23)): el viaje de cámara por un escenario 3D de [fighterready.com](https://fighterready.com/) y los productos 3D que flotan y giran entre tipografía gigante de [lajoya-foods.com](https://lajoya-foods.com/en).

**Maqueta viva:** [`escena.html`](escena.html) + [`escena/`](escena/) (`sudadera.js`, `mundo.js`, `escena.js`). Es la Fase 0 de la presentación: el mismo código pasa a `presentacion/escena/`.

**Cuatro recursos que la hacen premium**

| Recurso | Cómo se ve | Tokens |
|---|---|---|
| **Producto héroe** | Una sola sudadera protagonista, siempre en movimiento: flota, se balancea mostrando el frente y los tres cuartos (nunca queda de espaldas) y en cada viaje da **una vuelta completa** mientras cambia de colorway. En la portada la rodean sudaderas en los neutros de la marca, flotando y girando. | `escena.producto` |
| **Tipografía sándwich** | Una palabra gigante (`np-gigante`, 22 cqw) va **detrás** de la prenda y el título va **delante**: el producto queda entre dos capas de texto. Las letras entran de a una. | `--np-texto-gigante` |
| **Luz de cine** | Luz cálida de estudio con **sombras suaves reales** (una sola luz con sombra, que acompaña a la estación activa), foco cenital con **haz visible y polvo**, niebla del color del fondo, **viñeta** y **grano**. Mapeo de tonos neutro, para que los colores de marca no se laven. | `escena.luz`, `sombra`, `niebla`, `polvo`, `vineta`, `grano` |
| **Viaje de cámara** | Entre bloques, un **travelling con grúa**: la cámara sube y retrocede a mitad de camino y vuelve a bajar en la estación siguiente (1,8 s, `curva-viaje`). El fondo y la niebla funden entre crema y cacao. El texto sale hacia arriba al arrancar y el nuevo entra cuando la cámara ya está llegando. | `escena.camara`, `movimiento.viaje` |

**Estaciones.** En orden (`escena.recorrido`), separadas 18 m sobre el eje X. Un colorway por bloque, siempre del design system (`escena.colorways`, también como `--np-colorway-0` … `--np-colorway-8`):

| # | Estación | Qué hay | Colorway | Estudio | Encuadre |
|---|---|---|---|---|---|
| 0 | Portada + hype | Pedestal bajo un foco, sudaderas flotando y *Drop 001* gigante detrás. En el hype la luz se apaga, la prenda sube y baja con el medidor y cae entre papelitos con los colores de los grupos | cacao | cacao | centro |
| 1 | La historia | La habitación: ventana, cama y pila de cajas; la sudadera levita sobre la caja abierta del pedido #0001 (solapas abiertas, papel de seda y etiqueta de envío) | crema | crema | editorial |
| 2 | EGC vs. UGC | Dos celulares en su soporte con feeds verticales que pasan solos; la prenda gira hacia uno y otro | arena | crema | centro |
| 3 | Marketing viral | Pared de 24 celulares con la publicación de *Out of Office* y su contador de likes, con corazones *clay* que brotan de las pantallas; la prenda se corre a la izquierda para dejarla ver | rosa | crema | editorial |
| 4 | Marketing experiencial | Salón de la Nude House: pared de acento con neón, perchero con sudaderas en sus perchas, estante con vinilos, planta y lámpara; la prenda cuelga de frente en un perchero de exhibición | bosque | crema | editorial |
| 5 | Métricas | Vista desarmada con etiquetas flotantes; en la pose *pilas*, barras hechas con sudaderas dobladas (2024 contra hoy) y la prenda arriba de la más alta | marino | crema | editorial |
| 6 | Objetivo comunicacional | Plano medio de la prenda girada hacia la frase de Bruno, con el logo bordado bien grande | cacao | crema | macro |
| 7 | Desafíos | Balanza: cada plato cuelga de un aro con tres hilos; una sola sudadera contra una pila. Se inclina con la votación | mostaza | crema | editorial |
| 8 | Drop Rush | La vidriera de la tienda en la calle, con foco y cartel; *QUEDA 1* → juego | cacao | cacao | editorial |

**Encuadres.** *Editorial*: texto en los 5/12 de la izquierda (`np-diapo__editorial`), la sudadera en los 7/12 de la derecha. *Centro*: la prenda al medio, el texto arriba o abajo. *Macro*: plano medio de la prenda, sin pedestal, con el logo a la derecha.

**Poses.** Una estación puede tener encuadres alternativos (`poses`): la diapositiva los pide con `data-pose` y la cámara se acomoda sin viajar (`escena`), con la prenda en otro lugar o tamaño. Solo en estaciones sin paredes: lo que queda detrás del texto en un encuadre no puede quedar detrás del texto en el otro.

Reglas de la escena:
- **Nada de texto sobre los objetos.** El texto y la interfaz van sobre paredes, piso o fondo; los objetos quedan en su columna. Las **etiquetas flotantes** (`np-etiqueta-3d`) señalan piezas de la prenda (`data-pieza`) u objetos de la estación (`data-ancla`), y van al costado o debajo (`--izquierda`, `--abajo`), nunca encima.
- **Nada se atraviesa.** Lo que se apoya, se apoya: la prenda **levita** sobre pedestales y cajas con un hueco mayor que la amplitud de flotar; en la balanza descansa en el plato, con los hilos por fuera; colgada, la percha sale por el escote y el gancho abraza la barra. Para salir o entrar de una percha o un plato, primero se adelanta.
- **Lo que queda detrás del texto es claro y de bajo contraste** (paredes en crema y arena); los objetos oscuros van del lado de la prenda.
- **Nunca un corte.** Si se pide otra estación durante un viaje, se encola; la cámara no salta.
- **Formas redondeadas solo en el 3D.** El *clay* es redondo; la interfaz que lo rodea sigue recta.
- **Respaldo:** sin WebGL, cada encuadre se reemplaza por su imagen pre-renderizada (`--respaldo`, en `presentacion/renders/`), la misma que se usa para el PDF y las miniaturas del modo presentador. Se regeneran con `npm run renders:presentacion` en `juego/`.

### 3.2 Movimiento
| Token | Valor | Uso |
|---|---|---|
| `rapido` / `base` / `lento` | 120 / 220 / 420 ms | Interfaz: botones, barras, destellos. |
| `viaje` + `curva-viaje` | 1800 ms, `cubic-bezier(.76,0,.24,1)` | Viaje de cámara entre estaciones (arranque y llegada suaves, mitad rápida). Si se saltan varias estaciones dura hasta 1,7×. |
| `escena` + `curva-escena` | 800 ms, `cubic-bezier(.65,0,.35,1)` | Movimientos dentro de una estación (la prenda gira hacia un feed, la balanza), la cola y los feeds. |
| `salida-texto` | 380 ms | El texto de la estación que se va sube y desaparece cuando arranca la cámara. |
| `cargador` | 1400 ms | Cuenta del 0 al 100 % del cargador antes de abrir el telón. |
| `texto` + `escalonado` | 700 ms, 90 ms por línea | Títulos que suben desde una máscara (`np-revelar__linea`). |
| `cifra` | 1200 ms | Cifras que cuentan desde 0. |
| `latido` | 900 ms | Cartel *QUEDA 1* antes del juego y botón HYPE al tocarlo (`np-latido`). |
| `cinta` | 24 s | Vuelta completa de la cinta de los separadores (`np-cinta`). |

En JavaScript, `segundos('viaje')` devuelve `1.8`, listo para GSAP; `curva()` de `escena/escena.js` convierte cualquier `cubic-bezier` en una función, así cámara y texto usan la misma curva. Con `prefers-reduced-motion`, los viajes pasan a cortes y la cinta y el latido se detienen.

---

## 4. Tipografía

| Rol | Familia | Peso | Interletra |
|---|---|---|---|
| Logo | Inter Tight | 700 | −0.055em |
| Gigante (detrás del producto) | Inter Tight | 800 | −0.065em, 22 cqw |
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
| [`components.css`](components.css) | Componentes con prefijo `np-`: logo, tipografía, botones, insignias, cartel, sello, tarjetas, datos, fichas de grupo, opciones A/B/C, temporizador, HUD, ranking, diapositivas 16:9 y las piezas de la presentación (escenario, tipografía gigante, capas de texto, interfaz, cargador, viñeta, texto animado, cinta, grano, cola, votación, feeds, hype, etiquetas 3D y modo presentador). |
| [`cola.js`](cola.js) | Arma la cola de la tienda (`np-cola`) y la hace caminar de un bloque al otro. |
| [`index.html`](index.html) | Guía visual con todo lo anterior en uso. |
| [`escena.html`](escena.html), [`escena/`](escena/) | Maqueta viva del plano secuencia: sudadera *clay* por piezas (`sudadera.js`), las 9 estaciones (`mundo.js`) y el motor de luz y cámara (`escena.js`). |
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
import { iniciar } from '../../design-system/escena/escena.js';

const motor = iniciar({
  lienzo: document.querySelector('canvas'),
  escenario: document.querySelector('.np-escenario'),
  eventos: { salir(desde) {}, entrar(i) {}, llegar(i) {} }, // el texto sale, entra y aparecen las etiquetas
});
motor.siguiente();                           // viaje a la estación siguiente
motor.estaciones[7].valor = 0.7;             // inclina la balanza con el resultado de la votación
const { x, y } = motor.proyectar('capucha'); // % en pantalla, para una np-etiqueta-3d
```
La sudadera sola: `crearSudadera(colorwayDeBloque(3).color3d)` de `escena/sudadera.js` devuelve sus piezas, `ponerColor()` (acepta un fundido cuadro a cuadro) y `desarmar(t)`.

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
| `np-ficha--foto` | La ficha con la foto del grupo (selfie o *fit check*) adentro y el número en la esquina: `<span class="np-ficha np-ficha--foto" style="--g: …; --gt: …"><img src="…" alt=""><b>7</b></span>` |
| `np-grilla-grupos`, `np-ranking` | Lobby de 40 grupos y ranking en vivo |
| `np-opcion` (+ `--correcta`, `--incorrecta`), `np-temporizador`, `np-hud`, `np-destello` | Pantallas de pregunta y runner |
| `np-diapo` (+ `__cuerpo`, `__columnas`, `__datos`, `__pie`) | Diapositivas 16:9 que escalan con su ancho |

### Componentes de la presentación
| Clase | Para qué |
|---|---|
| `np-escenario` | Escenario 16:9 a pantalla completa con todas las capas; `--fondo-escena` lo actualiza el motor |
| `np-gigantes`, `np-gigante` (+ `--activa`, `--sale`) | Tipografía gigante detrás del canvas; cada letra en un `<span style="--i: n">` |
| `np-capas`, `np-capa` (+ `--centro`, `--abajo`, `--sale`, `__entra`) | Texto de cada estación: sale hacia arriba y entra cuando llega la cámara |
| `np-vineta`, `np-interfaz` (+ `__menu`, `__contador`, `__barra`, `__pista`, `__drop`), `np-cargador` (+ `--listo`) | Viñeta, interfaz con el índice de bloques y el avance, y cargador con telón |
| `np-etiquetas` (+ `--visibles`) | Contenedor de las `np-etiqueta-3d` de la vista desarmada |
| `np-diapo--escena`, `np-diapo--activa` | Diapositiva transparente sobre el canvas 3D (con `--respaldo` para PDF y sin WebGL) / diapositiva actual, dispara las animaciones |
| `np-diapo__editorial` (+ `__texto`, `__hueco`) | Layout 5/12 texto + 7/12 sudadera |
| `np-revelar__linea`, `np-cifra` | Títulos que suben línea por línea / cifras con ancho fijo para contar desde 0 |
| `np-cinta`, `np-latido`, `np-grano` | Cinta *DROP 001 — QUEDA 1* de los separadores, cartel latiendo y grano de película |
| `np-cola` (+ `__texto`, `__vereda`, `__fila`, `__persona`, `__persona--nosotros`, `__tienda`, `__puerta`, `__vidriera`, `__queda`) | Cola de la tienda como barra de progreso: delante nuestro (mostaza) hay tantas personas como bloques faltan; en cada bloque entra una y la fila da un paso, y en el último se abre la puerta con *Queda 1*. El HTML lo arma [`cola.js`](cola.js) (`crearCola(el, { bloques }).ir(n)`); `--bloque` mueve la fila y `.grupos(colores)` pinta cada persona con el color de un grupo conectado (`--g`) |
| `np-votacion` (+ `__opcion`, `__barra`, `__cifra`, `__estado`) | Barras de la votación en vivo (`--valor` en %) |
| `np-feeds`, `np-feed` (+ `__pista`, `__pub`, `__pie`, `__cuenta`, `__cifra`, `--pausado`) | Feeds 9:16 de EGC vs. UGC (`--actual` = publicación visible) |
| `np-cuenta`, `np-hype`, `np-hype-boton` | Cuenta regresiva gigante, medidor de hype con las fichas de los grupos y botón HYPE a pantalla completa del celular |
| `np-etiqueta-3d` (+ `__valor`, `__texto`) | Etiquetas flotantes de la vista desarmada (`--x`, `--y` proyectados desde la escena) |
| `np-presentador` (+ `__actual`, `__notas`, `__estado`), `np-cronometro` (+ `--aviso`, `--pasado`) | Modo presentador: notas, siguiente diapositiva y cronómetro por bloque |

---

## 8. Nota sobre la marca
Nude Project y su logo son marcas de sus dueños. Este design system es una **interpretación con fines académicos** para un trabajo práctico de la facultad; el logo se compone con tipografía libre y no se distribuyen archivos oficiales de la marca.
