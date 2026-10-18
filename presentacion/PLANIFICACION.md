# 🎤 Presentación interactiva — Planificación

> La presentación se hace en **HTML**, con el mismo [design system](../design-system/README.md) y el mismo servidor que el juego [Drop Rush](../juego/PLANIFICACION.md).
> La idea central: **la presentación es un *drop***. La clase no mira una exposición sobre el hype, lo vive desde el primer minuto.
> Visualmente es el **lanzamiento de un producto**: una sudadera 3D estilo *clay* que protagoniza cada bloque (ver sección 3).
>
> 📝 Los **contenidos** de cada bloque todavía no están definidos. Este plan describe el formato, las interacciones y la técnica; el texto, las imágenes y los videos se cargan después sin tocar el motor.

---

## 1. Por qué HTML

- **Coherencia estética:** el mismo design system que el juego, sin copiar colores a mano en otra herramienta.
- **Interactividad real:** los 40 celulares se conectan con el QR de la portada y quedan conectados hasta el juego. Ese mismo canal sirve para la presentación.
- **Novedad:** cosas que Slides o Canva no pueden hacer, como un hype en vivo entre 40 celulares, resultados de una votación en tiempo real o feeds con video.
- **Un solo sistema:** una URL, un QR, un servidor y una sola prueba en el Wi-Fi de la facultad.

---

## 2. Las 4 ideas elegidas

### 2.1 Hype colectivo de apertura 🔥

**Qué es.** En la portada están el QR y el contador de grupos conectados. El presentador lanza una cuenta regresiva y, al llegar a cero, en todos los celulares aparece un botón **HYPE**. Cada toque suma a un **medidor de hype** que la clase llena **entre todos**. Cuando llega al 100 %, la sudadera cae al pedestal: el drop sale porque la comunidad lo pidió. No hay ganador ni perdedores.

**Para qué.**
- **Gancho:** *"Ningún drop de Nude Project sale de la nada: antes de lanzarlo, la comunidad ya lo está pidiendo. Lo que acaban de hacer entre los 40 es eso: hype."*
- **Prueba técnica:** antes del juego se confirma que los 40 celulares están conectados y que sus toques llegan al servidor.
- **Hilo narrativo:** la apertura es lo opuesto al final. Al principio la clase muestra la **comunidad** (todos suman para lo mismo); en el juego aparece la **escasez** (queda 1 y gana un solo grupo). Esa tensión es el debate de exclusividad vs. accesibilidad del bloque 7: *"Al principio llenaron el hype entre los 40… y al final 39 se quedaron sin sudadera"*.

**Cómo se ve.**

| Momento | 📽️ Proyector | 📱 Celular |
|---|---|---|
| Espera | Portada (tema cacao), QR grande y cuántos grupos están conectados (*"34/40 en la cola"*) | *"Esperando el drop…"* con el número del grupo |
| 3, 2, 1 | Cuenta regresiva gigante | Cuenta regresiva sincronizada |
| ¡Hype! (~10 a 15 s) | **Medidor de hype** que se llena en vivo, con el porcentaje y los toques. Debajo, una ficha por grupo que se enciende con su color cuando ese grupo empieza a tocar (*"38/40 grupos sumando"*) | Botón **HYPE** a pantalla completa (mostaza) que late con cada toque, y debajo el aporte del grupo (*"Sumaron 64 toques"*) |
| ¡Drop! (al llegar al 100 %) | La sudadera cae al pedestal, lluvia de papelitos con los colores de los grupos y *"40 grupos, 1.832 toques: el drop salió"* | *"¡Lo lograron entre todos!"* y el aporte del grupo |

**Reglas.**
- La meta se calcula con los grupos conectados al lanzar (por ejemplo, **25 toques por grupo**), así el medidor tarda lo mismo con 25 grupos que con 40. El valor se ajusta en el ensayo.
- Cada celular cuenta como máximo **8 toques por segundo**: tocar con varios dedos o con un auto-clicker no rinde más. Así pesa que toquen todos, no que uno toque mucho.
- El proyector **no muestra un ranking** de grupos: el mensaje es colectivo.
- Si a los 25 s el medidor no se llenó, el presentador lo completa con la misma tecla y el drop sale igual.
- La cuenta regresiva usa la **sincronización de reloj** que ya está planeada para el juego, así todos los celulares arrancan al mismo tiempo.
- El presentador lanza el hype con una tecla, cuando ve suficientes grupos conectados.

### 2.2 La cola de la tienda como barra de progreso 🚶🚶🚶🏬

**Qué es.** Una franja fina al pie de cada diapositiva: una **fila de personitas** que avanza hacia la puerta de la **Nude House** a medida que pasan los bloques.

**Detalles.**
- Siluetas planas en cacao (o crema sobre fondo cacao). Una de ellas, la que "somos nosotros", va en mostaza.
- Avanza **por bloque**, no por diapositiva, para que el salto se note. Muestra discretamente el número de bloque.
- **Opcional:** la cola la forman los **grupos conectados**, cada personita con el color de su grupo (los 40 colores del design system). Así la clase se ve a sí misma esperando.
- En el **último bloque** la fila llega a la puerta, la puerta se abre y aparece el cartel **QUEDA 1**: es la transición directa a Drop Rush.
- No compite con el contenido: altura máxima ~5 % de la diapositiva y sin animación mientras se habla, solo al cambiar de bloque.

### 2.3 Una votación en vivo 🗳️

**Qué es.** Una sola pregunta que la clase responde desde el celular, con el resultado en vivo en el proyector.

**Pregunta sugerida (a confirmar con el contenido):** *"¿Pagarías 90 € por una sudadera que se agota en minutos?"* — Sí / No / Depende.

**Cuándo.**
- Se **abre** en el bloque de la historia y los drops, durante ~20 s, y las barras se llenan en vivo mientras se sigue hablando.
- Se **retoma** en el bloque de desafíos y en el debate final, junto al hype de apertura y al resultado del juego: *"El 70 % dijo que sí; al principio llenaron el hype entre los 40… y al final 39 se quedaron sin sudadera"*.

**Detalles.**
- Un voto por grupo, se puede cambiar mientras la votación está abierta.
- Barras horizontales grandes (cacao sobre crema) con el porcentaje y la cantidad de votos; se ve cuántos grupos votaron (*"31/40"*).
- La pregunta y las opciones se definen en un archivo de datos, así se cambian sin tocar código.

### 2.4 Feeds de EGC vs. UGC 📱📱

**Qué es.** En el bloque de EGC vs. UGC, la pantalla se parte en dos **feeds verticales 9:16** que se desplazan solos, como Instagram o TikTok:

| Izquierda: **EGC** | Derecha: **UGC** |
|---|---|
| Contenido de Bruno, Álex y el equipo: reuniones, viajes de producción, procesos, podcast | Contenido de la comunidad: filas en las tiendas, outfits, eventos, reacciones |

**Detalles.**
- Cada feed pasa una publicación cada ~4 s con una transición de desplazamiento vertical. Los videos se reproducen **en silencio y en bucle** (clips de 5 a 10 s).
- Cada publicación muestra la cuenta (@usuario) y, si suma, la cifra de likes o vistas.
- El presentador puede **pausar** un feed para comentar una publicación puntual.
- Se ve la diferencia antes de explicarla: quién habla, cómo se ve, qué se muestra.
- 📝 **Contenido pendiente:** elegir 4 a 6 publicaciones por lado (ver sección 8).

---

## 3. Dirección visual: la sudadera como producto

> **Concepto:** la presentación es el **lanzamiento de un producto**, al estilo de una keynote de Apple. Hay un solo protagonista 3D, **la sudadera Nude Project**, que está en escena de principio a fin: gira, cambia de color, se desarma en piezas con datos, se multiplica en gráficos y, al final, queda **una sola** con el cartel *QUEDA 1*.
>
> **Estilo: clay.** Formas redondeadas y suaves, sin texturas, colores mate de la marca e iluminación de estudio con sombras suaves: el look *clay render* de las campañas 3D actuales. Es más premium que el low-poly del juego, pero también se genera **por código**.

### 3.1 Lenguaje visual

| Elemento | Cómo se ve |
|---|---|
| **Escenario** | Estudio infinito (un ciclorama sin horizonte) en crema o en cacao, según el tema de la diapositiva. Un pedestal cilíndrico bajo y redondeado. |
| **Luz** | Luz principal cálida desde arriba a la izquierda, luz de relleno suave y una luz de contorno que separa la prenda del fondo. Luz ambiente cálida (tonos Nude House). |
| **Sombras** | Sombra de contacto difusa bajo la prenda (un plano con degradado, barato) y oclusión ambiental suave en los pliegues. Sin sombras duras. |
| **Material** | Mate (rugosidad alta, sin brillo metálico) con un leve brillo de tela (*sheen*) en los bordes, para que se lea como algodón grueso. |
| **Colorways** | Un color por bloque, todos del design system: cacao, crema, arena, mostaza, marino, bosque y rosa. La prenda cambia de color con un fundido mientras gira. |
| **Layout** | Editorial: el texto ocupa ~5/12 del ancho (a la izquierda) y la sudadera ~7/12 (a la derecha). En las diapositivas de cita o de cifra gigante, la sudadera pasa al fondo, desenfocada. |
| **Texto animado** | Los títulos aparecen línea por línea, subiendo desde una máscara. Las cifras cuentan desde 0. En los separadores corre una cinta: *DROP 001 — QUEDA 1 — DROP 001 —*. |
| **Grano** | Un grano de película muy leve sobre todo, para que no se vea "plástico". |

### 3.2 La sudadera, por código
Se arma en Three.js con piezas redondeadas que se unen y suavizan:
- **Cuerpo:** caja con bordes muy redondeados, levemente deformada (más ancha abajo, hombros caídos).
- **Capucha:** casquete de esfera aplanado, apoyado sobre la espalda, con el borde engrosado.
- **Mangas:** tubos que siguen una curva suave (relajadas, con un leve pliegue en el codo).
- **Puños y cintura:** anillos acanalados (rib), un poco más angostos que la manga.
- **Bolsillo canguro**, **cordones** con sus puntas y el **logo *Nude® Project* bordado** en el pecho (texto en relieve muy leve, del mismo color o en crema).
- Las piezas son **independientes**, para poder separarlas en la vista desarmada (bloque 5) y animarlas por separado.
- El mismo modelo se puede usar después **en el juego**: en la vidriera de la tienda de la meta y en la pantalla del ganador.

### 3.3 Guion visual por bloque

| Bloque | Qué hace la sudadera | Colorway |
|---|---|---|
| **0. Portada + hype colectivo** | Gira lenta sobre el pedestal, bajo un foco. En la cuenta regresiva la luz se apaga y la sudadera sube fuera de cuadro. Mientras se llena el medidor, el foco vuelve a encenderse de a poco y la sudadera baja en proporción al hype. Al 100 % cae al pedestal con un pequeño rebote, entre papelitos con los colores de los grupos. El sello **SOLD OUT** se guarda para el final del juego. | Cacao |
| **1. La historia** | Aparece dentro de una caja de envío de cartón (la de los primeros pedidos desde la habitación). Mientras pasan los años 2019 → hoy, la caja se multiplica y la sudadera cambia de color en cada año. | Crema |
| **2. EGC vs. UGC** | Queda en el centro entre los dos feeds y gira hacia el lado que se está comentando. | Arena |
| **3. Marketing viral** | Corazones rosas en 3D salen de la prenda y orbitan alrededor mientras un contador de vistas sube a la cifra real. | Rosa |
| **4. Marketing experiencial** | Se cuelga de una percha y la cámara retrocede: aparece un rincón mínimo de la Nude House (perchero, sillón, una planta, una pila de vinilos), todo en clay. | Bosque |
| **5. Métricas** | **Vista desarmada:** capucha, mangas, bolsillo y cuerpo se separan, y cada pieza lleva una etiqueta flotante con un dato (seguidores, engagement, vistas, facturación). Para comparar, un **gráfico de barras hecho con pilas de sudaderas dobladas**. | Marino |
| **6. Objetivo comunicacional** | La cámara se acerca al pecho hasta llenar la pantalla con el logo bordado; la frase de Bruno se escribe encima. | Cacao |
| **7. Desafíos** | Una **balanza** clay: de un lado *exclusividad*, del otro *accesibilidad*. Se inclina según el resultado de la votación en vivo. | Mostaza |
| **8. Drop Rush** | Vuelve a estar sola en el pedestal con el cartel **QUEDA 1**. La cámara retrocede, aparece la vidriera de la tienda y la calle: transición directa al juego. | Cacao |

Las transiciones entre bloques son **movimientos continuos de cámara y de la prenda** (~0,8 s), nunca cortes: la sudadera no desaparece entre diapositivas.

### 3.4 Técnica
- **Three.js** para el 3D y **GSAP** para animar cámara, prenda y texto en una misma línea de tiempo. Las dos librerías se guardan dentro del repositorio para funcionar sin internet.
- **Valores del design system:** colores del estudio y las luces, material, grano, colorways por bloque y duraciones salen de [`tokens.js`](../design-system/tokens.js) (`colores3d.presentacion`, `tokens.escena`, `colorwayDeBloque(n)`, `segundos('escena')`). Ver la [sección 3.1 del design system](../design-system/README.md#31-escena-3d-de-la-presentación).
- **Un solo canvas 3D** fijo detrás de todas las diapositivas. Cada diapositiva declara su escena con un atributo (por ejemplo, `data-escena="metricas"`) y el motor anima la transición hacia ella. Ir para atrás funciona igual.
- **Guion como datos:** cada escena (color, posición de la cámara, pose de la prenda y objetos extra) se define en un archivo, así se ajusta sin tocar el motor.
- **Rendimiento:** corre en la notebook del presentador, no en los celulares, pero puede tener una placa de video integrada. Objetivo: **60 fps a 1080p**, con la resolución interna limitada a 1,5×, la sombra de contacto falsa (sin mapas de sombras en tiempo real) y el render pausado cuando nada se mueve.
- **Respaldos:**
  - Si WebGL no está disponible, cada escena se reemplaza por una **imagen pre-renderizada** (las mismas imágenes sirven para el PDF).
  - Con `prefers-reduced-motion`, las transiciones pasan a ser fundidos cortos.
- **Gráficos de datos 2D** (líneas, barras simples): SVG animado con la paleta del design system.

---

## 4. Tiempos

La interactividad se come minutos de la exposición, así que va **dentro** de los tiempos de [`README.md`](README.md):

| Bloque | Tiempo | Interacción |
|---|---|---|
| **Antes de empezar** (mientras la clase se acomoda) | — | QR en pantalla: los grupos entran y eligen su número |
| 0. Portada | 1 min | **Hype colectivo** (~40 s con la cuenta y el drop) |
| 1. La historia y los drops | 2 min | **Votación** abierta (~20 s) |
| 2. EGC vs. UGC | 3 min | **Feeds** |
| 3 a 6 | 7,5 min | — |
| 7. Desafíos | 1,5 min | Se retoma la votación |
| 8. Drop Rush | 7 min | La **cola** llega a la puerta → juego |
| **Total** | **22 min** | |

La **cola** está presente todo el tiempo y no suma minutos.

---

## 5. Modo presentador y seguridad

- **Dos ventanas:** el proyector muestra la presentación y la notebook muestra el **modo presentador**:
  - diapositiva actual y siguiente;
  - notas del orador;
  - **cronómetro por bloque**, que se pone en mostaza al quedar 20 s y en ladrillo al pasarse;
  - estado del hype y de la votación, y cantidad de grupos conectados.
  - Las dos ventanas se sincronizan en la misma compu (`BroadcastChannel`), sin pasar por el servidor.
- **Controles de teclado** (también sirven con un control de diapositivas):

| Tecla | Acción |
|---|---|
| → / Espacio / ↓ | Siguiente |
| ← / ↑ | Anterior |
| `H` | Lanzar el hype (y completarlo si se estanca) |
| `V` | Abrir o cerrar la votación |
| `F` | Pausar o reanudar los feeds |
| `P` | Abrir el modo presentador |
| `B` | Pantalla en cacao (pausa) |

- **Sin internet:** fotos, videos y tipografías van dentro del repositorio; nada se carga en vivo desde Instagram o TikTok.
- **Si el servidor falla:** la presentación sigue funcionando sola. Las diapositivas interactivas muestran una versión estática (por ejemplo, el medidor lleno de un hype de ensayo) y se pueden saltar.
- **Respaldo en PDF:** imprimir desde el navegador genera un PDF con una diapositiva por página.
- **Proyector:** todo escala con el ancho de la diapositiva (16:9) y respeta los tamaños del design system; probar antes en el aula.

---

## 6. Arquitectura técnica

### 6.1 Un solo servidor
El servidor de Node del juego también sirve la presentación y maneja sus eventos. El celular de cada grupo entra **una sola vez** (QR → elegir número de grupo) y la misma sesión pasa por tres etapas:

```
[Presentación: espera / hype / votación] → [Lobby del juego] → [Drop Rush]
```

Así se reutiliza todo lo ya planeado para el juego: salas, un celular por grupo, tokens de dispositivo, reconexión invisible y sincronización de reloj.

### 6.2 Motor de diapositivas
Liviano y propio, sin frameworks:
- Cada diapositiva es un `<section class="np-diapo np-diapo--escena">` del design system (transparente, para que se vea la escena 3D de atrás), con sus notas en un `<aside class="notas">`. El motor marca la actual con `np-diapo--activa`, que dispara los títulos animados.
- Los componentes visuales de las interacciones (cola, votación, feeds, hype, etiquetas 3D, modo presentador) ya están en [`components.css`](../design-system/components.css); el motor solo cambia sus variables (`--avance`, `--valor`, `--actual`, `--x`/`--y`).
- `deck.js` se encarga de la navegación, el teclado, el escalado 16:9, el cronómetro, el modo presentador y el modo impresión.
- Los componentes interactivos son módulos separados que se "enganchan" a una diapositiva por un atributo (por ejemplo, `data-interactivo="hype"`).
- **Contenido separado del motor:** agregar o cambiar una diapositiva es editar HTML con las clases `np-*`, sin tocar JavaScript.

### 6.3 Estructura propuesta
```
presentacion/
├── README.md            # Estructura y tiempos por bloque
├── PLANIFICACION.md     # Este plan
├── index.html           # Presentación (pantalla del proyector)
├── presentador.html     # Modo presentador (notas, próxima, cronómetro)
├── estilos.css          # Solo layout propio; importa el design system
├── deck.js              # Navegación, teclado, escalado, cronómetro, BroadcastChannel, impresión
├── escena/
│   ├── escena.js        # Renderer, estudio, luces, sombra de contacto, grano, pausa del render
│   ├── sudadera.js      # Modelo de la sudadera por piezas (por código)
│   ├── extras.js        # Pedestal, caja de envío, corazones, percha y rincón Nude House, pilas, balanza, vidriera
│   ├── guion.js         # Escena de cada bloque: colorway, cámara, pose y extras
│   └── transiciones.js  # Animaciones entre escenas (GSAP)
├── vendor/              # three.js y GSAP guardados localmente
├── interactivo/
│   ├── hype.js          # Hype colectivo (proyector)
│   ├── votacion.js      # Votación en vivo (proyector)
│   ├── cola.js          # Cola de la tienda / barra de progreso
│   └── feeds.js         # Feeds EGC vs. UGC
├── datos/
│   ├── votacion.json    # Pregunta y opciones
│   └── feeds.json       # Publicaciones de cada feed (archivo, cuenta, cifra)
├── media/               # Fotos y clips de video comprimidos
└── renders/             # Imágenes pre-renderizadas de cada escena (respaldo sin WebGL y PDF)
```
Del lado del **celular** no hay una app aparte: las pantallas de espera, hype y votación son fases más del controlador del juego (`juego/public/play/`). Del lado del **servidor**, un módulo `juego/server/presentacion.js` maneja el hype y la votación.

### 6.4 Eventos de Socket.io (borrador)

| Dirección | Evento | Datos |
|---|---|---|
| presentación → server | `pres:hype:preparar` | `{ segundos }` (duración de la cuenta regresiva) |
| server → todos | `pres:hype:cuenta` | `{ empiezaEn, meta }` (hora del servidor y toques necesarios) |
| celular → server | `pres:hype:toques` | `{ n }` (toques acumulados desde el último envío, cada ~200 ms) |
| server → todos | `pres:hype:nivel` | `{ toques, meta, grupos }` (unas 10 veces por segundo; `grupos` son los que ya sumaron) |
| presentación → server | `pres:hype:completar` | `{}` (el presentador lo completa si se estanca) |
| server → todos | `pres:hype:drop` | `{ toques, grupos, aportes }` (`aportes` por grupo, para mostrar en cada celular) |
| presentación → server | `pres:votacion:abrir` / `pres:votacion:cerrar` | `{ id }` |
| server → celulares | `pres:votacion:pregunta` | `{ id, pregunta, opciones }` |
| celular → server | `pres:votacion:votar` | `{ id, opcion }` |
| server → presentación | `pres:votacion:conteo` | `{ id, votos: [n, n, n], votaron, conectados }` |
| server → presentación | `pres:grupos` | `[{ numero, color, conectado }]` (para la cola y el contador) |

- El servidor guarda el resultado del hype y de la votación para retomarlos en el debate, aunque se recargue la página.
- Un celular que se reconecta recibe el estado actual (por ejemplo, la votación abierta) con el mismo `state:sync` del juego.

### 6.5 Medios
- **Videos:** MP4 (H.264), 720p o menos, 5 a 10 s, sin audio; objetivo **< 2 MB por clip**.
- **Fotos:** WebP o JPG de 1600 px como máximo.
- Se precargan las del bloque siguiente para que no haya saltos.
- **Créditos:** cada publicación muestra su cuenta de origen (uso académico).

---

## 7. Plan de trabajo

### Fase 0: Prototipo visual (riesgo primero)
- [ ] Sudadera clay por código girando en el estudio, con 2 o 3 colorways
- [ ] Una transición de cámara entre dos escenas, con texto animado encima
- [ ] Medir fps en la notebook que se va a usar y validar que se vea bien en el proyector

### Fase 1: Motor y plantilla
- [ ] `deck.js`: navegación, teclado, escalado 16:9, modo impresión
- [ ] Plantilla con una diapositiva vacía por bloque (títulos provisorios y marcadores de contenido)
- [ ] Modo presentador: notas, próxima diapositiva y cronómetro por bloque

### Fase 2: Escenas 3D
- [ ] Guion completo de escenas (sección 3.3), con sus extras: caja, corazones, percha y rincón Nude House, vista desarmada, pilas de sudaderas, balanza y vidriera
- [ ] Transiciones continuas ida y vuelta entre todas las escenas
- [ ] Imágenes pre-renderizadas de respaldo

### Fase 3: Interacciones sin servidor
- [ ] Cola de la tienda (avance por bloque y apertura de la puerta)
- [ ] Feeds EGC vs. UGC con contenido de prueba y `feeds.json`

### Fase 4: Interacciones con servidor
*Depende de la Fase 1 del juego: salas, grupos, tokens y sincronización de reloj.*
- [ ] Pantallas de espera, hype y votación en el celular
- [ ] Hype colectivo: cuenta regresiva sincronizada, medidor compartido, tope de toques y drop final
- [ ] Votación en vivo con conteo y resultado guardado
- [ ] Cola formada por los grupos conectados (opcional)
- [ ] Versión estática de respaldo si el servidor no responde
- [ ] Prueba con los 40 bots del juego

### Fase 5: Contenido y ensayo
- [ ] Cargar el contenido de cada bloque (sección 8)
- [ ] Ensayo con cronómetro: 15 min de exposición + 7 min de juego
- [ ] Prueba en el aula: proyector, Wi-Fi y control de diapositivas
- [ ] Exportar el PDF de respaldo

---

## 8. Contenido pendiente (a cargo del equipo)

- [ ] Texto e imágenes de cada bloque (ver [`README.md`](README.md))
- [ ] 4 a 6 publicaciones **EGC** y 4 a 6 **UGC** para los feeds (descargar los clips y anotar cuenta y cifras)
- [ ] Campaña o publicación viral a analizar
- [ ] Métricas públicas actualizadas, con sus fuentes
- [ ] Pregunta definitiva de la votación y sus opciones
- [ ] Notas del orador por diapositiva y quién presenta cada bloque

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pocos grupos conectados al momento del hype | Mostrar el QR desde antes de empezar; el presentador lanza el hype cuando ve el contador alto, y la meta se ajusta a los conectados |
| Muchos toques saturan el Wi-Fi o el servidor | Cada celular manda sus toques agrupados cada ~200 ms y con tope por segundo; probar con los 40 bots |
| La interactividad se come los 15 minutos | Tiempos fijos por interacción (sección 4) y cronómetro en el modo presentador |
| El servidor o el Wi-Fi fallan | La presentación funciona sola, con versiones estáticas y PDF de respaldo |
| Videos pesados o que se traban | Clips cortos y comprimidos, guardados en el repositorio y precargados |
| Distracción con el celular | El celular solo muestra algo durante el hype y la votación; el resto del tiempo, una pantalla de espera quieta |
| La sudadera por código no queda creíble | Prototipo visual primero (Fase 0) con un visor para ajustar proporciones; si no alcanza, usar un modelo 3D libre (GLTF con licencia abierta) con el mismo material clay |
| La notebook no mueve bien el 3D | Medir en la Fase 0; bajar la resolución interna o usar las imágenes pre-renderizadas |
| El 3D distrae del contenido | La sudadera acompaña, no explica: cada escena refuerza el mensaje del bloque y se mueve solo en las transiciones |
| Derechos de las publicaciones | Uso académico, con la cuenta de origen visible en cada una |
