# 🏃 Drop Rush · Juego

Runner 3D multijugador para el cierre de la presentación. El plan completo está en [`PLANIFICACION.md`](PLANIFICACION.md).

> **Estado: Fase 1 (base jugable).** Ya se puede jugar una partida completa: sala con código y QR, un celular por grupo, preguntas con revelado instantáneo, ranking en vivo de 40 grupos, ganador y repaso de errores. El runner 3D es el de la Fase 0 (los arcos 3D, el mapa y la tienda son de la Fase 2). Las preguntas de [`data/preguntas.json`](data/preguntas.json) son un **borrador** redactado a partir del caso: falta que las revise el equipo.

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
| `/play/?solo` | Celular sin servidor: práctica y una partida simulada de 3 preguntas (botón *Probar partida*). |

Parámetros extra: `/play/?debug` abre el panel de pruebas, `/play/?calidad=alta|media|baja` fija la calidad gráfica y `/host/?debug` (o 🐞) muestra la carga del servidor, las mediciones de FPS y el botón para terminar la partida.

Para producción: `npm run build` y después `npm start` (sirve `dist/` con caché `immutable` para los archivos con *hash*).

**Controles**: deslizar a izquierda o derecha (o tocar ese lado de la pantalla) para cambiar de carril y deslizar hacia arriba para saltar. En la compu: flechas, A/D/W o espacio.

## Cómo se juega una partida

1. **Proyector**: abrir `/host/`. Se crea una sala con un código de 4 letras y un QR. Si se recarga la página, vuelve a la misma sala (la clave queda guardada en el navegador); *Ajustes → Nueva sala* crea otra.
2. **Celulares**: escanear el QR (o entrar a `/play/` y escribir el código) y tocar el número del grupo. Un solo celular por grupo: los números tomados aparecen bloqueados y el celular vuelve solo a su grupo si recarga o se corta la red.
3. Si un celular se queda sin batería, tocar su número en el lobby (o su ficha en el ranking durante la carrera) para **liberarlo**: otro celular del grupo lo retoma conservando la distancia.
4. **Empezar el drop**. En *Ajustes* se cambia la cantidad de preguntas, la duración de tramos y preguntas, la dificultad y cuántas preguntas entran en el repaso.
5. Durante cada pregunta, el proyector muestra la pregunta, las opciones, el tiempo y cuántos grupos ya se movieron de carril; el celular muestra la letra y el texto corto de cada carril (en las preguntas de 2 opciones el tercero es una pared ✕). Al terminar, cada celular ve ✅ o ❌ y el proyector resalta la correcta unos segundos sin frenar la carrera.
6. **Llegada**: un único ganador con la sudadera y el resto en la cola (SOLD OUT). Cada celular ve su puesto, aciertos, distancia, esquivados y likes.
7. **Repaso de errores** (botón en el proyector): las preguntas con menos aciertos, con cuántos grupos eligieron cada opción y la explicación. Se avanza con los botones, las flechas o el control remoto. Al final, la pregunta para el **debate** y *Volver al lobby* para otra partida con los mismos grupos.

## Pruebas

### 1. FPS en celulares reales
1. Correr el servidor en una notebook y conectar los celulares a la **misma red**. Abrir `/host/` en la notebook: el QR ya apunta a la IP de la red local. También sirve `/play/?solo` publicado en cualquier hosting estático después de `npm run build`.
2. En cada celular: entrar a un grupo, tocar 🐞 y después **Medir 20 s** mientras se juega normalmente.
3. El resultado aparece en el celular y en la tabla *Mediciones de FPS* del panel técnico del proyector (`/host/?debug`), con el modelo de GPU, la resolución, las *draw calls* y los triángulos. También se puede bajar en JSON desde `/api/informes`.
4. Repetir con `?calidad=alta`, `media` y `baja` para comparar.

Qué mirar: **FPS medio ≥ 30 y "% > 34 ms" bajo** en gama baja (objetivo de la sección 5.3). En calidad automática el juego arranca en *alta* y baja la resolución (y después el nivel) si los FPS caen.

Medido en Chromium sin GPU (render por software, el peor caso): **~23 draw calls y ~13.500 triángulos** por cuadro, dentro del presupuesto de 80 llamadas y 60.000 triángulos.

### 2. Reconexión
- **Manual**: en plena partida, cortar el Wi-Fi del celular unos segundos (o tocar 🐞 → **Cortar red 5 s / 20 s**). El corredor tiene que seguir corriendo sin carteles; si el corte dura más de 5 s aparece solo un 📶 chico. Al volver, el panel muestra *sesiones recuperadas* y el proyector suma la respuesta si se dio a tiempo.
- **Automática**: `npm test` levanta un servidor con fases cortas y 40 bots que sufren un corte de 1 a 4 s cada uno, y verifica que **todas las respuestas llegan y se cuentan una sola vez**. También prueba las salas, el token de cada celular, liberar un grupo en plena partida, el revelado, el ganador, el desempate y la elección del repaso.

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

## Qué hay en la Fase 1

```
juego/
├── server/
│   ├── index.js     # Express + Socket.io (+ Vite en desarrollo) en un solo proceso; salas, QR (/api/qr.svg) y eventos
│   ├── rooms.js     # Salas con código de 4 letras, grupos y tokens de dispositivo; liberar un grupo
│   ├── game.js      # Guion de fases, preguntas, carriles "posicionados", respuestas con tolerancia, bonus y llegada
│   ├── stats.js     # Estadísticas por pregunta, repaso de errores y orden de llegada con desempate
│   └── config.js    # data/config.json con los valores por defecto de la sección 7
├── public/
│   ├── host/        # Proyector: lobby (código, QR, grilla), pregunta y revelado, ranking de 40, ganador, repaso y debate
│   ├── play/        # Celular: código de sala, grupo, runner a paso fijo, carriles A/B/C, resultado y llegada
│   │   └── render/  # Escena, mundo reciclado, personaje animado, calidad y modelos por código (Fase 0)
│   └── shared/      # rng con semilla, reloj sincronizado, guion y constantes (también los usan los bots)
├── tools/bots.js    # Simulador de grupos
├── test/            # Fase 0 (pista, choques, reconexión) y Fase 1 (salas, revelado, ganador, repaso)
└── data/            # config.json y el banco de preguntas (borrador)
```

Pendiente para las fases siguientes: arcos de respuesta en 3D, mapa del proyector, tienda de la meta, ventajas y poderes, Service Worker y pulido visual.
