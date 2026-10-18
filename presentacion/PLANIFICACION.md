# 🎤 Presentación interactiva — Planificación

> La presentación se hace en **HTML**, con el mismo [design system](../design-system/README.md) y el mismo servidor que el juego [Drop Rush](../juego/PLANIFICACION.md).
> La idea central: **la presentación es un *drop***. La clase no mira una exposición sobre el hype, lo vive desde el primer minuto.
> Visualmente es el **lanzamiento de un producto contado en un solo plano secuencia**: la cámara recorre una Nude House en miniatura estilo *clay* y la sudadera 3D protagoniza cada bloque (ver sección 3).
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
| Espera | Portada (tema cacao), QR y cuántos grupos están conectados (*"34/40 en la cola"*). Con `Q` (o tocando el QR), el QR ocupa casi todo el alto del proyector, con el código de la sala en grande para entrar escribiéndolo | *"Esperando el drop…"* con el número del grupo |
| 3, 2, 1 | Cuenta regresiva gigante | Cuenta regresiva sincronizada |
| ¡Hype! (~10 a 15 s) | **Medidor de hype** que se llena en vivo, con el porcentaje y los toques. Debajo, una ficha por grupo que se enciende con su color cuando ese grupo empieza a tocar (*"38/40 grupos sumando"*) | Botón **HYPE** a pantalla completa (mostaza) que late con cada toque, y debajo el aporte del grupo (*"Sumaron 64 toques"*) |
| ¡Drop! (al llegar al 100 %) | La sudadera cae al pedestal, lluvia de papelitos con los colores de los grupos y *"40 grupos, 1.832 toques: el drop salió"* | *"¡Lo lograron entre todos!"* y el aporte del grupo |

**Reglas.**
- La meta se calcula con los grupos conectados al lanzar (por ejemplo, **25 toques por grupo**), así el medidor tarda lo mismo con 25 grupos que con 40. El valor se ajusta en el ensayo (`hypeToquesPorGrupo` en [`juego/data/config.json`](../juego/data/config.json)). Con 40 bots que tocan a su ritmo (entre 4 y 12 por segundo, con el tope) el drop sale en ~4 s.
- Cada celular cuenta como máximo **8 toques por segundo** (`hypeToquesPorSegundo`, con una ráfaga de 16 para los envíos que llegan juntos): tocar con varios dedos o con un auto-clicker no rinde más. Así pesa que toquen todos, no que uno toque mucho. El celular aplica el mismo tope, así lo que muestra (*"Sumaron 64 toques"*) es lo que suma.
- El proyector **no muestra un ranking** de grupos: el mensaje es colectivo.
- Si a los 25 s el medidor no se llenó, el presentador lo completa con la misma tecla y el drop sale igual.
- La cuenta regresiva usa la **sincronización de reloj** que ya está planeada para el juego, así todos los celulares arrancan al mismo tiempo.
- El presentador lanza el hype con una tecla, cuando ve suficientes grupos conectados.

### 2.2 La cola de la tienda como barra de progreso 🚶🚶🚶🏬

**Qué es.** Abajo a la derecha, junto al número de bloque: una **fila de personas** que espera en la puerta de la **Nude House**. Es la barra de progreso de la presentación, contada como una cola de verdad.

**Cómo se lee.**
- Delante nuestro (la persona en **mostaza**, con una marca arriba) hay **tantas personas como bloques faltan**, y el texto lo dice: *"Cola del drop · 6 personas adelante"*. No hace falta explicarla.
- En cada **bloque** (no en cada diapositiva) la puerta de la tienda se abre con su luz cálida, **entra la primera** y la fila da un paso: la primera arranca enseguida y las de atrás la siguen escalonadas, con las piernas en movimiento. Para atrás, la última que entró sale.
- Detrás nuestro la fila sigue y se pierde a la izquierda: se ve larga sin ocupar más lugar.
- La tienda es una fachada con el cartel *Nude® Project*, la puerta y una vidriera con **la última sudadera**.
- En el **último bloque** nos toca: la puerta queda abierta, la luz cae sobre la vereda, el texto pasa a *"Puerta abierta · Nos toca"* y aparece el cartel **QUEDA 1** latiendo. Es la transición directa a Drop Rush.
- Las personas tienen tonos de la tinta del tema (cacao sobre crema, crema sobre cacao), así se lee como gente distinta sin sumar colores; un velo del color del tema al pie asegura el contraste aunque el piso de la escena sea claro u oscuro.
- La cola la forman los **grupos conectados**, cada persona con el color de su grupo (`--g`, los 40 colores del design system): a medida que entran los celulares, la fila se va pintando. Así la clase se ve a sí misma esperando.
- No compite con el contenido: ~8 % de alto, al pie, y **nada se mueve mientras se habla**: solo camina al cambiar de bloque.
- Técnica: el componente `np-cola` del design system; [`design-system/cola.js`](../design-system/cola.js) arma el HTML y `--bloque` mueve la fila con CSS.

### 2.3 Una votación en vivo 🗳️

**Qué es.** Una sola pregunta que la clase responde desde el celular, con el resultado en vivo en el proyector.

**Pregunta:** *"¿Pagarías 90 € por una sudadera que se agota en minutos?"* — Sí / No / Depende.

**Cuándo.**
- Se **abre** en el bloque de la historia y los drops, durante ~20 s, mientras se sigue hablando. El proyector solo muestra cuántos grupos votaron: el resultado se guarda.
- Se **retoma** en el bloque de desafíos y en el debate final, junto al hype de apertura y al resultado del juego: *"El 70 % dijo que sí; al principio llenaron el hype entre los 40… y al final 39 se quedaron sin sudadera"*.

**Detalles.**
- Un voto por grupo, se puede cambiar mientras la votación está abierta.
- Barras horizontales grandes (cacao sobre crema) con el porcentaje y la cantidad de votos; se ve cuántos grupos votaron (*"31/40"*).
- La pregunta y las opciones se definen en [`datos/votacion.json`](datos/votacion.json), así se cambian sin tocar código; cada opción dice hacia dónde inclina la **balanza** de los desafíos (exclusividad, accesibilidad o nada).
- En la historia, debajo de los hitos, una línea dice cuántos grupos votaron (*"Votación abierta · 31/40 grupos votaron"*), sin porcentajes. El resultado se **revela en los desafíos**: las barras aparecen debajo del texto (la más votada en mostaza) y la balanza se inclina. El presentador lo ve antes en su ventana.

### 2.4 Feeds de EGC vs. UGC 📱📱

**Qué es.** En el bloque de EGC vs. UGC, la pantalla se parte en dos **feeds verticales 9:16** que se desplazan solos, como Instagram o TikTok:

| Izquierda: **EGC** | Derecha: **UGC** |
|---|---|
| Contenido de Bruno, Álex y el equipo: reuniones, viajes de producción, procesos, podcast | Contenido de la comunidad: filas en las tiendas, outfits, eventos, reacciones |

**Detalles.**
- Cada feed pasa una publicación cada 8 s (`cada` en `datos/feeds.json`, lo que dura un clip) con una transición de desplazamiento vertical; el de UGC cambia a mitad de tiempo del de EGC. Cada clip arranca desde el principio al entrar y se reproduce **en silencio y en bucle**.
- Cada publicación muestra la cuenta (@usuario) y, si suma, la cifra de likes o vistas.
- El presentador puede **pausar** un feed para comentar una publicación puntual.
- Se ve la diferencia antes de explicarla: quién habla, cómo se ve, qué se muestra.
- ✅ **Contenido:** 4 publicaciones por lado, clips reales de TikTok (ver [`media/`](media/README.md)).

---

## 3. Dirección visual: un plano secuencia por la Nude House

> **Concepto:** la presentación es el **lanzamiento de un producto** y se cuenta **en una sola toma**. La cámara recorre una **Nude House en miniatura** —la habitación donde empezó todo, el salón de la tienda, la vidriera de la calle— y cada bloque es una **estación** del recorrido. La protagonista es **la sudadera Nude Project**: viaja con la cámara, gira, cambia de color, se desarma en piezas con datos y, al final, queda **una sola** en la vidriera con el cartel *QUEDA 1*.
>
> **Estilo: clay.** Formas redondeadas y suaves, sin texturas, colores mate de la marca e iluminación de estudio con sombras suaves. Todo se genera **por código**.
>
> **Referencias** ([#23](https://github.com/OctavioUlla/drop-rush-nude-project/issues/23)): el viaje continuo de la cámara por un escenario 3D de [fighterready.com](https://fighterready.com/), y los productos 3D que flotan y giran entre tipografía gigante de [lajoya-foods.com](https://lajoya-foods.com/en).
>
> 🎬 **Maqueta viva:** [`design-system/escena.html`](../design-system/escena.html) ya muestra las 9 estaciones, el viaje de cámara, la luz y el texto animado.

### 3.1 Lo que la hace premium

| Recurso | Cómo se ve |
|---|---|
| **Un solo plano** | Nunca hay un corte. Entre bloques, la cámara hace un **travelling con grúa** de 1,8 s: sube y retrocede a mitad de camino y baja en la estación siguiente. El fondo funde entre crema y cacao. Si el presentador apura las teclas, los viajes se encolan. |
| **Producto héroe** | Una sola sudadera, siempre en movimiento: flota, se balancea mostrando el frente y los tres cuartos, y en cada viaje da **una vuelta completa** mientras cambia de colorway. En la portada la rodean sudaderas en los neutros de la marca, flotando. |
| **Tipografía sándwich** | En la portada, *DROP 001* gigante va **detrás** de la sudadera y el título va **delante**. Las letras entran de a una. |
| **Luz de cine** | Luz cálida de estudio con sombras suaves reales, un **foco con su haz visible y polvo flotando** en la portada y en la vidriera, niebla, viñeta y grano de película. |
| **Texto coreografiado** | El texto de la estación que se va sube y desaparece al arrancar la cámara; el nuevo entra línea por línea cuando la cámara ya está llegando. |
| **Interfaz de marca** | Arriba, el logo, el **índice de los 9 bloques** (el actual subrayado, se puede hacer clic) y *Drop 001*. Abajo, el número de bloque y la **cola de la tienda**, que hace de barra de avance. |
| **Cargador** | Antes de empezar, *Preparando el drop* cuenta del 0 al 100 % mientras se compila la escena, y se abre como un telón. |

### 3.2 La sudadera, por código
Se arma en Three.js con piezas redondeadas (ver [`escena/sudadera.js`](../design-system/escena/sudadera.js)):
- **Cuerpo:** caja con bordes muy redondeados, más ancha abajo, con panza suave y hombros caídos; **cintura acanalada**.
- **Capucha:** casquete aplanado apoyado sobre la espalda y borde engrosado alrededor del cuello.
- **Mangas:** tubos que se afinan siguiendo una curva suave (con un leve pliegue en el codo), hombro redondo y **puño acanalado**.
- **Bolsillo canguro**, **cordones** con sus puntas y el **logo *Nude® Project* bordado** en el pecho, en crema sobre colores oscuros y en cacao sobre los claros.
- Material de algodón grueso: mate, sin brillo metálico, con un leve brillo de tela (*sheen*) en los bordes.
- Las piezas son **independientes**, para separarlas en la vista desarmada (bloque 5).
- El mismo modelo se puede usar después **en el juego**: en la vidriera de la tienda de la meta y en la pantalla del ganador.

### 3.3 Guion visual por estación

| Estación | Qué pasa | Colorway |
|---|---|---|
| **0. Portada + hype colectivo** | Estudio cacao. Pedestal bajo un foco con su haz y polvo; sudaderas crema, arena y piedra flotan alrededor; *DROP 001* gigante detrás. Al terminar el cargador, la sudadera **cae al pedestal con un rebote**. En el hype: en la cuenta regresiva la luz se apaga y la sudadera sube fuera de cuadro; mientras se llena el medidor, el foco vuelve y la sudadera baja en proporción al hype; al 100 % cae entre papelitos con los colores de los grupos. | Cacao |
| **1. La historia** | **La habitación**: ventana con luz, cama y una pila de cajas de envío. La sudadera levita sobre la caja abierta del pedido #0001 (solapas abiertas, papel de seda, etiqueta de envío y una luz cálida que sale de adentro). En la segunda diapositiva, los hitos 600 € → 26 M€ en la columna del texto. | Crema |
| **2. EGC vs. UGC** | Dos **celulares gigantes** en su soporte, con feeds verticales que pasan solos (publicaciones de `datos/feeds.json`, `F` los pausa) y una etiqueta debajo de cada uno; la sudadera, en el centro sobre un pedestal, gira hacia uno y otro. | Arena |
| **3. Marketing viral** | Una **pared de 24 celulares** con la publicación de *Out of Office* y su contador de likes, y **corazones *clay*** que brotan de las pantallas como likes en vivo. La prenda se corre hacia el texto y tapa apenas una esquina de la pared. En el texto, la cifra cuenta hasta +500.000. | Rosa |
| **4. Marketing experiencial** | **El salón de la Nude House**: pared de acento marrón con el neón *Nude House* sobre una pared de cuadros (fotos reales de la Nude House de Madrid y de la Mansion de Ibiza, enmarcadas, con su crédito en el paspartú; la segunda diapositiva acerca la cámara hasta ellas), piso de madera, alfombra, perchero con sudaderas (cada una en su percha), estante con vinilos y tocadiscos, planta y lámpara de pie. La sudadera cuelga de frente en un perchero de exhibición: la percha sale por el escote y el gancho abraza la barra. | Bosque |
| **5. Métricas** | **Vista desarmada:** capucha, mangas, bolsillo y cuerpo se separan, y cada pieza lleva una **etiqueta flotante** con un dato. En la segunda diapositiva la cámara se corre a un **gráfico de barras hecho con pilas de sudaderas dobladas** (100 mil seguidores cada una, 2024 contra hoy) y la sudadera, armada, corona la más alta. | Marino |
| **6. Objetivo comunicacional** | **Plano medio** de la sudadera sola, girada hacia la frase de Bruno, con el logo bordado bien grande; la frase en la columna libre de la izquierda. | Cacao |
| **7. Desafíos** | Una **balanza** *clay*: cada plato cuelga de un aro con tres hilos que quedan por fuera de lo que lleva. De un lado, una sola sudadera (*exclusividad*); del otro, una pila (*accesibilidad*), con una etiqueta debajo de cada plato. Se inclina según la votación en vivo. | Mostaza |
| **8. Drop Rush** | **La calle y la vidriera** de la tienda, de noche, con el cartel *Nude® Project*. Adentro, la última sudadera bajo un foco. Cartel **QUEDA 1** latiendo → juego. | Cacao |

### 3.4 Técnica
- **Three.js** para el 3D y **GSAP** para animar cámara, prenda y texto en una misma línea de tiempo. Las dos librerías se guardan dentro del repositorio para funcionar sin internet.
- **Valores del design system:** colores del estudio y las luces, material, cámara, recorrido, polvo, viñeta, grano, colorways por bloque y duraciones salen de [`tokens.js`](../design-system/tokens.js) (`colores3d.presentacion`, `tokens.escena`, `colorwayDeBloque(n)`, `segundos('viaje')`). Ver la [sección 3.1 del design system](../design-system/README.md#31-escena-3d-de-la-presentación-un-plano-secuencia).
- **Punto de partida:** la maqueta viva del design system ([`escena.html`](../design-system/escena.html) y [`escena/`](../design-system/escena/)) ya resuelve la sudadera, las 9 estaciones, la luz, el viaje de cámara, el texto coreografiado, la interfaz y el cargador. La presentación la toma y le suma las diapositivas reales, las interacciones y el modo presentador.
- **Un solo canvas 3D** fijo detrás de todas las diapositivas, y un **mundo** con las 9 estaciones en fila. Cada diapositiva declara su estación con un atributo (por ejemplo, `data-escena="metricas"`) y el motor viaja hacia ella. Ir para atrás funciona igual. Varias diapositivas de un mismo bloque comparten estación: la cámara solo se acomoda (`escena`, 0,8 s).
- **Guion como datos:** cada escena (color, posición de la cámara, pose de la prenda y objetos extra) se define en un archivo, así se ajusta sin tocar el motor.
- **Rendimiento:** corre en la notebook del presentador, no en los celulares, pero puede tener una placa de video integrada. Objetivo: **60 fps a 1080p**, con la resolución interna limitada a 1,5×, **una sola luz con sombra** (que acompaña a la estación activa), solo las estaciones vecinas visibles y los shaders compilados durante el cargador.
- **Respaldos:**
  - Si WebGL no está disponible, cada escena se reemplaza por una **imagen pre-renderizada** (las mismas imágenes sirven para el PDF).
  - Con `prefers-reduced-motion`, los viajes pasan a ser cortes con fundido.
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
| 8. Drop Rush | 8 min | La **cola** llega a la puerta → juego |
| **Total** | **23 min** | |

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
| `Q` | QR a pantalla completa, para escanearlo desde el fondo del aula (y para los que llegan tarde) |
| `V` | Abrir o cerrar la votación |
| `F` | Pausar o reanudar los feeds |
| `J` | En el bloque de Drop Rush: abrir el proyector del juego (`/host/`) en la misma ventana y con la misma sala |
| `P` | Abrir el modo presentador |
| `B` | Pantalla en cacao (pausa) |

- **Sin internet:** fotos, videos y tipografías van dentro del repositorio; nada se carga en vivo desde Instagram o TikTok.
- **Si el servidor falla:** la presentación sigue funcionando sola. La portada avisa *"Sin servidor"* en lugar del QR, y `H` y `V` hacen un **ensayo** con 40 grupos simulados (lo mismo pasa con servidor pero sin celulares conectados). Si el servidor se cae en pleno hype, `H` lo completa igual y el drop sale.
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
├── presentador.js       # Modo presentador: lee las diapositivas del mismo index.html
├── comun.js             # Lo que comparten las dos ventanas (canal, lectura de diapositivas, formato del reloj)
├── medidor.js           # Medidor de fps y recorrido de prueba (fase 0)
├── vendor/              # three.js guardado localmente (npm run vendor:presentacion en juego/); GSAP, si se suma
├── interactivo/
│   ├── sala.js          # Conexión con el servidor: abre la sala del juego (la misma que /host/) y el reloj sincronizado
│   ├── hype.js          # Hype colectivo (proyector), en vivo o de ensayo
│   └── votacion.js      # Votación en vivo (proyector), en vivo o de ensayo
├── datos/
│   ├── votacion.json    # Pregunta y opciones
│   └── feeds.json       # Publicaciones de cada feed (cuenta, texto, cifra, archivo)
├── media/               # Fotos y clips de video comprimidos (ver media/README.md)
└── renders/             # Imágenes pre-renderizadas de cada encuadre (sin WebGL, PDF y miniaturas del presentador)
```
La escena 3D **no se copia**: la presentación importa [`design-system/escena/`](../design-system/escena/) (motor, sudadera, las 9 estaciones y los feeds de los celulares, que reciben `feeds.json`) y [`design-system/cola.js`](../design-system/cola.js), así la maqueta y la presentación nunca se separan.

Del lado del **celular** no hay una app aparte: las pantallas de espera, hype y votación son fases más del controlador del juego ([`juego/public/play/presentacion.js`](../juego/public/play/presentacion.js)), que tapan el runner (sin simularlo ni dibujarlo) mientras la sala está en la etapa de la presentación. Del lado del **servidor**, [`juego/server/presentacion.js`](../juego/server/presentacion.js) maneja la etapa, el hype y la votación de cada sala.

La presentación es un **proyector más de la sala**: la crea (o vuelve a la guardada) con la misma clave que usa `/host/`, así al llegar al juego los celulares ya están adentro. `socket.io-client` y el reloj sincronizado (`juego/public/shared/reloj.js`, servido en `/compartido/`) los sirve el mismo servidor; si la presentación se abre desde otro servidor, no los encuentra y se ensaya sin celulares.

### 6.4 Eventos de Socket.io

| Dirección | Evento | Datos |
|---|---|---|
| presentación → server | `pres:conectar` | `{ etapa }` → devuelve lo guardado `{ etapa, hype, votacion }` (si se recargó la página) |
| presentación → server | `pres:etapa` | `{ etapa }`: `'presentacion'` (espera, hype y votación en los celulares) o `'juego'` (al llegar al bloque de Drop Rush; también al arrancar la partida) |
| server → todos | `pres:etapa` | `{ etapa }` |
| presentación → server | `pres:hype:preparar` | `{ segundos }` (duración de la cuenta regresiva) |
| server → todos | `pres:hype:cuenta` | `{ empiezaEn, meta, conectados }` (hora del servidor y toques necesarios) |
| celular → server | `pres:hype:toques` | `{ total }` (toques acumulados en este hype, cada ~200 ms: si un envío se pierde, el siguiente lo corrige) |
| server → todos | `pres:hype:nivel` | `{ toques, meta, grupos }` (unas 10 veces por segundo; `grupos` son los que ya sumaron) |
| presentación → server | `pres:hype:completar` | `{}` (el presentador lo completa si se estanca) |
| server → todos | `pres:hype:drop` | `{ toques, meta, grupos, aportes, at }` (`aportes` por grupo, para mostrar en cada celular) |
| presentación → server | `pres:votacion:abrir` / `pres:votacion:cerrar` | `{ id, pregunta, opciones }` / `{}` (reabrir la misma pregunta conserva los votos) |
| server → todos | `pres:votacion:pregunta` | `{ id, pregunta, opciones, abierta }` |
| celular → server | `pres:votacion:votar` | `{ id, opcion, seq }` con ack (se reintenta; `seq` descarta un voto viejo que llega después de uno nuevo) |
| server → proyectores | `pres:votacion:conteo` | `{ id, pregunta, opciones, abierta, votos: [n, n, n], votaron, conectados }` |
| server → celular o proyector | `pres:estado` | Todo lo anterior al entrar o reconectar: la etapa, el hype en curso (con el aporte del grupo) y la votación (con su voto) |
| presentación → server | `pres:reiniciar` | `{}` (después de un ensayo: borra el hype y la votación guardados) |

- Los grupos conectados (para el contador, la cola y la meta del hype) son el mismo `room:groups` del juego.
- El servidor guarda el resultado del hype y de la votación para retomarlos en el debate, aunque se recargue la página: el proyector del juego los muestra en la pantalla del debate.
- Un celular que se reconecta recibe el estado actual (por ejemplo, la votación abierta) con `pres:estado`, junto al `state:sync` del juego.

### 6.5 Medios
- **Videos:** MP4 (H.264), 720p o menos, 5 a 10 s, sin audio; objetivo **< 2 MB por clip**.
- **Fotos:** WebP o JPG de 1600 px como máximo.
- Se precargan las del bloque siguiente para que no haya saltos.
- **Créditos:** cada publicación muestra su cuenta de origen (uso académico).

---

## 7. Plan de trabajo

### Fase 0: Prototipo visual (riesgo primero)
- [x] Sudadera clay por código, con todos los colorways ([maqueta viva](../design-system/escena.html))
- [x] Plano secuencia por las 9 estaciones, con texto animado encima
- [x] Medidor de rendimiento: tecla `M` (fps en vivo, resolución interna, placa de video) y `?medir` (recorrido de prueba ida y vuelta con informe para copiar). Si no llega, `?escala=1` baja la resolución interna
- [x] Primera medición: 59,6 fps de media en una notebook con Intel Arc integrada, a 1920×1080 internos (×1,5), sin trabas en los viajes
- [ ] Medir con `?medir` en la notebook que se va a usar el día de la presentación y validar que se vea bien en el proyector del aula

### Fase 1: Motor y plantilla
- [x] `deck.js`: navegación (teclado, control de diapositivas, índice, rueda y deslizar), escalado 16:9, `#n` en la URL, pantalla en pausa (`B`) y modo impresión (`?imprimir` para revisarlo en pantalla)
- [x] Plantilla con una diapositiva por bloque: títulos provisorios, marcadores de contenido pendiente y el [guion](GUION.md) como notas del orador
- [x] Modo presentador (`P`): diapositiva actual y siguiente, notas, cronómetro por bloque (mostaza a 20 s, ladrillo al pasarse) y total, y controles; se sincroniza con `BroadcastChannel`
- [x] El servidor del juego sirve la presentación en `/presentacion/`, y three.js queda guardado en `vendor/` (`npm run vendor:presentacion`)

### Fase 2: Escenas 3D
- [x] Primera versión de las 9 estaciones (sección 3.3) y del viaje ida y vuelta entre todas
- [x] Pulir cada estación con el contenido real: feeds que pasan solos en los celulares, contador de likes, hitos de la historia, etiquetas de las métricas y de la balanza, frase final
- [x] Sin solapes: ningún texto ni etiqueta queda sobre un objeto, y ningún objeto atraviesa otro (la sudadera levita sobre los apoyos, cuelga de una percha real, descansa en el plato de la balanza con los hilos por fuera y entra y sale de la percha y del plato por delante)
- [x] Poses dentro de una estación (`data-pose`): la cámara se acomoda sin viajar (pilas de las métricas)
- [x] Coreografía del hype en la portada (`H`): luz que se apaga, sudadera que sube y baja con el medidor, papelitos con los colores de los grupos (desde la fase 4, con los toques de los celulares)
- [x] Imágenes pre-renderizadas de respaldo (`renders/`, `npm run renders:presentacion`): sin WebGL, en el PDF y en las miniaturas del modo presentador

### Fase 3: Interacciones sin servidor
- [x] Cola de la tienda rediseñada: fila que espera en la puerta de la Nude House, *"N personas adelante"*, una persona entra por bloque (la puerta se abre y la fila camina escalonada), y en el último bloque la puerta queda abierta con *Queda 1* ([`design-system/cola.js`](../design-system/cola.js) y `np-cola`)
- [x] Feeds EGC vs. UGC desde [`datos/feeds.json`](datos/feeds.json): cuenta, texto, cifra (likes o vistas), foto o clip (en silencio, en bucle y solo mientras se ve) y la ilustración de prueba como respaldo si falta el archivo
- [x] Tecla `F`: pausa los dos feeds para comentar una publicación (cartel *Pausado* en los celulares y aviso en el modo presentador)

### Fase 4: Interacciones con servidor
*Depende de la Fase 1 del juego: salas, grupos, tokens y sincronización de reloj.*
- [x] La presentación abre la sala del juego (la misma que después usa `/host/`): QR y *"34/40 en la cola"* en la portada, sala en la interfaz y en el bloque de Drop Rush (`J` abre el juego). Al llegar a ese bloque, los celulares pasan solos al lobby
- [x] Pantallas de espera, hype y votación en el celular ([`juego/public/play/presentacion.js`](../juego/public/play/presentacion.js)): tapan el runner, que no se dibuja mientras tanto
- [x] Hype colectivo: cuenta regresiva sincronizada, medidor compartido, tope de toques (en el celular y en el servidor) y drop final con el aporte de cada grupo
- [x] Votación en vivo ([`datos/votacion.json`](datos/votacion.json)) con conteo, voto que se puede cambiar, resultado guardado, balanza de los desafíos y retoma en el debate del juego
- [x] Cola formada por los grupos conectados
- [x] Modo presentador: sala y grupos conectados, estado del hype y de la votación, y botones para lanzarlos y para reiniciarlos después de un ensayo
- [x] Versión de respaldo si el servidor no responde (o no hay celulares): hype y votación de ensayo con grupos simulados
- [x] Prueba con los 40 bots del juego (`npm run bots -- --presentacion`, también en `npm test`): drop con los 40 grupos, ningún celular pasa el tope (aunque 22 tocan más rápido) y el conteo coincide con el último voto de cada bot
- [ ] Probarlo con celulares reales en el Wi-Fi del aula (con la prueba del juego, ver [Ensayo en el aula](../juego/README.md#ensayo-en-el-aula))

### Fase 5: Contenido y ensayo
- [ ] Cargar el contenido de cada bloque (sección 8): el texto y las notas ya están; faltan las fotos del bloque 4 (las fuentes de las métricas ya están en `GUION.md`)
- [ ] Ensayo con cronómetro: 15 min de exposición + 8 min de juego
- [ ] Prueba en el aula: proyector, Wi-Fi y control de diapositivas
- [ ] Exportar el PDF de respaldo

---

## 8. Contenido pendiente (a cargo del equipo)

- [x] Texto de cada bloque y notas del orador (ver el [guion](GUION.md))
- [x] Fotos de la Nude House y del Château (bloque 4) *(tres cuadros en la pared del salón; fuentes en [media/README.md](media/README.md))*
- [x] 4 publicaciones **EGC** y 4 **UGC** para los feeds (clips en [`media/`](media/README.md), con cuenta y vistas)
- [x] Campaña o publicación viral a analizar: *Out of Office* (agosto de 2025)
- [x] Métricas públicas actualizadas, con sus fuentes (perfiles oficiales al 18/10/2026; ver las notas de respaldo de [`GUION.md`](GUION.md)). Falta verificar las cifras de Instagram de comienzos de 2024.
- [x] Pregunta definitiva de la votación y sus opciones (90 €, el precio habitual de una sudadera de Nude Project)
- [ ] Quién presenta cada bloque (las notas del orador ya están en cada diapositiva)

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
