# 🏃 Drop Rush · Juego

Runner 3D multijugador para el cierre de la presentación. El plan completo está en [`PLANIFICACION.md`](PLANIFICACION.md).

> **Estado: Fase 0 (prototipo técnico).** Sirve para medir los riesgos antes de construir el juego: rendimiento 3D en celulares de gama baja, reconexión tras microcortes y carga de 40 grupos sobre un solo servidor. Las preguntas de [`data/preguntas.json`](data/preguntas.json) son de prueba.

## Cómo correrlo

Requiere Node.js 20 o más nuevo.

```bash
cd juego
npm install
npm run dev          # servidor + Vite en un solo proceso, en http://localhost:3000
```

| URL | Qué es |
|---|---|
| `/play/` | Celular: elegir grupo y correr. Mientras no hay partida, el corredor practica solo. |
| `/play/?solo` | Celular sin servidor: práctica y una partida simulada de 3 preguntas (botón *Probar partida*). |
| `/host/` | Proyector de prueba: empezar/terminar partidas, grupos, posiciones, carga del servidor y mediciones de FPS. |

Parámetros extra de `/play/`: `?debug` abre el panel de pruebas y `?calidad=alta|media|baja` fija la calidad gráfica.

Para producción: `npm run build` y después `npm start` (sirve `dist/` con caché `immutable` para los archivos con *hash*).

**Controles**: deslizar a izquierda o derecha (o tocar ese lado de la pantalla) para cambiar de carril y deslizar hacia arriba para saltar. En la compu: flechas, A/D/W o espacio.

## Pruebas de la Fase 0

### 1. FPS en celulares reales
1. Correr el servidor en una notebook y conectar los celulares a la **misma red** (la consola muestra la URL `http://IP:3000/play/`). También sirve `/play/?solo` publicado en cualquier hosting estático después de `npm run build`.
2. En cada celular: entrar a un grupo, tocar 🐞 y después **Medir 20 s** mientras se juega normalmente.
3. El resultado aparece en el celular y en la tabla *Mediciones de FPS* del proyector (`/host/`), con el modelo de GPU, la resolución, las *draw calls* y los triángulos. También se puede bajar en JSON desde `/api/informes`.
4. Repetir con `?calidad=alta`, `media` y `baja` para comparar.

Qué mirar: **FPS medio ≥ 30 y "% > 34 ms" bajo** en gama baja (objetivo de la sección 5.3). En calidad automática el juego arranca en *alta* y baja la resolución (y después el nivel) si los FPS caen.

Medido en Chromium sin GPU (render por software, el peor caso): **~23 draw calls y ~13.500 triángulos** por cuadro, dentro del presupuesto de 80 llamadas y 60.000 triángulos.

### 2. Reconexión
- **Manual**: en plena partida, cortar el Wi-Fi del celular unos segundos (o tocar 🐞 → **Cortar red 5 s / 20 s**). El corredor tiene que seguir corriendo sin carteles; si el corte dura más de 5 s aparece solo un 📶 chico. Al volver, el panel muestra *sesiones recuperadas* y el proyector suma la respuesta si se dio a tiempo.
- **Automática**: `npm test` levanta un servidor con fases cortas y 40 bots que sufren un corte de 1 a 4 s cada uno, y verifica que **todas las respuestas llegan y se cuentan una sola vez**.

### 3. 40 bots contra el servidor

```bash
npm run dev                                  # en una terminal
npm run bots -- --bots 40 --empezar --cortes 2   # en otra
```

| Opción | Descripción |
|---|---|
| `--url` | Servidor (por defecto `http://localhost:3000`; sirve uno en la nube) |
| `--bots` | Cantidad de grupos simulados (40) |
| `--desde` | Primer número de grupo (para mezclar bots con celulares reales, por ejemplo `--desde 11`) |
| `--empezar` | El script hace de proyector y arranca la partida (si no, se arranca desde `/host/`) |
| `--preguntas`, `--tramo`, `--pregunta` | Largo de la partida (6, 15 s y 15 s) |
| `--cortes`, `--corte-min`, `--corte-max` | Microcortes por bot y su duración en segundos |
| `--polling` | Fuerza *long-polling*, como si la red bloqueara WebSocket |

Al final muestra un resumen (respuestas confirmadas, cortes, sesiones recuperadas, RTT) y sale con error si se perdió alguna respuesta. Mientras corre, `/host/` muestra los mensajes por segundo, la demora del *event loop* y la memoria del servidor.

## Qué hay en la Fase 0

```
juego/
├── server/
│   ├── index.js     # Express + Socket.io (+ Vite en desarrollo) en un solo proceso
│   ├── game.js      # Guion de fases, preguntas, respuestas con tolerancia, bonus y ranking
│   ├── rooms.js     # Sala única, grupos y tokens de dispositivo (un celular por grupo)
│   └── config.js    # data/config.json con los valores por defecto de la sección 7
├── public/
│   ├── play/        # Celular: runner a paso fijo, pista con semilla, controles, red y render 3D
│   │   └── render/  # Escena, mundo reciclado, personaje animado, calidad y modelos por código
│   ├── host/        # Proyector de prueba
│   └── shared/      # rng con semilla, reloj sincronizado, guion y constantes (también los usan los bots)
├── tools/bots.js    # Simulador de grupos
├── test/            # Pista determinista, choques y prueba de reconexión con 40 bots
└── data/            # config.json y preguntas de prueba
```

Pendiente para las fases siguientes: salas con código y QR, arcos de respuesta en 3D, mapa del proyector, ventajas y poderes, tienda de la meta, Service Worker y pulido visual.
