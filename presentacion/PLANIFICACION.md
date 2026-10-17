# 🎤 Presentación interactiva — Planificación

> La presentación se hace en **HTML**, con el mismo [design system](../design-system/README.md) y el mismo servidor que el juego [Drop Rush](../juego/PLANIFICACION.md).
> La idea central: **la presentación es un *drop***. La clase no mira una exposición sobre el hype, lo vive desde el primer minuto.
>
> 📝 Los **contenidos** de cada bloque todavía no están definidos. Este plan describe el formato, las interacciones y la técnica; el texto, las imágenes y los videos se cargan después sin tocar el motor.

---

## 1. Por qué HTML

- **Coherencia estética:** el mismo design system que el juego, sin copiar colores a mano en otra herramienta.
- **Interactividad real:** los 40 celulares se conectan con el QR de la portada y quedan conectados hasta el juego. Ese mismo canal sirve para la presentación.
- **Novedad:** cosas que Slides o Canva no pueden hacer, como un drop en vivo, resultados de una votación en tiempo real o feeds con video.
- **Un solo sistema:** una URL, un QR, un servidor y una sola prueba en el Wi-Fi de la facultad.

---

## 2. Las 4 ideas elegidas

### 2.1 Drop falso de apertura 🛒

**Qué es.** En la portada hay una cuenta regresiva y el QR. Al llegar a cero, en todos los celulares aparece un botón **COMPRAR**. Hay **una sola sudadera**: la consigue el primer grupo que toca y los demás ven **SOLD OUT**.

**Para qué.**
- **Gancho:** *"Lo que acaban de sentir es el modelo de negocio de Nude Project"* (drops limitados, urgencia, exclusividad, hype).
- **Prueba técnica:** antes del juego se confirma que los 40 celulares están conectados.
- **Hilo narrativo:** el final del juego repite lo mismo (un ganador, 39 sin sudadera) y cierra el debate sobre exclusividad vs. accesibilidad.

**Cómo se ve.**

| Momento | 📽️ Proyector | 📱 Celular |
|---|---|---|
| Espera | Portada (tema cacao), QR grande, *"Nuevo drop en 00:10"* y cuántos grupos están conectados (*"34/40 en la cola"*) | *"Esperando el drop…"* con el número del grupo |
| 3, 2, 1 | Cuenta regresiva gigante | Cuenta regresiva sincronizada |
| ¡Drop! | Cartel **QUEDA 1** latiendo | Botón **COMPRAR** a pantalla completa (mostaza) |
| Resultado (al instante) | *"Grupo 23 se llevó la sudadera en 0,41 s"*, sello **SOLD OUT** y el top 5 de los más rápidos | Ganador: *"¡Es tuya!"* · Resto: **SOLD OUT** y *"Llegaste 0,8 s tarde"* |

**Reglas.**
- Un toque por grupo; los siguientes se ignoran.
- Gana el primer toque que **llega al servidor**: igual que en un drop real, la conexión también cuenta. Se puede comentar en el debate.
- La cuenta regresiva usa la **sincronización de reloj** que ya está planeada para el juego, así todos los celulares ven el "¡ya!" al mismo tiempo.
- El presentador lanza el drop con una tecla, cuando ve suficientes grupos conectados.

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
- Se **retoma** en el bloque de desafíos y en el debate final, junto al resultado del drop falso y del juego: *"El 70 % dijo que sí… y 39 de 40 grupos se quedaron sin sudadera"*.

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
- 📝 **Contenido pendiente:** elegir 4 a 6 publicaciones por lado (ver sección 7).

---

## 3. Tiempos

La interactividad se come minutos de la exposición, así que va **dentro** de los tiempos de [`README.md`](README.md):

| Bloque | Tiempo | Interacción |
|---|---|---|
| **Antes de empezar** (mientras la clase se acomoda) | — | QR en pantalla: los grupos entran y eligen su número |
| 0. Portada | 1 min | **Drop falso** (~40 s con resultado) |
| 1. La historia y los drops | 2 min | **Votación** abierta (~20 s) |
| 2. EGC vs. UGC | 3 min | **Feeds** |
| 3 a 6 | 7,5 min | — |
| 7. Desafíos | 1,5 min | Se retoma la votación |
| 8. Drop Rush | 7 min | La **cola** llega a la puerta → juego |
| **Total** | **22 min** | |

La **cola** está presente todo el tiempo y no suma minutos.

---

## 4. Modo presentador y seguridad

- **Dos ventanas:** el proyector muestra la presentación y la notebook muestra el **modo presentador**:
  - diapositiva actual y siguiente;
  - notas del orador;
  - **cronómetro por bloque**, que se pone en mostaza al quedar 20 s y en ladrillo al pasarse;
  - estado del drop y de la votación, y cantidad de grupos conectados.
  - Las dos ventanas se sincronizan en la misma compu (`BroadcastChannel`), sin pasar por el servidor.
- **Controles de teclado** (también sirven con un control de diapositivas):

| Tecla | Acción |
|---|---|
| → / Espacio / ↓ | Siguiente |
| ← / ↑ | Anterior |
| `D` | Lanzar el drop falso |
| `V` | Abrir o cerrar la votación |
| `F` | Pausar o reanudar los feeds |
| `P` | Abrir el modo presentador |
| `B` | Pantalla en cacao (pausa) |

- **Sin internet:** fotos, videos y tipografías van dentro del repositorio; nada se carga en vivo desde Instagram o TikTok.
- **Si el servidor falla:** la presentación sigue funcionando sola. Las diapositivas interactivas muestran una versión estática (por ejemplo, el resultado de un drop de ensayo) y se pueden saltar.
- **Respaldo en PDF:** imprimir desde el navegador genera un PDF con una diapositiva por página.
- **Proyector:** todo escala con el ancho de la diapositiva (16:9) y respeta los tamaños del design system; probar antes en el aula.

---

## 5. Arquitectura técnica

### 5.1 Un solo servidor
El servidor de Node del juego también sirve la presentación y maneja sus eventos. El celular de cada grupo entra **una sola vez** (QR → elegir número de grupo) y la misma sesión pasa por tres etapas:

```
[Presentación: espera / drop falso / votación] → [Lobby del juego] → [Drop Rush]
```

Así se reutiliza todo lo ya planeado para el juego: salas, un celular por grupo, tokens de dispositivo, reconexión invisible y sincronización de reloj.

### 5.2 Motor de diapositivas
Liviano y propio, sin frameworks:
- Cada diapositiva es un `<section class="np-diapo">` del design system, con sus notas en un `<aside class="notas">`.
- `deck.js` se encarga de la navegación, el teclado, el escalado 16:9, el cronómetro, el modo presentador y el modo impresión.
- Los componentes interactivos son módulos separados que se "enganchan" a una diapositiva por un atributo (por ejemplo, `data-interactivo="drop"`).
- **Contenido separado del motor:** agregar o cambiar una diapositiva es editar HTML con las clases `np-*`, sin tocar JavaScript.

### 5.3 Estructura propuesta
```
presentacion/
├── README.md            # Estructura y tiempos por bloque
├── PLANIFICACION.md     # Este plan
├── index.html           # Presentación (pantalla del proyector)
├── presentador.html     # Modo presentador (notas, próxima, cronómetro)
├── estilos.css          # Solo layout propio; importa el design system
├── deck.js              # Navegación, teclado, escalado, cronómetro, BroadcastChannel, impresión
├── interactivo/
│   ├── drop.js          # Drop falso (proyector)
│   ├── votacion.js      # Votación en vivo (proyector)
│   ├── cola.js          # Cola de la tienda / barra de progreso
│   └── feeds.js         # Feeds EGC vs. UGC
├── datos/
│   ├── votacion.json    # Pregunta y opciones
│   └── feeds.json       # Publicaciones de cada feed (archivo, cuenta, cifra)
└── media/               # Fotos y clips de video comprimidos
```
Del lado del **celular** no hay una app aparte: las pantallas de espera, drop y votación son fases más del controlador del juego (`juego/public/play/`). Del lado del **servidor**, un módulo `juego/server/presentacion.js` maneja el drop y la votación.

### 5.4 Eventos de Socket.io (borrador)

| Dirección | Evento | Datos |
|---|---|---|
| presentación → server | `pres:drop:preparar` | `{ segundos }` (duración de la cuenta regresiva) |
| server → todos | `pres:drop:cuenta` | `{ empiezaEn }` (hora del servidor) |
| celular → server | `pres:drop:comprar` | `{}` (el server registra la hora de llegada) |
| server → todos | `pres:drop:resultado` | `{ ganador, tiempoGanador, top5, intentos }` |
| presentación → server | `pres:votacion:abrir` / `pres:votacion:cerrar` | `{ id }` |
| server → celulares | `pres:votacion:pregunta` | `{ id, pregunta, opciones }` |
| celular → server | `pres:votacion:votar` | `{ id, opcion }` |
| server → presentación | `pres:votacion:conteo` | `{ id, votos: [n, n, n], votaron, conectados }` |
| server → presentación | `pres:grupos` | `[{ numero, color, conectado }]` (para la cola y el contador) |

- El servidor guarda el resultado del drop y de la votación para retomarlos en el debate, aunque se recargue la página.
- Un celular que se reconecta recibe el estado actual (por ejemplo, la votación abierta) con el mismo `state:sync` del juego.

### 5.5 Medios
- **Videos:** MP4 (H.264), 720p o menos, 5 a 10 s, sin audio; objetivo **< 2 MB por clip**.
- **Fotos:** WebP o JPG de 1600 px como máximo.
- Se precargan las del bloque siguiente para que no haya saltos.
- **Créditos:** cada publicación muestra su cuenta de origen (uso académico).

---

## 6. Plan de trabajo

### Fase 0: Motor y plantilla
- [ ] `deck.js`: navegación, teclado, escalado 16:9, modo impresión
- [ ] Plantilla con una diapositiva vacía por bloque (títulos provisorios y marcadores de contenido)
- [ ] Modo presentador: notas, próxima diapositiva y cronómetro por bloque

### Fase 1: Interacciones sin servidor
- [ ] Cola de la tienda (avance por bloque y apertura de la puerta)
- [ ] Feeds EGC vs. UGC con contenido de prueba y `feeds.json`

### Fase 2: Interacciones con servidor
*Depende de la Fase 1 del juego: salas, grupos, tokens y sincronización de reloj.*
- [ ] Pantallas de espera, drop y votación en el celular
- [ ] Drop falso: cuenta regresiva sincronizada, primer toque y resultado
- [ ] Votación en vivo con conteo y resultado guardado
- [ ] Cola formada por los grupos conectados (opcional)
- [ ] Versión estática de respaldo si el servidor no responde
- [ ] Prueba con los 40 bots del juego

### Fase 3: Contenido y ensayo
- [ ] Cargar el contenido de cada bloque (sección 7)
- [ ] Ensayo con cronómetro: 15 min de exposición + 7 min de juego
- [ ] Prueba en el aula: proyector, Wi-Fi y control de diapositivas
- [ ] Exportar el PDF de respaldo

---

## 7. Contenido pendiente (a cargo del equipo)

- [ ] Texto e imágenes de cada bloque (ver [`README.md`](README.md))
- [ ] 4 a 6 publicaciones **EGC** y 4 a 6 **UGC** para los feeds (descargar los clips y anotar cuenta y cifras)
- [ ] Campaña o publicación viral a analizar
- [ ] Métricas públicas actualizadas, con sus fuentes
- [ ] Pregunta definitiva de la votación y sus opciones
- [ ] Notas del orador por diapositiva y quién presenta cada bloque

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pocos grupos conectados al momento del drop | Mostrar el QR desde antes de empezar; el presentador lanza el drop cuando ve el contador alto |
| La interactividad se come los 15 minutos | Tiempos fijos por interacción (sección 3) y cronómetro en el modo presentador |
| El servidor o el Wi-Fi fallan | La presentación funciona sola, con versiones estáticas y PDF de respaldo |
| Videos pesados o que se traban | Clips cortos y comprimidos, guardados en el repositorio y precargados |
| Distracción con el celular | El celular solo muestra algo durante el drop y la votación; el resto del tiempo, una pantalla de espera quieta |
| Derechos de las publicaciones | Uso académico, con la cuenta de origen visible en cada una |
