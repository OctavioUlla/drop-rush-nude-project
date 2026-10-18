# 🏃 Drop Rush · Juego

Runner 3D multijugador para el cierre de la presentación. El plan completo está en [`PLANIFICACION.md`](PLANIFICACION.md).

> **Estado: Fase 3 (red robusta, ventajas y poderes).** Se juega la partida completa con el runner 3D, los 6 obstáculos, likes, arcos de respuesta, sprint final hacia la tienda Nude Project y el mapa en vivo de los 40 grupos. Acertar da una **ventaja** para el tramo siguiente (turbo, escudo, imán o ruta VIP), 2 aciertos seguidos dan un **poder** (Cambio de algoritmo, Pase 50/50 o Hype), el último cuarto de la tabla recibe un **impulso** para emparejar y el proyector tiene **música y efectos**. Los poderes y las respuestas se reintentan hasta que el servidor los confirma, y el mapa sigue moviendo a un grupo que se quedó sin red unos segundos. El pulido visual es de la Fase 4. Las preguntas de [`data/preguntas.json`](data/preguntas.json) son un **borrador** redactado a partir del caso: falta que las revise el equipo.

## Cómo correrlo

Requiere Node.js 20 o más nuevo. Los comandos son los mismos en Windows (PowerShell o CMD), Mac y Linux.

```bash
cd juego
npm install
npm run dev          # servidor + Vite en un solo proceso, en http://localhost:3000
```

| URL | Qué es |
|---|---|
| `/host/` | Proyector: crea la sala y muestra el código, el QR y la grilla de grupos. Después, la partida, el ganador y el repaso. |
| `/play/` | Celular: escribir el código de la sala, elegir el número de grupo y correr. Mientras no hay partida, el corredor practica solo. |
| `/play/?sala=ABCD` | Lo que abre el QR: entra directo a esa sala, sin escribir el código. |
| `/play/?solo` | Celular sin servidor: práctica y una partida simulada de 3 preguntas con arcos, sprint y tienda (botón *Probar partida*). |

Parámetros extra: `/play/?debug` abre el panel de pruebas, `/play/?calidad=alta|media|baja` fija la calidad gráfica y `/host/?debug` (o 🐞) muestra la carga del servidor, las mediciones de FPS y el botón para terminar la partida.

Para producción: `npm run build` y después `npm start` (sirve `dist/` con caché `immutable` para los archivos con *hash*).

**Controles**: deslizar a izquierda o derecha (o tocar ese lado de la pantalla) para cambiar de carril y deslizar hacia arriba para saltar. El poder guardado se usa con el botón amarillo de abajo. En la compu: flechas, A/D/W o espacio, y E (o Enter) para el poder.

## Cómo se juega una partida

1. **Proyector**: abrir `/host/`. Se crea una sala con un código de 4 letras y un QR. Si se recarga la página, vuelve a la misma sala (la clave queda guardada en el navegador); *Ajustes → Nueva sala* crea otra.
2. **Celulares**: escanear el QR (o entrar a `/play/` y escribir el código) y tocar el número del grupo. Un solo celular por grupo: los números tomados aparecen bloqueados y el celular vuelve solo a su grupo si recarga o se corta la red.
3. Si un celular se queda sin batería, tocar su número en el lobby (o su ficha en el ranking durante la carrera) para **liberarlo**: otro celular del grupo lo retoma conservando la distancia.
4. **Empezar el drop**. En *Ajustes* se cambia la cantidad de preguntas, la duración de tramos y preguntas, la dificultad, cuántas preguntas entran en el repaso y si hay **rachas y poderes** y **emparejar**. El 🔊 de la barra prende o apaga la música (el navegador la habilita con el primer clic en la página).
5. **Tramos**: el corredor avanza solo; hay que esquivar y saltar obstáculos y juntar likes (❤ = +1 m cada uno). Chocar no elimina: el corredor tropieza, frena 1 s y parpadea 1,5 s sin poder chocar de nuevo. El proyector muestra el **mapa de la carrera** (un marcador por grupo camino a la tienda, con cuánto le falta al primero) y el ranking al costado.
6. Durante cada pregunta, los obstáculos se hunden y se acercan **3 arcos** por la calle, uno por carril, con la letra y el texto corto de la opción: el corredor los cruza justo cuando se acaba el tiempo y cuenta el carril en el que esté. El proyector muestra la pregunta, las opciones, el tiempo y cuántos grupos ya se movieron de carril; abajo, el celular repite la letra y el texto corto de cada carril (en las preguntas de 2 opciones el tercero es una pared ✕). Acertar suma 150 m más un extra de hasta 100 m por rapidez, que baja cuanto más tarde se elige el carril (y se queda ahí): el celular muestra en vivo cuánto vale la respuesta («⚡ Si es la correcta: +243 m») y el proyector lo recuerda debajo de la pregunta. Al terminar, cada celular ve ✅ (con el desglose de la rapidez y la **ventaja** que ganó para el tramo que empieza) o ❌ (arranca el tramo un poco más lento 2 s) y el proyector resalta la correcta unos segundos sin frenar la carrera. Ver [ventajas y poderes](#qué-hay-en-la-fase-3).
7. **Sprint final y llegada**: después de la última pregunta aparece la tienda Nude Project al final de la calle y el corredor llega justo a su puerta cuando termina el sprint. Un único ganador con la sudadera y el resto en la cola (SOLD OUT). Cada celular ve su puesto, aciertos, distancia, esquivados y likes.
8. **Repaso de errores** (botón en el proyector): las preguntas con menos aciertos, con cuántos grupos eligieron cada opción y la explicación. Se avanza con los botones, las flechas o el control remoto. Al final, la pregunta para el **debate** y *Volver al lobby* para otra partida con los mismos grupos.

## Pruebas

### 1. FPS en celulares reales
1. Correr el servidor en una notebook y conectar los celulares a la **misma red**. Abrir `/host/` en la notebook: el QR ya apunta a la IP de la red local. También sirve `/play/?solo` publicado en cualquier hosting estático después de `npm run build`.
2. En cada celular: entrar a un grupo, tocar 🐞 y después **Medir 20 s** mientras se juega normalmente.
3. El resultado aparece en el celular y en la tabla *Mediciones de FPS* del panel técnico del proyector (`/host/?debug`), con el modelo de GPU, la resolución, las *draw calls* y los triángulos. También se puede bajar en JSON desde `/api/informes`.
4. Repetir con `?calidad=alta`, `media` y `baja` para comparar.

Qué mirar: **FPS medio ≥ 30 y "% > 34 ms" bajo** en gama baja (objetivo de la sección 5.3). En calidad automática el juego arranca en *alta* y baja la resolución (y después el nivel) si los FPS caen.

Medido en Chromium sin GPU (render por software, el peor caso), en calidad alta: **~24 draw calls y ~13.000 triángulos** por cuadro en un tramo y **~26 draw calls** con los arcos o la tienda en pantalla, dentro del presupuesto de 80 llamadas y 60.000 triángulos.

### 2. Reconexión
- **Manual**: en plena partida, cortar el Wi-Fi del celular unos segundos (o tocar 🐞 → **Cortar red 5 s / 20 s**). El corredor tiene que seguir corriendo sin carteles; si el corte dura más de 5 s aparece solo un 📶 chico. Al volver, el panel muestra *sesiones recuperadas* y el proyector suma la respuesta si se dio a tiempo.
- **Automática**: `npm test` levanta un servidor con fases cortas y 40 bots que sufren un corte de 1 a 4 s cada uno, y verifica que **todas las respuestas llegan y se cuentan una sola vez**. También prueba las salas, el token de cada celular, liberar un grupo en plena partida, el revelado, el ganador, el desempate y la elección del repaso, (Fase 2) los obstáculos nuevos, el cruce del bot revendedor, los likes y la ubicación de la tienda en el mapa, y (Fase 3) cada ventaja y cada poder, la racha, el tope del Cambio de algoritmo, emparejar, la predicción del proyector y que un poder reintentado se aplique una sola vez.

### 3. 40 bots contra el servidor

```bash
npm run dev                                          # en una terminal
npm run bots -- --bots 40 --empezar --cortes 2       # en otra: crea su propia sala y la arranca
npm run bots -- --sala ABCD --bots 39 --desde 2      # o: entran a la sala del proyector (y la arranca el proyector)
```

| Opción | Descripción |
|---|---|
| `--url` | Servidor (por defecto `http://localhost:3000`; sirve uno en la nube) |
| `--sala` | Código de la sala que muestra el proyector (no hace falta con `--empezar`) |
| `--bots` | Cantidad de grupos simulados (40) |
| `--desde` | Primer número de grupo (para mezclar bots con celulares reales, por ejemplo `--desde 11`) |
| `--empezar` | El script hace de proyector: crea una sala, la arranca y al final pide el repaso |
| `--preguntas`, `--tramo`, `--pregunta` | Largo de la partida (6, 15 s y 15 s) |
| `--cortes`, `--corte-min`, `--corte-max` | Microcortes por bot y su duración en segundos |
| `--polling` | Fuerza *long-polling*, como si la red bloqueara WebSocket |

Al final muestra un resumen (respuestas confirmadas, cortes, sesiones recuperadas, RTT) y sale con error si se perdió alguna respuesta. Mientras corre, `/host/?debug` muestra los mensajes por segundo, la demora del *event loop* y la memoria del servidor.

## Qué hay en la Fase 3

Sobre la Fase 2 (las reglas son las de las secciones 3.4 a 3.9 del plan; nombres y textos en [`public/shared/poderes.js`](public/shared/poderes.js)):

**Ventajas por responder bien.** Cada respuesta correcta sortea una ventaja que se activa cuando llega el resultado y dura hasta el final del tramo que empieza (o del sprint). El celular la muestra en un chip arriba con los segundos que quedan y el mapa del proyector pone su ícono sobre la ficha del grupo.

| Ventaja | Efecto en el celular |
|---|---|
| 📱 Story de Bruno | Turbo: +40 % de velocidad (la cámara abre un poco el ángulo) |
| 📸 UGC viral | Escudo: el primer choque no frena (una burbuja rodea al corredor) |
| 🧲 Imán de comunidad | Los likes cercanos de cualquier carril y altura vuelan hacia el corredor |
| 🏰 Ruta VIP Château | Se hunde una de cada dos filas de obstáculos que quedan en el tramo |

**Rachas y poderes.** 2 aciertos seguidos (`rachaParaPoder`) dan un poder si el grupo no tiene uno guardado; errar corta la racha. El poder aparece como un botón amarillo y se usa cuando el grupo quiere. Solo se sortean poderes que todavía sirven (en la última pregunta, solo el Cambio de algoritmo).

| Poder | Qué hace |
|---|---|
| 📉 Cambio de algoritmo | A los 3 grupos que van primeros (sin contar a quien lo usa) les salen del piso obstáculos extra durante 5 s, de a uno por fila y lejos de los que ya hay. Si varios lo usan, no se acumula: se extiende hasta un tope de 10 s. El celular afectado vibra y ve quién fue. |
| 🎟️ Pase 50/50 | Cierra un arco incorrecto (✕) de la pregunta en curso o, si se usa en un tramo, de la próxima de 3 opciones. Al carril cerrado no se puede entrar. |
| 🔥 Hype | La próxima respuesta correcta vale el doble (el premio en vivo ya lo muestra). |

Cada uso aparece unos segundos en el proyector («🟦 1 usó Cambio de algoritmo · más obstáculos para 2 4 3»), con su efecto de sonido, y la pantalla del ganador suma los poderes usados.

**Emparejar.** Los grupos del último cuarto de la tabla (con 4 grupos o más) corren un 10 % más rápido; el celular lo recibe con su puesto cada segundo, lo aplica desde la fase siguiente (así los arcos y la tienda no saltan) y lo muestra en un chip *💨 Impulso*. Se desactiva en los ajustes o con `emparejar: false`.

**Red robusta.**
- Las respuestas y los poderes van por la misma cola de salida, que reintenta hasta el `ack`; el servidor aplica cada uso de poder una sola vez (por su `useId`).
- `state:sync` (al recuperar la sesión, reconectar o recargar) trae también la ventaja que sigue activa, el poder guardado, el Hype y el 50/50 pendientes, el arco cerrado y los obstáculos extra que faltan. Si un resultado se reveló mientras no había conexión, se muestra al volver.
- **Predicción en el proyector**: si un grupo deja de mandar su distancia en plena carrera, su ficha sigue avanzando con la última velocidad (hasta 4 s) y a los 5 s sin datos se atenúa hasta que vuelve. Es solo para el mapa: la distancia oficial es la que manda el celular.

**Sonido y vibración.** La música y los efectos se sintetizan con Web Audio en el proyector ([`public/host/sonido.js`](public/host/sonido.js)), sin archivos: cuenta regresiva, un loop que se acelera en el sprint y baja de volumen durante las preguntas, tic-tac en los últimos 5 s, acorde en el revelado, un efecto por poder y fanfarria para el ganador. Los celulares no suenan (40 a la vez serían un caos): vibran al chocar, con el escudo, al responder, al ganar un poder y al recibir un Cambio de algoritmo.

En la partida simulada (`/play/?solo`) también hay ventajas y poderes (el Cambio de algoritmo afecta la propia calle, para verlo).

```
juego/
├── server/game.js        # + ventajas, rachas, poderes, emparejar y predicción de marcadores
├── public/
│   ├── shared/poderes.js # Ventajas, poderes y sus constantes (celular, proyector y servidor)
│   ├── play/             # runner.js: turbo, escudo, imán, carril cerrado; track.js: ruta VIP y obstáculos extra
│   └── host/sonido.js    # Música y efectos del proyector
├── tools/bots.js         # Los bots usan los poderes que ganan
└── test/fase3.test.js
```

## Qué hay en la Fase 2

Sobre la base de la Fase 1:

- **Obstáculos**: además de la valla, la caja de stock, el fan y el camión, están el **bache del algoritmo** (bajo, se salta) y el **bot revendedor** (alto), que cruza despacio al carril vecino cuando el corredor se acerca. Su posición depende solo de la distancia del corredor, así que todos los grupos lo ven igual y el choque coincide con el dibujo a cualquier FPS. Va siempre solo en su fila: siempre queda un carril libre.
- **Likes**: en el piso y en el aire (sobre los obstáculos bajos, para atraparlos saltando). Cada uno suma 1 m al total oficial, poco a propósito para que no compitan con las preguntas.
- **Arcos de respuesta** en la calle (`render/models/props.js`): uno por carril, con la letra y el texto corto dibujados en un `CanvasTexture` que solo se regenera cuando cambia; el del carril elegido se pinta de mostaza y, en las preguntas de 2 opciones, el tercero es una pared ✕. Se ubican para que el corredor los cruce justo cuando termina el tiempo (la respuesta la decide el guion, no el choque con el arco).
- **Sprint y meta** (`render/models/store.js`): la tienda Nude Project (fachada blanca y negra, vidrieras con sudaderas, cartel *DROP · QUEDA 1* y la cola de fans) aparece al final de la calle durante el sprint y el corredor frena frente a su puerta. Ganador único y SOLD OUT para el resto, como en la Fase 1.
- **Mapa en vivo** en el proyector (`public/host/map.js`, Canvas 2D): una calle de Madrid de costado (cielo, fachadas con toldos y balcones, faroles y árboles), de la salida a cuadros hasta la tienda Nude Project, con marcas de distancia abajo y una ficha por grupo (número y color, sombra y estela de velocidad), animada entre las actualizaciones de 5 por segundo. El fondo se dibuja una sola vez por tamaño. Las fichas cercanas se apilan en filas y, si no entran, se agrupan en *+N*; el primero lleva borde mostaza y su «1.º». La tienda se ubica donde va a terminar el primero si sigue así (`shared/carrera.js`) y una barra muestra cuánto le falta. Durante las preguntas el mapa deja lugar a la pregunta y el ranking queda al costado.

```
juego/
├── server/          # Igual que en la Fase 1; el total de cada grupo suma los likes
├── public/
│   ├── host/        # + map.js: mapa de la carrera
│   ├── play/        # track.js con los 6 obstáculos; play.js ubica arcos y tienda según el guion
│   │   └── render/models/  # + props.js (arcos de respuesta) y store.js (tienda de la meta)
│   └── shared/      # + carrera.js: recorrido sin choques y proyección de la llegada
└── test/            # + fase2.test.js
```

Pendiente para la Fase 4: Service Worker, efectos (partículas, líneas de velocidad), controles del presentador, balanceo y pruebas en el aula.
