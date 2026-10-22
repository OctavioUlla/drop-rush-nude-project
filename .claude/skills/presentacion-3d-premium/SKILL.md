---
name: presentacion-3d-premium
description: Crea presentaciones HTML premium en 3D sobre cualquier temática, con estética de lanzamiento de producto. Son un solo plano secuencia en Three.js estilo clay, con un objeto héroe que viaja con la cámara entre estaciones, tipografía gigante detrás del objeto, luz de cine, texto que entra línea por línea, cifras que cuentan y etiquetas flotantes. Se entregan como UN ÚNICO archivo .html autocontenido que funciona sin internet ni servidor. Usala siempre que pidan una presentación, exposición, pitch, keynote, deck o diapositivas "premium", "3D", "inmersiva", "tipo web de marca", "como la de Nude Project" o "en HTML", o cuando quieran convertir un guion, un informe o un tema en una presentación visual de alto impacto, aunque no nombren Three.js. No es para .pptx ni para documentos de texto.
---

# Presentación 3D premium (plano secuencia clay)

Esta skill replica la dirección visual de la presentación del caso Nude Project (carpetas `presentacion/` y `design-system/` de este repo) para **cualquier temática**, sin la parte interactiva (celulares, votación, hype, juego). El resultado es **un solo HTML** con todo adentro: three.js, fuentes, estilos, escena y diapositivas.

La idea en una frase: **la presentación es el lanzamiento de un producto contado en una sola toma.** La cámara recorre una maqueta *clay* (un lugar en miniatura que tiene que ver con el tema) y cada bloque es una **estación** del recorrido. Un **objeto héroe** que encarna el tema viaja con la cámara, nunca sale de cuadro, gira, cambia de color en cada estación y se desarma para mostrar datos.

No hace falta pedirle al usuario referencias ni explicaciones de estilo: todo eso está en esta skill. Solo hace falta el **contenido**.

## Qué hay en la skill

```
presentacion-3d-premium/
├── SKILL.md                      ← este archivo: el flujo de trabajo
├── references/
│   ├── direccion-visual.md       ← principios, paleta, tipografía, encuadres, movimiento, reglas de la escena
│   ├── modelado-clay.md          ← API del kit 3D, cómo modelar el héroe y las estaciones, poses, etiquetas
│   └── ideas-por-tematica.md     ← héroe + recorrido + estaciones para temáticas típicas
├── assets/plantilla/             ← proyecto que funciona: se copia y se adapta
│   ├── index.html                ← paleta (variables CSS), diapositivas, interfaz y cargador
│   ├── tema.js                   ← el héroe y las estaciones (lo que más cambia)
│   ├── motor.js                  ← motor 3D genérico + kit clay (no se toca)
│   ├── deck.js                   ← navegación y coreografía del texto (no se toca)
│   ├── estilos.css               ← estilos genéricos (no se toca; se agregan componentes si hacen falta)
│   ├── fuentes/                  ← Inter e Inter Tight (OFL)
│   └── vendor/                   ← three.js r186 y dos addons
└── scripts/
    ├── empaquetar.mjs            ← carpeta → un solo .html autocontenido
    └── capturas.mjs              ← una imagen por diapositiva + errores de consola (Playwright)
```

La plantilla trae un ejemplo completo («Del grano a la taza», con una taza como héroe y 6 estaciones). Antes de escribir código, abrí `assets/plantilla/tema.js` e `index.html`: son el mejor ejemplo de cómo se arma todo.

## Flujo de trabajo

### 1. Contenido (lo único que se le pide al usuario)

Del pedido sacá: **tema**, **público y objetivo**, **bloques** (o puntos de una consigna), **datos y cifras reales**, **idioma**, **duración**, **nombre o marca**. Si falta algo, inferilo con criterio y anotalo como supuesto; preguntá solo lo que no se puede inventar (por ejemplo, cifras que tienen que ser reales). Si el usuario trae un guion, un PDF o un informe, el contenido sale de ahí.

Regla de duración: ~1 diapositiva por minuto y entre **5 y 9 estaciones** (una por bloque). Varias diapositivas de un bloque comparten estación: la cámara solo se acomoda.

### 2. Concepto: héroe, recorrido y guion visual

Elegí antes de escribir código (ver `references/ideas-por-tematica.md`):

- **El héroe**: UN objeto que encarna el tema y se pueda modelar con piezas redondeadas (una taza, un libro, un cohete, una zapatilla, un faro, una semilla, un chip, una casa…). Tiene que leerse a tamaño chico, tener 3 a 6 **piezas desarmables** (para la estación de datos) y una superficie principal que cambie de color.
- **El recorrido**: un lugar en miniatura (la habitación donde empezó todo, un laboratorio, una ciudad, un campo, una fábrica, una biblioteca…). Cada estación es un rincón de ese lugar con 2 a 5 objetos que cuentan algo del bloque.
- **El guion visual**: armá la tabla y mostrásela al usuario en el chat antes de modelar (es barato corregir acá, caro después):

| # | Estación | Qué hay en la maqueta | Qué hace el héroe | Colorway | Estudio | Encuadre |
|---|---|---|---|---|---|---|
| 0 | portada | pedestal bajo un foco, copias flotando, palabra gigante detrás | cae con un rebote | neutro claro | oscuro | centro |
| … | … | … | levita sobre…, se desarma, corona las barras… | un color de la paleta | claro | editorial |
| n | cierre | … | queda bajo el foco | acento | oscuro | editorial |

Portada y cierre en el estudio **oscuro**; el contenido en el **claro**. Que haya al menos una estación de **datos** (héroe desarmado con etiquetas, o barras de pilas con el héroe arriba) y, si hay una frase fuerte, una **cita** en encuadre *macro*.

Si el usuario dijo que no quiere revisar nada, seguí sin esperar respuesta.

### 3. Identidad

Leé `references/direccion-visual.md` y definí en el `<style id="paleta">` de `index.html`:
- `--oscuro`, `--claro` y los neutros (`--arena`, `--piedra`, `--oscuro-suave`, `--claro-suave`), los estudios (`--estudio-claro`, `--estudio-oscuro`, `--piso-claro`, `--piso-oscuro`), **un** `--acento` y 3 a 5 colorways (`--color-1`…) para el héroe.
- Las fuentes, si el tema pide otra cosa que Inter Tight + Inter (ver la sección de tipografía).
- La marca de la interfaz (logo en texto) y la etiqueta de arriba a la derecha.

### 4. Construcción

```bash
cp -r <directorio-de-la-skill>/assets/plantilla <destino>/<nombre-corto>
```

Después, en la copia:
1. **`tema.js`**: reescribí `crearHeroe` y `estaciones` para el nuevo tema (ver `references/modelado-clay.md`). Mantené la forma del objeto exportado.
2. **`index.html`**: paleta, `<title>`, las `.gigante` (una palabra por estación que la use, normalmente solo la portada), las diapositivas (`<section class="capa" data-escena=…>`), la marca de la interfaz y el cargador. Usá solo las clases de `estilos.css` (lista en `references/direccion-visual.md`).
3. **No toques `motor.js` ni `deck.js`** salvo que falte algo de verdad genérico; si lo hacés, que siga sirviendo para cualquier tema.

Si el usuario aporta fotos o videos, ponelos en `media/` dentro del proyecto y usalos como textura de un `kit.marco()` (cuadros, pantallas): el empaquetador los incrusta. Comprimilos antes (webp ≤ 300 KB, mp4 corto); el HTML final no debería pasar de ~15 MB.

### 5. Revisión visual (no te la saltees)

```bash
node <directorio-de-la-skill>/scripts/capturas.mjs <destino>/<nombre-corto>            # sirve la carpeta por HTTP
```

Mirá **cada** captura (podés juntar varias en una hoja de contactos con PIL para ahorrar) y repasá la lista de control del final. Corregí y repetí hasta que pase. Los problemas típicos: el héroe muy grande o cortado (ajustar `escala` de la estación), objetos detrás del texto (moverlos a la derecha o hacia atrás), etiquetas que salen de pantalla (cambiar `--izquierda`/`--abajo` o el ancla), decorado que tapa al héroe.

### 6. Empaquetado y entrega

```bash
node <directorio-de-la-skill>/scripts/empaquetar.mjs <destino>/<nombre-corto> <destino>/<nombre-corto>.html
node <directorio-de-la-skill>/scripts/capturas.mjs <destino>/<nombre-corto>.html        # verifica el archivo final, abierto sin servidor
```

El empaquetador avisa si quedó alguna referencia local sin resolver: tiene que terminar sin avisos. Entregá **el `.html` único** (y mencioná que la carpeta del proyecto queda para editar después). Contale al usuario cómo se usa: abrir el archivo en Chrome/Edge/Firefox, `F` pantalla completa, `→`/`Espacio`/clic para avanzar, `←` para volver, índice de bloques arriba, `#3` en la URL abre la diapositiva 3, `?escala=1` si la máquina no llega a 60 fps.

## Lista de control

- [ ] Ningún texto encima de un objeto; lo que queda detrás del texto es claro (o oscuro) y de bajo contraste.
- [ ] El héroe siempre entero en cuadro, nunca tapado por decorado, nunca atravesando un apoyo (levita con hueco).
- [ ] Etiquetas flotantes dentro de pantalla y sin pisar el texto ni la interfaz de abajo.
- [ ] Un solo acento por pantalla; contraste del texto ≥ 7:1 con su fondo (proyector).
- [ ] Títulos de 2 a 3 líneas cortas, una idea por diapositiva, párrafos de ≤ 25 palabras.
- [ ] Cifras reales con su fuente en las notas (`<aside class="notas">`) cuando corresponda.
- [ ] Sin errores en la consola; el `.html` final abre con doble clic, sin servidor ni internet.
- [ ] Probado en el ancho de captura y mirado diapositiva por diapositiva.

## Notas

- **Rendimiento**: una sola luz con sombra, solo las estaciones vecinas visibles y todo precompilado durante el cargador (ya lo hace el motor). Mantené cada estación por debajo de ~150 mallas; para muchos objetos iguales usá pocas geometrías compartidas.
- **Sin WebGL** la presentación sigue andando con el fondo del tema y el texto.
- **Movimiento reducido** (`prefers-reduced-motion`): los viajes pasan a ser cortes y el texto aparece con un fundido.
- **Marcas reales**: el logo se compone en texto con tipografía libre; no se incrustan logos oficiales.
