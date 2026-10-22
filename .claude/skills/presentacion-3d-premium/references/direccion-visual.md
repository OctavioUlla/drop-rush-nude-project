# Dirección visual

Lo que hace que la presentación se vea como la web de lanzamiento de una marca premium y no como diapositivas.
Sale de la presentación de Nude Project (referencias: el viaje de cámara por un escenario 3D de fighterready.com y
los productos que flotan y giran entre tipografía gigante de lajoya-foods.com).

## Contenido
1. Los recursos que la hacen premium
2. Principios
3. Reglas de la escena
4. Encuadres y layouts de diapositiva
5. Paleta para cualquier tema
6. Tipografía
7. Escritura
8. Movimiento
9. Clases disponibles (estilos.css)

---

## 1. Los recursos que la hacen premium

| Recurso | Cómo se ve | Dónde vive |
|---|---|---|
| **Un solo plano** | Nunca hay un corte. Entre bloques, travelling con grúa de 1,8 s: la cámara sube y retrocede a mitad de camino y baja en la estación siguiente. El fondo funde entre el estudio claro y el oscuro. Si se apuran las teclas, los viajes se encolan. | `motor.js` |
| **Producto héroe** | Un solo objeto protagonista, siempre en movimiento: flota, se balancea mostrando el frente y los tres cuartos (nunca de espaldas) y en cada viaje da **una vuelta completa** mientras cambia de colorway. Al terminar el cargador cae al pedestal con un rebote. | `tema.js` → `crearHeroe` |
| **Tipografía sándwich** | Una palabra gigante (22 cqw) va **detrás** del héroe y el título va **delante**: el objeto queda entre dos capas de texto. Las letras entran de a una. Ideal en la portada. | `.gigante` en `index.html` |
| **Luz de cine** | Luz cálida de estudio con sombras suaves reales (una sola luz con sombra que acompaña a la cámara), foco cenital con **haz visible y polvo**, niebla del color del fondo, **viñeta** y **grano** de película. Mapeo de tonos neutro: los colores de la paleta no se lavan. | `motor.js`, `kit.foco()` |
| **Texto coreografiado** | El texto de la estación que se va sube y desaparece al arrancar la cámara; el nuevo entra línea por línea (desde una máscara) cuando la cámara ya está llegando. Lo demás entra con un fundido corto después. Las cifras cuentan desde 0. | `deck.js`, `.revelar`, `.entra`, `data-contar` |
| **Interfaz de marca** | Arriba: logo en texto, índice de bloques (el actual subrayado, clicable) y una etiqueta. Abajo: número de bloque grande y una línea de avance. | `.interfaz` |
| **Cargador** | Logo + línea que se llena del 0 al 100 % mientras se compila la escena, y se abre como un telón. | `.cargador` |
| **Decorado vivo** | Nada queda quieto del todo: el héroe flota, el polvo sube, las copias decorativas flotan y giran, el vapor o las luces se mecen. | `kit.flotante()`, `actualizar` |

## 2. Principios

1. **Dos neutros primero.** El 90 % de cualquier pantalla es el oscuro, el claro o sus intermedios. Nunca negro puro ni blanco puro: el oscuro tiene el tinte del tema (cacao, tinta azul, verde bosque) y el claro es un crema o un blanco roto.
2. **Un acento por vez.** El acento señala *una sola cosa* por pantalla (un subrayado, un cartel, la barra ganadora). **El héroe es el acento**: si su colorway es fuerte, no sumes otro acento en esa diapositiva.
3. **Tipografía como imagen.** Títulos grandes, bold, con interletra cerrada. Pocas palabras.
4. **Aire.** Una idea por diapositiva. Márgenes generosos. El vacío también es marca.
5. **Interfaz plana, escena con volumen.** Botones, etiquetas y textos son rectos y planos: sin esquinas redondeadas (salvo insignias píldora), sin sombras ni degradados. El volumen vive **solo en el 3D**.
6. **Legible en proyector.** Texto principal ≥ 7:1 contra su fondo; tamaños grandes.
7. **Calidad de lanzamiento.** Nada aparece de golpe (todo entra con su curva), nada queda quieto del todo y nunca hay un corte entre bloques.

## 3. Reglas de la escena

- **Nada de texto sobre los objetos.** El texto va sobre paredes, piso o fondo; los objetos quedan en su columna. Las etiquetas flotantes van al costado o debajo de lo que señalan, nunca encima.
- **Nada se atraviesa.** Lo que se apoya, se apoya. El héroe **levita** sobre pedestales y cajas con un hueco mayor que su amplitud de flotar (`kit.LEVITA`); si descansa sobre algo, la estación lleva `apoyada: true`.
- **Lo que queda detrás del texto es claro y de bajo contraste** (en el estudio oscuro, oscuro y de bajo contraste). Los objetos oscuros o saturados van del lado del héroe (derecha en editorial).
- **Formas redondeadas solo en el 3D.** El clay es redondo y mate; la interfaz que lo rodea sigue recta.
- **El decorado nunca compite con el héroe**: tonos apagados de la paleta (arena, piedra, verdes oliva, tierras), los saturados solo en el héroe o en una pieza de datos.
- **Escala de maqueta**: 1 unidad ≈ 1 m de maqueta, el héroe mide ~2 de alto. Las estaciones están separadas 18 m sobre el eje X; lo que construyas en una estación debe quedar dentro de ±7 m en X para no entrar en cuadro de la vecina.

## 4. Encuadres y layouts de diapositiva

Encuadre de la estación (`encuadre` en `tema.js`) y layout de la capa de texto (clase en `index.html`) van juntos:

| Encuadre | Cámara | Layout de texto | Para |
|---|---|---|---|
| `editorial` | héroe en los 7/12 de la derecha | `.capa` (por defecto): texto en los 5/12 de la izquierda, centrado en alto | la mayoría del contenido |
| `centro` | héroe al medio, un poco abajo | `.capa.capa--centro`: etiqueta + título arriba al medio; etiquetas 3D `--abajo` debajo de los objetos | comparaciones (A vs. B a los costados), la portada |
| `macro` | plano medio del héroe, a la derecha, quieto y girado hacia el texto | `.capa`: una `.cita` en la columna libre | la frase fuerte, la idea central |
| (portada) | `centro` con distancia un poco mayor | `.capa.capa--abajo`: título abajo a la izquierda | portada, separadores |

**Poses**: una estación puede tener encuadres alternativos (`poses` en `tema.js`, `data-pose` en la diapositiva): la cámara se acomoda sin viajar, el héroe se corre, cambia de tamaño o se arma/desarma. Ejemplo: en *datos*, la primera diapositiva desarma el héroe con etiquetas y la segunda (`data-pose="barras"`) corre la cámara a un gráfico de pilas con el héroe arriba de la barra más alta. Lo que queda detrás del texto en una pose no puede quedar detrás del texto en la otra.

## 5. Paleta para cualquier tema

Variables del `<style id="paleta">` (las lee también el motor 3D):

| Variable | Rol | Cómo elegirla |
|---|---|---|
| `--oscuro` | texto sobre claro, color de marca | el color del tema llevado a muy oscuro (L* 15–25), con tinte: cacao, tinta, petróleo, bordó, verde bosque |
| `--estudio-oscuro` | fondo del estudio oscuro | un escalón más profundo que `--oscuro` (si no, un héroe del color `--oscuro` desaparece) |
| `--piso-oscuro` | pedestales y estantes del estudio oscuro | un escalón más claro que `--oscuro` |
| `--claro` | fondo claro y texto sobre oscuro | blanco roto con un toque del tinte (crema, hueso, niebla) |
| `--estudio-claro` | fondo del estudio claro | igual o casi igual a `--claro` |
| `--arena`, `--piso-claro` | superficies alternas, pedestales del estudio claro | `--claro` oscurecido 5–10 % |
| `--piedra` | líneas, bordes | gris cálido o frío según el tema |
| `--oscuro-suave`, `--claro-suave` | texto secundario | `--oscuro` aclarado / `--claro` oscurecido, con contraste ≥ 4,5:1 |
| `--acento` | la única superficie de acento | un color vivo del tema (mostaza, coral, celeste eléctrico). Nunca como color de texto sobre claro si no llega a 4,5:1 |
| `--color-1…5` | colorways del héroe, uno por estación | 3 a 5 colores de la familia del tema, saturación media, que se lean contra los dos estudios |

Ejemplos de punto de partida (ajustar al tema concreto):

| Tema | oscuro / estudio | claro | acento | colorways |
|---|---|---|---|---|
| Moda, lifestyle, marca cálida | `#482922` / `#2e1914` | `#fff8ee` | `#ffe500` | `#ffc0cb` `#0b4d3b` `#103071` |
| Tecnología, software, IA | `#141b2d` / `#0b0f1a` | `#f4f6fb` | `#4cc9f0` | `#7b61ff` `#2ec4b6` `#ff6b6b` |
| Salud, ciencia, laboratorio | `#123c3a` / `#0a2524` | `#f3faf8` | `#ff8a5b` | `#5fb3a1` `#9fc5e8` `#f4d35e` |
| Finanzas, consultoría | `#1d2433` / `#121722` | `#f7f5f0` | `#d4a72c` | `#3a5a8c` `#7a9e7e` `#b85c38` |
| Naturaleza, agro, sustentabilidad | `#22331f` / `#152012` | `#f6f3e8` | `#f2a541` | `#6f8a4a` `#c8553d` `#4b7f9c` |
| Educación, historia, cultura | `#2b2238` / `#1a1423` | `#fbf6ee` | `#ef5d60` | `#e9b44c` `#50808e` `#9b5094` |

Para la luz: temas cálidos dejan los colores por defecto de `AJUSTES.luz.colores`; temas fríos (tecnología, mar, invierno) los pasan a blancos azulados en `tema.ajustes.luz.colores` (por ejemplo `principal: '#f2f6ff'`, `foco: '#e6efff'`, `ambiente: '#dfe6f2'`).

## 6. Tipografía

| Rol | Familia | Peso | Interletra |
|---|---|---|---|
| Logo (en texto) | Inter Tight | 700 | −0.055em, `®` volado con `<sup>` |
| Gigante (detrás del héroe) | Inter Tight | 800 | −0.065em, 22 cqw |
| Display / títulos | Inter Tight | 700 | −0.04em |
| Texto | Inter | 400–500 | 0 |
| Etiquetas | Inter | 500, MAYÚSCULAS | +0.08em |

Inter Tight + Inter son neo-grotescas neutras que sirven para casi todo y vienen incluidas (OFL). Si el tema pide otra voz (editorial clásica, por ejemplo), descargá los `.woff2` a `fuentes/`, agregá su `@font-face` en el `<style id="paleta">` y cambiá `--fuente-display` / `--fuente-texto`. Sin internet, quedate con Inter.

## 7. Escritura

- Títulos de 2 a 3 líneas de 1 a 3 palabras, que se lean como una frase: *"600 €, / una habitación / y un drop."*
- Una idea por diapositiva. Párrafo de apoyo ≤ 25 palabras, en `--tinta-suave`.
- La etiqueta de arriba numera el bloque: `01 — La historia`.
- Cifras grandes y redondas (`26 M€`, `+160 %`), con `data-contar` para que cuenten. Máximo 3 por diapositiva.
- Mayúsculas solo en etiquetas cortas y carteles, nunca en párrafos.
- El tono lo pone el tema y el público: cercano y en segunda persona para audiencias jóvenes; sobrio para directorio.
- Lo que el orador dice va en `<aside class="notas">` (no se ve).

## 8. Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--rapido` / `--base` / `--lento` | 120 / 220 / 420 ms | interfaz |
| `--viaje` + `--curva-viaje` | 1800 ms, `cubic-bezier(.76,0,.24,1)` | viaje de cámara (hasta 1,7× si se saltan estaciones) |
| `escena` | 800 ms | poses dentro de una estación |
| `--salida-texto` | 380 ms | el texto que se va sube |
| `--texto` + `--escalonado` | 700 ms, 90 ms por línea | títulos que suben |
| cifra | 1200 ms | cifras que cuentan |
| cargador | 1400 ms | del 0 al 100 % |

Cámara y texto usan la misma curva (`curva()` de `motor.js` convierte cualquier `cubic-bezier` de CSS en función).

## 9. Clases disponibles (estilos.css)

| Clase | Para qué |
|---|---|
| `.capa` (+ `--centro`, `--abajo`, `--derecha`) | una diapositiva; `data-escena`, `data-pose`, `data-bloque`, `data-tema` |
| `.texto` | la columna de texto de la capa |
| `.etiqueta` | etiqueta de bloque con cuadradito (`--acento-etiqueta` para colorearlo) |
| `.display`, `.titulo`, `.cita`, `.firma` | jerarquía tipográfica (display es el más grande) |
| `.revelar` + `.revelar__linea` (`--i`) | títulos que suben línea por línea: `<span class="revelar__linea" style="--i: 0"><span>…</span></span>` |
| `.entra` (`--d` para escalonar) | todo lo que no es título: entra con un fundido después de las líneas |
| `.subrayado` | subrayado grueso con el acento |
| `.datos` | hasta 3 cifras grandes con su rótulo: `<div><b><span data-contar="26">0</span> M€</b><span>Facturación</span></div>` |
| `.hitos` | línea de tiempo de 3 a 5 hitos |
| `.lista` | lista numerada corta (3 a 5 ítems) |
| `.insignia`, `.cartel` | píldora con borde / cartel de acento (la única superficie grande de acento) |
| `.etiquetas` + `.etiqueta-3d` (+ `--izquierda`, `--abajo`) | etiquetas que siguen a una pieza del héroe (`data-pieza`) o a un ancla de la estación (`data-ancla`), con `data-punto="x,y,z"` |
| `.gigante` (`data-escena`, `data-pose`) | palabra gigante detrás del héroe; `--color-gigante`, `--tamano-gigante` para ajustarla |
| `.logo` | logo compuesto en texto |
| `[data-contar]` (+ `data-decimales`) | número que cuenta desde 0 al entrar la diapositiva |

Si hace falta un componente nuevo (por ejemplo, una tabla de 2 columnas), agregalo al final de `estilos.css` siguiendo estas reglas: unidades `cqw`, colores por variables (`--tinta`, `--tinta-suave`, `--linea`, `--acento`), sin sombras ni esquinas redondeadas, y que entre con `.entra`.
