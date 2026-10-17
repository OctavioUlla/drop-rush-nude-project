# 🏃 Drop Rush — Juego educativo sobre el caso Nude Project

> Juego multijugador para el aula, creado para la materia **Comercialización** (Licenciatura en Administración).
> Cada grupo corre y esquiva obstáculos desde el celular. El proyector muestra la pregunta, el mapa de la carrera y las posiciones en vivo.

---

## 1. Resumen

| | |
|---|---|
| **Género** | Runner por carriles (estilo Subway Surfers) + preguntas (estilo Kahoot) |
| **Jugadores** | 4 a 10 grupos (un celular por grupo) |
| **Duración** | 8 a 12 minutos por partida |
| **Pantalla principal** | Compu del aula conectada al proyector (pantalla *host*) |
| **Controles** | Celular de cada grupo: deslizar a izquierda o derecha (opcional: hacia arriba para saltar) |
| **Plataforma** | Web (HTML + JS); servidor Node.js en tiempo real |

### Historia
Nude Project anuncia un **drop limitado** en su tienda de Madrid. Cada grupo es un fan que corre por las calles para llegar antes de que se agote el stock. En el camino hay que **esquivar obstáculos** y, cada tanto, **atravesar el arco de la respuesta correcta**. Acertar da ventajas para el tramo siguiente.

### Objetivo pedagógico
Repasar de forma activa los conceptos del caso y de la consigna:
1. EGC (Employee Generated Content) vs. UGC (User Generated Content)
2. Marketing viral (tono, mensaje, estética y contexto)
3. Marketing experiencial (tiendas, pop-ups, Nude Château)
4. Métricas y rendimiento digital
5. Objetivo comunicacional de la marca
6. Modelo D2C, drops, hype, comunidad y desafíos (autenticidad, sostenibilidad, dependencia de las redes, exclusividad vs. accesibilidad)

La mecánica también refleja el caso: **stock limitado, urgencia, colas y exclusividad**.

### Principio de diseño
> **Saber más del caso tiene que pesar más que ser bueno esquivando.**
> Los obstáculos aportan diversión y ritmo, pero las preguntas son las que deciden la carrera.

---

## 2. Flujo de una partida

La partida alterna **tramos de carrera** y **preguntas**:

```
[Lobby] → [3,2,1 ¡DROP!] → ( [Tramo de carrera] → [Pregunta con arcos] → [Revelado] ) ×N → [Llegada a la tienda] → [Podio + debate]
```

| Fase | Duración | Qué pasa | Dónde mirar |
|---|---|---|---|
| **Tramo de carrera** | 20 a 25 s | El corredor avanza solo y el grupo esquiva obstáculos y junta likes | 📱 Celular |
| **Pregunta** | 15 a 20 s | Se frenan los obstáculos, aparece la pregunta y se acercan 3 arcos (A, B, C) | 📽️ Proyector para leer, 📱 celular para elegir carril |
| **Revelado** | 4 a 5 s | Se muestra la respuesta correcta, una explicación breve y quién acertó | 📽️ Proyector |

Con 10 preguntas, una partida dura unos **8 a 9 minutos**.

1. **Lobby**
   - El host crea una sala y el proyector muestra un **código de 4 letras** y un **QR**.
   - Cada grupo entra desde el celular, escribe su nombre y elige color o avatar.
   - El proyector muestra los grupos conectados en la línea de largada.
2. **Cuenta regresiva**: "3, 2, 1… ¡DROP!"
3. **Tramo de carrera**
   - En el celular, el corredor avanza solo por una calle de **3 carriles**.
   - El grupo desliza a izquierda o derecha para esquivar obstáculos y juntar ❤️ likes.
   - En el proyector, el mapa muestra a todos los corredores avanzando en tiempo real.
4. **Pregunta con arcos**
   - Los obstáculos desaparecen y la pantalla del celular avisa: "¡Mirá el proyector! 👀".
   - El proyector muestra la pregunta grande y sus 3 opciones (A, B, C).
   - En el celular se acercan lentamente **3 arcos**, uno por carril, con la letra y el texto corto de cada opción. Hay tiempo de sobra para leer y elegir.
   - El grupo se ubica en el carril de la respuesta que cree correcta y puede cambiar mientras corre el tiempo.
   - Al terminar el tiempo, el corredor atraviesa el arco del carril en el que esté:
     - ✅ **Arco correcto**: gana una **ventaja** para el próximo tramo (ver 3.3).
     - ❌ **Arco incorrecto**: sin ventaja y con una pequeña pérdida de impulso (ver 3.4).
5. **Revelado**: el proyector muestra la respuesta correcta, una explicación breve y cuántos grupos acertaron.
6. **Llegada a la tienda**
   - Después de la última pregunta hay un **sprint final** corto (unos 10 s).
   - El stock es limitado: solo los primeros **X** grupos (configurable, por ejemplo 3) "consiguen la sudadera".
   - El resto queda en la cola con el cartel **SOLD OUT**.
7. **Podio y debate**
   - Ranking final con estadísticas: aciertos, obstáculos esquivados, likes y poderes usados.
   - Cierre con preguntas para debatir: *¿Cómo se sintieron los que quedaron afuera? ¿Exclusividad o frustración?* Así se conecta con el desafío que plantea el caso.

---

## 3. Mecánicas

### 3.1 Movimiento y avance
- La calle tiene **3 carriles**. El corredor avanza solo; el grupo solo decide el carril.
- **Controles**:
  - Deslizar o tocar el lado izquierdo o derecho: cambia de carril.
  - *(Opcional, fase 3)* Deslizar hacia arriba: salta obstáculos bajos.
  - Botón grande: activa el poder guardado.
- Cada corredor tiene una **distancia recorrida**. Gana quien llega primero a la tienda, es decir, quien acumula más distancia.
- La distancia depende de:
  1. la **velocidad** durante los tramos, que sube con las ventajas por acertar y baja un instante al chocar;
  2. los **bonus de distancia** por acertar preguntas.

### 3.2 Obstáculos (simples a propósito)

| Obstáculo | Cómo se evita | Relación con el caso |
|---|---|---|
| 🚧 **Valla de la cola** | Cambiar de carril | Las colas en cada lanzamiento |
| 🧍 **Fan haciendo fila** | Cambiar de carril | La comunidad que espera horas |
| 🤖 **Bot revendedor** (se mueve despacio entre carriles) | Cambiar de carril | Exclusividad vs. accesibilidad |
| 📉 **Bache del algoritmo** (bajo) | Cambiar de carril o saltar (opcional) | Dependencia de Instagram y TikTok |
| 📦 **Caja de stock** (baja) | Cambiar de carril o saltar (opcional) | Logística de los drops |

**Reglas para que no sea complicado:**
- La velocidad es **moderada** y solo aumenta un poco a lo largo de la partida.
- **Nunca se bloquean los 3 carriles a la vez**: siempre hay al menos un carril libre, y casi siempre dos.
- Los obstáculos aparecen con **anticipación** (se ven venir desde lejos) y con **separación mínima** entre filas.
- **Chocar no elimina**: el corredor tropieza, pierde velocidad durante 1 s y queda **invulnerable** 1,5 s (parpadea).
- **Recorrido igual para todos**: los obstáculos se generan con una *semilla* que envía el servidor, así todos los grupos enfrentan la misma calle y nadie tiene un tramo más fácil por suerte.
- **Densidad configurable**: fácil, normal o caótico (ver sección 7).

### 3.3 Ventajas por responder bien
Acertar es **la principal forma de sacar distancia**. Cada respuesta correcta da:

1. **Bonus de distancia inmediato**, mayor cuanto más rápido se eligió el carril y se mantuvo:
   `bonus = base + extra_por_rapidez`
2. **Una ventaja para el próximo tramo** (se sortea entre las siguientes o se asigna en orden):

| Ventaja | Ícono | Efecto durante el próximo tramo | Relación con el caso |
|---|---|---|---|
| **Story de Bruno** | 📱 | Turbo: +40 % de velocidad | Liderazgo visible / EGC |
| **UGC viral** | 📸 | Escudo: el primer choque no frena | Validación social de la comunidad |
| **Imán de comunidad** | 🧲 | Atrae automáticamente los likes cercanos | Comunidad y pertenencia |
| **Ruta VIP Château** | 🏰 | Aparecen menos obstáculos en tu calle | Marketing experiencial |

> Para que el conocimiento pese más que la habilidad, **el bonus de una respuesta correcta tiene que valer más que un tramo entero sin chocar**. Ajustar en las pruebas (ver sección 7).

### 3.4 Respuesta incorrecta o sin respuesta
- Sin bonus de distancia y sin ventaja.
- Pierde impulso: arranca el próximo tramo un poco más lento durante 2 s.
- No hay castigos fuertes, para que ningún grupo quede descolgado y desmotivado.

### 3.5 Rachas y poderes
- **3 aciertos seguidos** otorgan un **poder** que se guarda en el celular y se activa con un botón cuando el grupo quiere.
- Cada grupo puede guardar **un poder a la vez**.

| Poder | Ícono | Efecto |
|---|---|---|
| **Cambio de algoritmo** | 📉 | Durante 5 s, al grupo que va primero le aparecen más obstáculos |
| **Pase 50/50** | 🎟️ | En la próxima pregunta, uno de los arcos incorrectos se cierra |
| **Hype** | 🔥 | Duplica el bonus de la próxima respuesta correcta |

### 3.6 Coleccionables
- **❤️ Likes** en la calle: dan una pequeña cantidad de distancia extra y suman a las estadísticas finales.
- Su valor es bajo, para que no compitan con las preguntas.

### 3.7 Mecanismo para emparejar (opcional)
- Los grupos que van últimos reciben un pequeño bonus de velocidad (por ejemplo +10 %), para que la carrera se mantenga reñida hasta el final.
- Se puede desactivar desde la configuración.

---

## 4. Pantallas

### 4.1 Host (proyector)
- **Lobby**: código de sala, QR, lista de grupos y botón "Empezar".
- **Durante los tramos**:
  - **Mapa de la carrera**: una calle o un mapa estilizado de Madrid con un ícono por grupo que avanza hacia la tienda Nude Project.
  - **Ranking en vivo** en un costado, con íconos de la ventaja activa de cada grupo (📱📸🧲🏰).
  - **Contador de stock** que baja a medida que el primero se acerca a la meta.
  - Avisos en vivo, por ejemplo: "📉 ¡Grupo 3 activó Cambio de algoritmo sobre Grupo 1!"
- **Durante la pregunta**: la pregunta en grande, las 3 opciones (A, B, C), el temporizador y cuántos grupos ya están "posicionados" (sin revelar en qué carril).
- **Revelado**: respuesta correcta, explicación breve y qué grupos acertaron.
- **Podio**: top 3 con la sudadera, el resto en la cola con el cartel SOLD OUT.
- **Controles del docente o presentador**: pausar, saltar pregunta, terminar partida.

### 4.2 Celular (jugador)
- **Ingreso**: código de sala, nombre del grupo y color.
- **Espera**: "Esperando que empiece el drop…".
- **Runner** (pantalla principal):
  - Vista de la calle con 3 carriles, en 2D desde arriba o en pseudo-3D simple.
  - Arriba: posición actual (por ejemplo "3.º de 8"), likes y ventaja activa.
  - Abajo: botón del poder guardado.
- **Pregunta**: el runner sigue en pantalla, sin obstáculos, con los 3 arcos acercándose despacio; cada arco muestra la letra y el texto corto de la opción.
- **Feedback**: destello verde o rojo, vibración (`navigator.vibrate`) y la ventaja obtenida.
- **Final**: posición obtenida y estadísticas del grupo.

### 4.3 Estética
- Inspirada en la identidad de Nude Project: minimalista, blanco y negro con un color de acento y tipografía bold.
- Calles de Madrid como fondo y la tienda como meta.
- Obstáculos con estilo simple y reconocible (siluetas planas), para que se distingan rápido en un celular.
- Música y efectos de sonido solo en el host (configurable).

---

## 5. Arquitectura técnica

```
┌──────────────┐        WebSocket        ┌──────────────────────┐
│  Host (PC +  │ ◄─────────────────────► │                      │
│  proyector)  │                         │  Servidor Node       │
└──────────────┘                         │  (Socket.io)         │
┌──────────────┐        WebSocket        │  - salas y fases     │
│  Celular 1   │ ◄─────────────────────► │  - semilla de tramos │
│  (runner)    │                         │  - preguntas         │
├──────────────┤                         │  - puntuación        │
│  Celular N   │ ◄─────────────────────► │  - ventajas/poderes  │
└──────────────┘                         └──────────────────────┘
```

### Reparto de responsabilidades
- **El runner corre en el celular**: el movimiento, los obstáculos y los choques se calculan en el propio celular, para que el control sea instantáneo y sin lag de red.
- **El servidor manda en todo lo demás**: fases y temporizadores, preguntas, validación de respuestas, bonus, ventajas, poderes y ranking.
- **Sincronización**:
  - Al empezar cada tramo, el servidor envía una **semilla** y los modificadores de cada grupo (ventajas y poderes). Así todos los celulares generan la misma calle.
  - Cada celular informa su **distancia** unas 4 veces por segundo.
  - El servidor reenvía las posiciones al host, que las anima de forma suave (interpolación).
  - El servidor hace un control básico de coherencia, como una velocidad máxima posible, sin buscar seguridad estricta (es un juego de aula).

### Stack propuesto
- **Servidor**: Node.js + Express (archivos estáticos) + Socket.io (tiempo real).
- **Runner del celular**: HTML5 Canvas en JS vanilla, o [Phaser 3](https://phaser.io/).
- **Host**: HTML + JS con Canvas o Phaser para el mapa y el ranking.
- **Preguntas**: archivo JSON editable (ver sección 6).
- **Sin base de datos**: el estado vive en memoria mientras dura la partida.

### Otros principios
- **Reconexión**: si un celular se desconecta, el grupo puede volver a entrar con el mismo nombre y conserva su distancia.
- **Sin instalaciones**: todo funciona desde el navegador.
- **Rendimiento**: el runner tiene que andar fluido en celulares de gama baja. Usar gráficos simples, pocos sprites y nada de 3D real.

### Eventos de Socket.io (borrador)

| Dirección | Evento | Datos |
|---|---|---|
| host → server | `host:create_room` | — |
| server → host | `room:created` | `{ code }` |
| player → server | `player:join` | `{ code, name, color }` |
| server → todos | `room:players` | `[{ id, name, color }]` |
| host → server | `host:start` | `{ settings }` |
| server → todos | `run:start` | `{ segment, seed, duration, difficulty, modifiers: { [playerId]: {...} } }` |
| player → server | `run:progress` | `{ distance, hits, likes }` |
| server → host | `run:positions` | `[{ id, distance, activeAdvantage }]` |
| server → todos | `question:start` | `{ index, text, options, timeLimit }` |
| player → server | `question:lane` | `{ lane, timestamp }` (se envía cada vez que cambia de carril) |
| player → server | `player:use_power` | `{ powerId, targetId? }` |
| server → todos | `question:reveal` | `{ correctIndex, explanation, results, positions }` |
| server → player | `player:advantage` | `{ advantageId }` |
| server → player | `player:power_granted` | `{ powerId }` |
| server → todos | `game:end` | `{ ranking, stats }` |
| host → server | `host:pause` / `host:skip` / `host:end` | — |

---

## 6. Banco de preguntas

Las preguntas **se cargan aparte**, en `data/preguntas.json`, y se pueden editar sin tocar el código.

> ⚠️ Como hay **3 carriles**, cada pregunta tiene **2 o 3 opciones** (un arco por carril). Con 2 opciones, el tercer carril queda como "pared" y no se puede elegir.

### Formato

```json
{
  "titulo": "Caso Nude Project",
  "preguntas": [
    {
      "id": 1,
      "tema": "EGC vs UGC",
      "pregunta": "TEXTO DE LA PREGUNTA",
      "opciones": ["OPCIÓN A", "OPCIÓN B", "OPCIÓN C"],
      "opcionesCortas": ["CORTA A", "CORTA B", "CORTA C"],
      "correcta": 0,
      "explicacion": "Breve explicación que se muestra al revelar la respuesta.",
      "tiempo": 20
    }
  ]
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | número | Identificador único |
| `tema` | texto | Uno de los temas de la sección 1 (sirve para ver estadísticas por tema) |
| `pregunta` | texto | Enunciado (conviene que no pase de unas 120 letras, para leerlo en el proyector) |
| `opciones` | lista | 2 o 3 respuestas completas, que se muestran en el proyector |
| `opcionesCortas` | lista | Opcional; texto de hasta 20 letras para los arcos del celular. Si falta, el arco muestra solo la letra |
| `correcta` | número | Índice de la opción correcta (empieza en 0) |
| `explicacion` | texto | Opcional; se muestra al revelar la respuesta |
| `tiempo` | número | Opcional; segundos para responder (por defecto 20) |

> El servidor **mezcla el orden de las opciones** en cada partida, para que la respuesta correcta no quede siempre en el mismo carril.

### Distribución sugerida de temas (para 10 preguntas)
- EGC vs. UGC: 2
- Marketing viral: 2
- Marketing experiencial: 1
- Métricas y rendimiento digital: 1
- Objetivo comunicacional: 1
- Modelo D2C, drops y comunidad: 2
- Desafíos de la marca: 1

> **Pendiente:** redactar las preguntas exactas *(a cargo del equipo)*.

---

## 7. Configuración de la partida

En `data/config.json`, o desde el lobby del host:

| Parámetro | Por defecto | Descripción |
|---|---|---|
| `cantidadPreguntas` | 10 | Cuántas preguntas del banco se usan |
| `ordenAleatorio` | true | Mezclar el orden de las preguntas |
| `mezclarOpciones` | true | Mezclar el orden de las opciones en los carriles |
| `tiempoPorDefecto` | 20 | Segundos por pregunta |
| `duracionTramo` | 22 | Segundos de cada tramo de carrera |
| `dificultadObstaculos` | `"facil"` | `"facil"`, `"normal"` o `"caotico"` |
| `saltoActivo` | false | Habilitar el salto (deslizar hacia arriba) |
| `bonusAcierto` | 150 | Distancia base por respuesta correcta |
| `bonusRapidezMax` | 100 | Distancia extra máxima por responder rápido |
| `penalizacionChoque` | 1.0 | Segundos de frenado al chocar |
| `stockDrop` | 3 | Cuántos grupos "consiguen la sudadera" |
| `poderesActivos` | true | Activar o desactivar poderes y rachas |
| `rachaParaPoder` | 3 | Aciertos seguidos necesarios para ganar un poder |
| `emparejar` | true | Bonus de velocidad para los últimos |
| `sonido` | true | Música y efectos en el host |

**Referencia para balancear:** si a velocidad normal un tramo de 22 s equivale a unas **200 unidades** de distancia, una respuesta correcta (150 a 250) tiene que valer **lo mismo o más que un tramo completo**. Chocar en un tramo le cuesta al grupo solo unas 10 a 20 unidades.

---

## 8. Estructura del repositorio (propuesta)

```
drop-rush-nude-project/
├── README.md
├── PLANIFICACION.md
├── package.json
├── server/
│   ├── index.js          # Express + Socket.io
│   ├── game.js           # Fases, temporizadores, puntuación, ventajas, poderes
│   ├── rooms.js          # Manejo de salas y jugadores
│   └── config.js         # Carga de config.json y valores por defecto
├── public/
│   ├── host/
│   │   ├── index.html    # Pantalla del proyector
│   │   ├── host.js       # Conexión y fases
│   │   └── map.js        # Mapa de la carrera y ranking animado
│   ├── play/
│   │   ├── index.html    # Controlador del celular
│   │   ├── play.js       # Conexión, fases e interfaz
│   │   ├── runner.js     # Motor del runner: carriles, obstáculos, choques
│   │   ├── track.js      # Generación de obstáculos a partir de la semilla
│   │   └── input.js      # Deslizar y tocar
│   ├── assets/           # Sprites, fondos, sonidos, tipografías
│   └── shared/
│       ├── styles.css
│       └── rng.js        # Generador aleatorio con semilla (compartido)
└── data/
    ├── preguntas.json
    └── config.json
```

- `/host` es la pantalla del proyector.
- `/play` (o la raíz) es la entrada de los celulares, a la que lleva el QR.

---

## 9. Plan de trabajo

### Fase 1: Base jugable (solo preguntas)
- [ ] Inicializar el proyecto Node con Express y Socket.io
- [ ] Crear sala con código y QR, y unir jugadores desde el celular
- [ ] Cargar las preguntas desde el JSON
- [ ] Ciclo de pregunta → elección de carril → revelado, con temporizador del servidor
- [ ] Puntuación por distancia y ranking simple en el host (barras que avanzan)
- [ ] Pantalla final con el ranking

### Fase 2: Runner y obstáculos
- [ ] Runner de 3 carriles en Canvas con controles de deslizar y tocar
- [ ] Generación de obstáculos con semilla (`rng.js` + `track.js`)
- [ ] Choques: tropiezo, frenado e invulnerabilidad
- [ ] Likes coleccionables
- [ ] Envío de la distancia al servidor y mapa en vivo en el host
- [ ] Arcos de respuesta dentro del runner
- [ ] Alternancia de fases tramo → pregunta → revelado
- [ ] Sprint final, meta con la tienda, contador de stock y cartel SOLD OUT

### Fase 3: Ventajas, poderes y extras
- [ ] Ventajas por respuesta correcta (turbo, escudo, imán, ruta VIP)
- [ ] Rachas y poderes (Cambio de algoritmo, 50/50, Hype)
- [ ] Salto opcional para obstáculos bajos
- [ ] Mecanismo para emparejar
- [ ] Sonidos, música y vibración
- [ ] Estadísticas finales por grupo y por tema

### Fase 4: Pulido y prueba
- [ ] Estética Nude Project (paleta, tipografía, fondos, sprites)
- [ ] Reconexión de jugadores
- [ ] Controles del presentador (pausar, saltar, terminar)
- [ ] **Balanceo**: comprobar que acertar pese más que esquivar (sección 7)
- [ ] Prueba de rendimiento en celulares de gama baja
- [ ] Prueba con 8 a 10 celulares reales al mismo tiempo
- [ ] Deploy

---

## 10. Despliegue

Hay dos opciones; conviene tener las dos listas.

### A. En la nube (recomendada)
- Deploy gratuito en **Render**, **Railway** o **Fly.io** (soportan WebSockets).
- Los celulares entran por una URL pública usando datos móviles o el Wi-Fi del aula.
- ⚠️ Los planes gratuitos pueden "dormir" el servidor: abrir la URL unos minutos antes de la clase.

### B. Red local (respaldo)
- Correr el servidor en la notebook del presentador (`npm start`).
- Compartir hotspot desde la notebook o un celular, o usar el mismo Wi-Fi.
- Los celulares entran por `http://IP-DE-LA-NOTEBOOK:3000` (el QR la muestra automáticamente).

> Como el runner corre en el celular, una conexión lenta **no afecta el control del personaje**: solo puede demorar un poco la actualización del mapa en el proyector.

---

## 11. Integración con la presentación

- **Momento sugerido**: al final de la exposición, como repaso (unos 10 minutos de los 20 a 30 disponibles).
- **Antes de jugar**:
  - Pedir que cada grupo tenga un celular con batería y conexión.
  - Dar 30 segundos de tramo de práctica, sin preguntas, para que aprendan a esquivar.
  - Sugerir un rol por grupo: uno **maneja el celular** y los demás **leen la pregunta en el proyector** y le dicen qué carril elegir. Así participa todo el grupo.
- **Después de jugar**: usar el podio para abrir el debate sobre exclusividad vs. accesibilidad y conectarlo con los desafíos del caso.

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Wi-Fi del aula malo o bloqueado | Usar datos móviles o la red local por hotspot (opción B) |
| Servidor gratuito dormido | Abrirlo antes de la clase |
| Un celular se desconecta | Reconexión con el mismo nombre; conserva su distancia |
| El runner va lento en celulares viejos | Gráficos simples y opción de "modo liviano" sin animaciones decorativas |
| Esquivar distrae de las preguntas | Sin obstáculos durante las preguntas y aviso de "mirá el proyector"; roles dentro del grupo |
| Los grupos hábiles esquivando ganan aunque no sepan | Balanceo: el acierto vale más que un tramo entero; choques con castigo bajo |
| Obstáculos demasiado difíciles | Dificultad "fácil" por defecto, siempre un carril libre, tramo de práctica |
| Proyector de baja resolución | Tipografías grandes y alto contraste; probar antes en el aula |
| Pocos celulares | Mínimo uno por grupo; también se puede jugar en parejas de grupos |

---

## 13. Pendientes y decisiones abiertas
- [ ] Redactar el banco de preguntas (`data/preguntas.json`), con 2 o 3 opciones por pregunta
- [ ] Definir la cantidad final de grupos
- [ ] Elegir la vista del runner: 2D desde arriba (más simple) o pseudo-3D (más parecida a Subway Surfers)
- [ ] Elegir entre Canvas puro y Phaser
- [ ] Decidir si se incluye el salto
- [ ] Conseguir o crear los assets visuales (corredor, obstáculos, calle, tienda, arcos)
- [ ] Elegir el hosting
- [ ] Hacer un ensayo general con el equipo

---

## Créditos
Proyecto académico basado en el caso de estudio *"Nude Project: comunidad, comunicación y autenticidad en la era digital"*.
Materia: Comercialización · Licenciatura en Administración.
