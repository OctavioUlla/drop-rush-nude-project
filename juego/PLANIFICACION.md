# 🏃 Drop Rush — Juego educativo sobre el caso Nude Project

> Juego multijugador para el aula, creado para la materia **Comercialización** (Licenciatura en Administración).
> Cada grupo corre, salta y esquiva obstáculos en un runner **3D** desde el celular. El proyector muestra la pregunta, el mapa de la carrera y las posiciones en vivo.
>
> Es el cierre interactivo de la [presentación del caso](../presentacion/README.md) y usa el mismo [design system](../design-system/README.md).

---

## 1. Resumen

| | |
|---|---|
| **Género** | Runner 3D por carriles (estilo Subway Surfers) + preguntas (estilo Kahoot) |
| **Jugadores** | Hasta **40 grupos** jugando al mismo tiempo, **un solo celular por grupo** |
| **Duración** | **10 minutos** en total: 1 de instrucciones, ~7 de carrera y 2 de repaso de errores y debate |
| **Pantalla principal** | Compu del aula conectada al proyector (pantalla *host*) |
| **Controles** | Celular de cada grupo: deslizar a izquierda o derecha para cambiar de carril y **hacia arriba para saltar** |
| **Gráficos** | 3D *low-poly* estilizado (WebGL), pensado para andar bien en celulares de gama baja |
| **Red** | Pensado para 40 celulares en el mismo Wi-Fi de la facultad, tolerante a microcortes |
| **Plataforma** | Web (HTML + JS + Three.js); servidor Node.js en tiempo real |

### Historia
Nude Project anuncia un **drop ultra limitado** en su tienda de Madrid: queda **una sola sudadera**. Cada grupo es un fan que corre por las calles para llegar primero. En el camino hay que **esquivar y saltar obstáculos** y, cada tanto, **atravesar el arco de la respuesta correcta**. Acertar da ventajas para el tramo siguiente.

### Objetivo pedagógico
Repasar de forma activa los conceptos del caso y de la consigna:
1. EGC (Employee Generated Content) vs. UGC (User Generated Content)
2. Marketing viral (tono, mensaje, estética y contexto)
3. Marketing experiencial (tiendas, pop-ups, Nude Château)
4. Métricas y rendimiento digital
5. Objetivo comunicacional de la marca
6. Modelo D2C, drops, hype, comunidad y desafíos (autenticidad, sostenibilidad, dependencia de las redes, exclusividad vs. accesibilidad)

La mecánica también refleja el caso: **stock limitado, urgencia, colas y exclusividad**.

### Principios de diseño
> **Saber más del caso tiene que pesar más que ser bueno esquivando.**
> Los obstáculos aportan diversión y ritmo, pero las preguntas son las que deciden la carrera.

> **El juego no se frena.** Entre pregunta y pregunta solo se muestra un instante la respuesta correcta; las explicaciones se dejan para el **repaso final**, enfocado en las preguntas que más se equivocaron.

> **La red no tiene que notarse.** El runner corre en el celular aunque se corte la conexión unos segundos; al volver, todo se pone al día sin que el grupo lo note.

---

## 2. Flujo de una partida

La partida alterna **tramos de carrera** y **preguntas**, sin pausas entre medio:

```
[Lobby] → [3,2,1 ¡DROP!] → ( [Tramo de carrera] → [Pregunta con arcos] ⚡revelado instantáneo ) ×N → [Sprint final y llegada] → [Ganador] → [Repaso de errores + debate]
```

| Fase | Duración | Qué pasa | Dónde mirar |
|---|---|---|---|
| **Tramo de carrera** | 20 a 25 s | El corredor avanza solo y el grupo esquiva, salta y junta likes | 📱 Celular |
| **Pregunta** | 15 a 20 s | Desaparecen los obstáculos, aparece la pregunta y se acercan 3 arcos (A, B, C) | 📽️ Proyector para leer, 📱 celular para elegir carril |
| **Revelado** ⚡ | ~2 s, **sin frenar** | Destello verde o rojo en el celular y la respuesta correcta resaltada en el proyector, mientras ya arranca el tramo siguiente | 📱 + 📽️ |
| **Repaso de errores** | 2 min (al final) | Las preguntas con más errores, con sus explicaciones | 📽️ Proyector |

Con 10 preguntas, la carrera dura unos **7 minutos** (10 × (22 s de tramo + 20 s de pregunta)). Es el máximo que entra en los 10 minutos del bloque: si hace falta recortar, bajar a 8 preguntas (~5,5 min).

1. **Lobby**
   - El host crea una sala y el proyector muestra un **código de 4 letras** y un **QR**.
   - El host define cuántos grupos hay (por ejemplo, 40). Los grupos se identifican **solo con un número** (1 a 40).
   - Cada celular entra y **elige su número de grupo**. Los grupos ya tomados aparecen bloqueados: **un solo celular por grupo** (ver 3.8).
   - Mientras espera, el celular **descarga y prepara los gráficos 3D** para que la partida arranque sin demoras.
   - El proyector muestra una grilla con los 40 lugares y cuáles ya están conectados.
2. **Cuenta regresiva**: "3, 2, 1… ¡DROP!"
3. **Tramo de carrera**
   - En el celular, el corredor avanza solo por una calle 3D de **3 carriles**.
   - El grupo desliza a izquierda o derecha para esquivar, **hacia arriba para saltar** obstáculos bajos, y junta ❤️ likes.
   - En el proyector, el mapa muestra a todos los corredores avanzando en tiempo real.
4. **Pregunta con arcos**
   - Los obstáculos desaparecen y la pantalla del celular avisa: "¡Mirá el proyector! 👀".
   - El proyector muestra la pregunta grande y sus 3 opciones (A, B, C).
   - En el celular se acercan lentamente **3 arcos**, uno por carril, con la letra y el texto corto de cada opción.
   - El grupo se ubica en el carril de la respuesta que cree correcta y puede cambiar mientras corre el tiempo.
5. **Revelado instantáneo (sin pausa)**
   - El corredor atraviesa el arco del carril en el que esté y **sigue corriendo**: el tramo siguiente empieza enseguida.
   - En el celular: destello ✅ verde o ❌ rojo, vibración y, si acertó, el ícono de la ventaja ganada (ver 3.3 y 3.4).
   - En el proyector: durante unos 3 s se resalta la opción correcta y se ve "28 de 40 grupos acertaron", y luego vuelve el mapa. **No se muestra la explicación** en este momento.
6. **Llegada a la tienda**
   - Después de la última pregunta hay un **sprint final** corto (unos 10 s).
   - Hay **una sola sudadera**: **solo el grupo que llega primero a la tienda gana el juego**.
   - Cuando el primero cruza la puerta, en todos los demás celulares aparece el cartel **SOLD OUT** y su corredor queda en la cola.
   - Desempate (muy improbable, porque la distancia es continua): más aciertos y, si sigue empatado, quien respondió más rápido en total.
7. **Ganador**
   - El proyector muestra al **único ganador** con la sudadera, en grande.
   - Debajo, el resto como "la cola" (el orden de llegada), sin podio ni premios para el 2.º y 3.º.
   - Estadísticas destacadas: aciertos, obstáculos esquivados, saltos, likes y poderes usados.
8. **Repaso de errores y debate**
   - El proyector muestra las **3 preguntas con menor porcentaje de aciertos** (cantidad configurable).
   - Para cada una: la pregunta, cuántos grupos eligieron cada opción (barras), la respuesta correcta y la **explicación**.
   - El presentador avanza manualmente para comentar cada una.
   - Cierre con preguntas para debatir: *¿Cómo se sintieron los 39 grupos que quedaron afuera? ¿Exclusividad o frustración?* Así se conecta con el desafío que plantea el caso.

---

## 3. Mecánicas

### 3.1 Movimiento y avance
- La calle tiene **3 carriles**. El corredor avanza solo; el grupo decide el carril y cuándo saltar.
- **Controles**:
  - Deslizar o tocar el lado izquierdo o derecho: cambia de carril.
  - **Deslizar hacia arriba: salta** (ver 3.2).
  - Botón grande: activa el poder guardado.
  - Los gestos tienen *buffer*: si se desliza un instante antes de que termine el salto o el cambio de carril, la acción se ejecuta igual, para que los controles se sientan precisos.
- Cada corredor tiene una **distancia recorrida**. **Gana solo quien llega primero a la tienda**, es decir, quien acumula más distancia al terminar el sprint final. No hay premios para los demás puestos.
- La distancia total es la suma de:
  1. la **distancia corrida**, que calcula el celular y depende de la velocidad durante los tramos (sube con las ventajas, baja un instante al chocar);
  2. los **bonus de distancia** por acertar preguntas, que calcula y guarda el servidor.

### 3.2 Salto
- Se activa deslizando hacia arriba. Dura unos **0,6 s** y permite pasar por encima de los obstáculos **bajos**.
- Los obstáculos **altos** no se pueden saltar: hay que cambiar de carril.
- Se puede cambiar de carril en el aire, como en Subway Surfers.
- Saltar no afecta la elección del arco durante las preguntas: cuenta el carril.
- Animación con anticipación y aterrizaje (*squash & stretch*) y una pequeña nube de polvo, para que se sienta bien.

### 3.3 Obstáculos (simples a propósito)

| Obstáculo | Tipo | Cómo se evita | Relación con el caso |
|---|---|---|---|
| 🚧 **Valla de la cola** | Baja | Saltar o cambiar de carril | Las colas en cada lanzamiento |
| 🧍 **Fan haciendo fila** | Alta | Cambiar de carril | La comunidad que espera horas |
| 🤖 **Bot revendedor** (se mueve despacio entre carriles) | Alta | Cambiar de carril | Exclusividad vs. accesibilidad |
| 📉 **Bache del algoritmo** | Baja | Saltar o cambiar de carril | Dependencia de Instagram y TikTok |
| 📦 **Caja de stock** | Baja | Saltar o cambiar de carril | Logística de los drops |
| 🚚 **Camión de reparto** (estacionado) | Alta y larga | Cambiar de carril | Logística y envíos del modelo D2C |

**Reglas para que no sea complicado:**
- La velocidad es **moderada** y solo aumenta un poco a lo largo de la partida.
- **Nunca se bloquean los 3 carriles a la vez con obstáculos altos**: siempre hay al menos un carril libre o saltable, y casi siempre dos.
- Los obstáculos aparecen con **anticipación** (se ven venir desde lejos gracias a la niebla y la curvatura del mundo) y con **separación mínima** entre filas.
- **Chocar no elimina**: el corredor tropieza, pierde velocidad durante 1 s y queda **invulnerable** 1,5 s (parpadea).
- **Recorrido igual para todos**: los obstáculos se generan con una *semilla* que envía el servidor, así todos los grupos enfrentan la misma calle.
- **Simulación a paso fijo**: la lógica (movimiento, choques) corre a 60 pasos por segundo independientemente de los FPS, así un celular lento ve menos cuadros pero **no choca distinto** que uno rápido.
- **Densidad configurable**: fácil, normal o caótico (ver sección 7).

### 3.4 Ventajas por responder bien
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

> Como el revelado ya no frena el juego, la ventaja **se activa en el momento** en que el corredor atraviesa el arco correcto y dura todo el tramo que empieza.

> Para que el conocimiento pese más que la habilidad, **el bonus de una respuesta correcta tiene que valer más que un tramo entero sin chocar**. Ajustar en las pruebas (ver sección 7).

### 3.5 Respuesta incorrecta o sin respuesta
- Sin bonus de distancia y sin ventaja.
- Pierde impulso: arranca el próximo tramo un poco más lento durante 2 s.
- No hay castigos fuertes, para que ningún grupo quede descolgado y desmotivado.

### 3.6 Rachas y poderes
- **3 aciertos seguidos** otorgan un **poder** que se guarda en el celular y se activa con un botón cuando el grupo quiere.
- Cada grupo puede guardar **un poder a la vez**.

| Poder | Ícono | Efecto |
|---|---|---|
| **Cambio de algoritmo** | 📉 | Durante 5 s, a los 3 grupos que van primeros les aparecen más obstáculos |
| **Pase 50/50** | 🎟️ | En la próxima pregunta, uno de los arcos incorrectos se cierra |
| **Hype** | 🔥 | Duplica el bonus de la próxima respuesta correcta |

> Con 40 grupos, **Cambio de algoritmo** afecta al top 3 (y no solo al primero) para que tenga sentido usarlo desde cualquier posición. Si varios grupos lo usan a la vez, el efecto no se acumula: se extiende la duración, con un tope de 10 s.

### 3.7 Coleccionables
- **❤️ Likes** en la calle (algunos en el aire, para atraparlos saltando): dan una pequeña cantidad de distancia extra y suman a las estadísticas finales.
- Su valor es bajo, para que no compitan con las preguntas.

### 3.8 Un celular por grupo
- Los grupos se identifican **solo con un número**, del 1 a `maxGrupos` (por ejemplo, 1 a 40).
- Cada celular **elige su número en una grilla**; no se escribe ningún nombre (así no hay nombres repetidos, mal escritos ni inapropiados en el proyector).
- Al elegirlo, el servidor le entrega al celular un **token de dispositivo** que queda guardado en el navegador (`localStorage`). A partir de ahí, el grupo queda **asociado a ese celular**:
  - Si otro celular intenta entrar al mismo grupo, se lo rechaza con el mensaje "Este grupo ya tiene un jugador".
  - Si el mismo celular se desconecta o recarga la página, vuelve a entrar **automáticamente** a su grupo con el token, sin elegir nada.
- Si un celular se queda sin batería o se rompe, el presentador puede **liberar el grupo** desde el host, y otro celular del mismo grupo lo retoma **conservando la distancia** y las estadísticas.
- No se identifica a los jugadores por IP: en la red de la facultad todos los celulares suelen salir a Internet con **la misma IP pública**.

### 3.9 Mecanismo para emparejar (opcional)
- Los grupos que van en el último cuarto de la tabla reciben un pequeño bonus de velocidad (por ejemplo +10 %), para que la carrera se mantenga reñida hasta el final.
- Se puede desactivar desde la configuración.

---

## 4. Pantallas

### 4.1 Host (proyector)
- **Lobby**: código de sala, QR, grilla con los 40 lugares (conectado / libre / desconectado), botón "Liberar grupo" en cada lugar y botón "Empezar".
- **Durante los tramos**:
  - **Mapa de la carrera**: una vista aérea de la calle (o un mapa estilizado de Madrid) con un marcador por grupo, con su **número** grande y su color, que avanza hacia la tienda Nude Project. Con 40 grupos, los marcadores muy juntos se agrupan para que se lean.
  - **Ranking en vivo** en un costado: **top 10** con íconos de la ventaja activa (📱📸🧲🏰) y, debajo, el resto en columnas compactas.
  - **Cartel "QUEDA 1"** sobre la tienda y una barra que muestra cuánto le falta al primero para llegar.
  - Avisos en vivo, por ejemplo: "📉 ¡Grupo 23 activó Cambio de algoritmo sobre el top 3!"
- **Durante la pregunta**: la pregunta en grande, las 3 opciones (A, B, C), el temporizador y cuántos grupos ya están "posicionados" (por ejemplo "31/40", sin revelar en qué carril).
- **Revelado (~3 s, superpuesto al mapa)**: opción correcta resaltada y "28 de 40 grupos acertaron". El juego sigue detrás.
- **Ganador**: el único grupo con la sudadera, en grande; el resto en la cola con el cartel SOLD OUT.
- **Repaso de errores**: una pantalla por pregunta difícil, con la distribución de respuestas, la correcta y la explicación; botones "Siguiente" y "Terminar".
- **Controles del docente o presentador**: pausar, saltar pregunta, terminar partida, liberar grupo.
- **Indicador de red discreto**: cuántos celulares están conectados en este momento (por ejemplo "39/40 🟢").

### 4.2 Celular (jugador)
- **Ingreso**: código de sala (o directo desde el QR) y elección del número de grupo en una grilla (los tomados aparecen bloqueados).
- **Espera**: "Esperando que empiece el drop…", con una barra de carga de los gráficos y el corredor 3D animado en pantalla, que sirve también de práctica para deslizar y saltar.
- **Runner 3D** (pantalla principal):
  - Cámara detrás y por encima del corredor, como en Subway Surfers, con el mundo levemente curvado hacia el horizonte.
  - Arriba: posición actual (por ejemplo "12.º de 40"), likes y ventaja activa.
  - Abajo: botón del poder guardado.
- **Pregunta**: el runner sigue en pantalla, sin obstáculos, con los 3 arcos acercándose despacio; cada arco muestra la letra y el texto corto de la opción.
- **Feedback instantáneo**: destello verde o rojo, vibración (`navigator.vibrate`) y la ventaja obtenida, sin interrumpir la carrera.
- **Final**: posición obtenida y estadísticas del grupo.
- **Conexión**: si hay un microcorte, **no aparece ningún cartel** durante los primeros segundos. Solo si el corte dura más de ~5 s aparece un ícono pequeño 📶 en una esquina; el juego nunca se bloquea (ver 5.4).

### 4.3 Estética y gráficos 3D
- Sigue el [design system](../design-system/README.md) compartido con la presentación: identidad de Nude Project en **cacao `#482922` y crema `#fff8ee`**, tipografía grotesca bold (Inter Tight / Inter) y un solo color de acento por elemento.
- Estilo **3D *low-poly* estilizado**, con colores planos o degradados suaves en lugar de texturas pesadas: se ve bien y es liviano.
- Calles de Madrid con edificios de fachadas simples, faroles y carteles, y la tienda Nude Project como meta.
- Obstáculos con siluetas claras y colores contrastados, para que se distingan rápido.
- Corredor con animaciones de **correr, saltar, cambiar de carril y tropezar**; teñido con el color del grupo y con su **número en la espalda**.
- Detalles baratos que dan "buen gráfico": cielo con degradado, niebla de distancia, sombra circular bajo el corredor, líneas de velocidad con el turbo, pequeñas partículas al juntar likes y leve sacudida de cámara al chocar.
- Música y efectos de sonido solo en el host (configurable); en el celular, efectos cortos opcionales y vibración.

---

## 5. Arquitectura técnica

```
┌──────────────┐        WebSocket        ┌──────────────────────┐
│  Host (PC +  │ ◄─────────────────────► │                      │
│  proyector)  │                         │  Servidor Node       │
└──────────────┘                         │  (Socket.io)         │
┌──────────────┐        WebSocket        │  - salas y grupos    │
│  Celular 1   │ ◄─────────────────────► │  - línea de tiempo   │
│  (runner 3D) │                         │  - preguntas         │
├──────────────┤                         │  - puntuación        │
│  Celular 40  │ ◄─────────────────────► │  - ventajas/poderes  │
└──────────────┘    + HTTPS (archivos    │  - archivos estáticos│
                    del juego, con caché)│    (Express)         │
                                         └──────────────────────┘
```

> **Un solo servidor**: el mismo proceso de Node sirve la página, el JavaScript del juego y el tiempo real. No hace falta CDN ni hosting aparte (ver 5.5).

### 5.1 Reparto de responsabilidades
- **El runner corre en el celular**: el movimiento, el salto, los obstáculos y los choques se calculan en el propio celular, para que el control sea instantáneo y no dependa de la red.
- **El servidor manda en todo lo demás**: grupos y tokens, línea de tiempo de la partida, preguntas, validación de respuestas, bonus, ventajas, poderes, ranking y estadísticas por pregunta.
- **Línea de tiempo compartida**: al empezar la partida el servidor envía el **guion** de las fases (cuándo empieza cada tramo y cada pregunta, en hora del servidor) y las semillas. Cada celular sincroniza su reloj con el del servidor y **sigue el guion solo**, aunque se corte la conexión.
- **Las respuestas correctas no se envían por adelantado** a los celulares (para evitar trampas): el celular sabe que pasó por el arco "B" y el servidor le responde si estaba bien.

### 5.2 Stack propuesto
- **Servidor**: Node.js + Express + Socket.io (tiempo real).
- **Runner del celular**: [Three.js](https://threejs.org/) (WebGL), empaquetado con [Vite](https://vitejs.dev/). Se descarta Phaser porque es 2D.
- **Modelos 3D**: **creados por nosotros, generados por código** (ver 5.3.1). No se usan modelos de terceros ni archivos `.glb`.
- **Host**: HTML + JS; el mapa de la carrera en Three.js reutilizando los mismos modelos (vista aérea simple) o en Canvas 2D si se prioriza la legibilidad.
- **Preguntas**: archivo JSON editable (ver sección 6).
- **Sin base de datos**: el estado vive en memoria mientras dura la partida.

### 5.3 Rendimiento 3D en celulares de gama baja
Objetivo: **60 FPS en gama media y 30 FPS estables en gama baja** (por ejemplo, celulares Android de 3 o 4 años con 2 a 3 GB de RAM).

**Presupuesto por cuadro**
| Recurso | Límite |
|---|---|
| Llamadas de dibujo (*draw calls*) | ≤ 80 |
| Triángulos visibles | ≤ 60.000 (personaje ≤ 1.500) |
| Materiales | 2 o 3 en total (`MeshLambertMaterial` / sombreado *toon*, sin PBR) |
| Texturas | Un único atlas de 1024×1024 o menos |
| Luces | Una luz hemisférica + una direccional, sin sombras en tiempo real |
| Descarga total del juego | ≤ 1 MB comprimido (Three.js + código; los modelos se generan en el celular) |

**Técnicas**
- **Sombras falsas**: un círculo oscuro bajo el corredor y los obstáculos, en lugar de sombras reales.
- **Niebla y distancia de dibujo corta**: lo lejano no se dibuja y la niebla oculta dónde aparece.
- **Mundo curvado** en el *vertex shader* (como Subway Surfers): da profundidad y oculta el horizonte sin costo extra.
- **Calle por bloques reciclados** (*object pooling*): los tramos de calle, edificios y obstáculos que quedan atrás se reutilizan adelante; **no se crean objetos durante la partida**, para evitar trabones del recolector de basura.
- **`InstancedMesh`** para objetos repetidos (likes, vallas, faroles, ventanas).
- **Geometrías estáticas unidas** (*merge*) por bloque de calle para reducir llamadas de dibujo.
- **Sin antialiasing por hardware ni post-procesado** en calidad baja.
- **Resolución adaptable**: la relación de píxeles se limita a 1,5 y baja automáticamente (hasta 0,75) si los FPS caen.
- **Calidad automática** con tres niveles, que se elige midiendo los FPS en el lobby y se reajusta durante la partida:

| Nivel | Resolución | Decoración | Efectos |
|---|---|---|---|
| **Alto** | ×1,5 | Completa | Partículas, líneas de velocidad, antialiasing |
| **Medio** | ×1,0 | Reducida | Partículas simples |
| **Bajo** | ×0,75 | Mínima, distancia de dibujo más corta | Sin partículas |

- El jugador también puede elegir la calidad a mano desde un botón ⚙️.
- Si el navegador no soporta WebGL, se avisa en el lobby para cambiar de celular.
- **Wake Lock** (`navigator.wakeLock`) para que la pantalla no se apague durante la partida (si se apaga, se corta la conexión).
- El render se detiene si la pestaña queda oculta, para no gastar batería.

#### 5.3.1 Assets 3D generados por código
Todos los modelos 3D se **crean desde cero en JavaScript** (a cargo de Claude), armando primitivas simples de Three.js (cajas, cilindros, conos, esferas de pocas caras) que se unen en una sola geometría por modelo, con **colores por vértice** en lugar de texturas.

**Por qué así**
- **Casi no hay descarga**: los modelos son unas pocas decenas de KB de código y se generan en el celular al cargar el lobby. Clave con 40 celulares en el mismo Wi-Fi.
- **Sin licencias** ni dependencia de packs de terceros.
- **Fáciles de ajustar**: cambiar un color, una proporción o la paleta Nude Project es editar un número.
- **Rendimiento**: geometrías unidas y sin texturas significan pocas llamadas de dibujo y un solo material compartido.

**Catálogo**
| Modelo | Cómo se arma | Triángulos aprox. |
|---|---|---|
| **Corredor** | Figura articulada (cabeza, torso, brazos y piernas en dos partes) con buzo con capucha estilo Nude Project, teñido con el color del grupo y número en la espalda | ≤ 1.500 |
| **Valla de la cola** | Dos postes y barras con franjas | ≤ 150 |
| **Fan haciendo fila** | Versión simplificada del corredor, quieta y con celular en la mano | ≤ 600 |
| **Bot revendedor** | Robot de cajas con antena y ojos que brillan, con muchas bolsas | ≤ 500 |
| **Bache del algoritmo** | Pozo en el piso con flecha de gráfico hacia abajo | ≤ 100 |
| **Caja de stock** | Pila de cajas de cartón con cinta y logo | ≤ 150 |
| **Camión de reparto** | Cabina y caja de carga, ruedas de pocas caras | ≤ 600 |
| **Bloque de calle** | Asfalto con líneas de carril, veredas, cordón; una sola geometría por bloque | ≤ 300 |
| **Edificios de Madrid** | Fachadas de varias alturas con balcones y ventanas (instanciados, con variaciones de color y altura) | ≤ 400 c/u |
| **Decoración** | Faroles, árboles, carteles de drop, vallas publicitarias | ≤ 150 c/u |
| **Like ❤️** | Corazón extruido que gira, instanciado | ≤ 100 |
| **Arco de respuesta** | Marco con la letra y el texto corto de la opción (texto dibujado en un `CanvasTexture` generado al vuelo) | ≤ 200 |
| **Tienda Nude Project** | Fachada minimalista blanca y negra con vidriera, cartel "DROP" y cola de gente | ≤ 2.000 |

**Animación del corredor (procedural, sin esqueleto)**
- Las partes del cuerpo son grupos con pivote en la articulación y se animan con funciones seno según la velocidad: **correr** (brazos y piernas alternados, leve rebote), **saltar** (piernas recogidas, brazos arriba), **cambiar de carril** (inclinación del torso hacia el lado), **tropezar** (giro hacia adelante y recuperación).
- Es mucho más barato que un personaje con esqueleto (*skinning*) y alcanza para el estilo *low-poly*.

**Paleta**
- Todos los colores salen de [`design-system/tokens.js`](../design-system/tokens.js) (`colores3d.juego` y `colorDeGrupo(n)`), nunca escritos a mano en los modelos.
- Base cacao, crema y tonos tierra (identidad Nude Project; fachadas de Madrid de `#efe2d0` a `#a8664a`), con un color de acento por elemento de juego: ladrillo para los obstáculos altos, mostaza para los bajos (los que se saltan), rosa para los likes y el color de cada grupo (40 colores del design system) en su corredor. Así cada tipo se reconoce de un vistazo.
- El cielo es un degradado en un *shader* y la niebla toma su color, para que todo se funda en el horizonte.

**Herramientas de trabajo**
- Un **visor de modelos** (`/dev/models`) que muestra cada modelo girando, con su cantidad de triángulos, para revisarlos y ajustarlos.
- Si más adelante se quiere editar un modelo en Blender, se puede exportar a `.glb` con `GLTFExporter` desde el visor.

### 5.4 Red, microcortes y reconexión invisible
El objetivo es que un corte de unos segundos **no se note**: el juego sigue corriendo y al volver la conexión todo se pone al día.

**Mientras no hay conexión, el celular sigue jugando**
- El runner, los obstáculos y el temporizador de la pregunta siguen funcionando con el **guion de la partida** y el reloj sincronizado.
- La respuesta (el arco atravesado y el momento en hora del servidor) se guarda en una **cola de salida** local y se reenvía hasta recibir confirmación (`ack`).
- Si el revelado llega mientras está desconectado, el celular muestra "✔ Respuesta guardada" y sigue corriendo; el resultado (✅/❌ y la ventaja) aparece en cuanto vuelve la conexión.

**Al volver la conexión**
- Socket.io reconecta solo, con reintentos rápidos (el primero casi inmediato).
- Se usa la **recuperación de estado de conexión** de Socket.io (v4.6+), que reenvía los eventos perdidos durante cortes cortos (hasta 2 min).
- Además, el servidor envía un **`state:sync`** con el estado completo del grupo (fase actual, bonus acumulado, ventaja, poder, posición) para corregir cualquier diferencia.
- Las correcciones se aplican **de forma suave** (por ejemplo, la posición en el ranking se anima), nunca con saltos bruscos ni pantallas de "reconectando".

**Mensajes resistentes a la pérdida**
- El celular envía su **distancia corrida total** (no incrementos): si se pierde un mensaje, el siguiente lo corrige.
- Las respuestas llevan el número de pregunta y la hora en que se atravesó el arco: el servidor las acepta aunque lleguen tarde, siempre que se hayan dado a tiempo (con un margen de tolerancia configurable) y **las cuenta una sola vez**.
- El servidor calcula el revelado ~1 s después del límite con las respuestas recibidas, y suma las que lleguen tarde al resultado (el host actualiza el número de aciertos).

**Ajustes de Socket.io**
- `pingInterval` y `pingTimeout` más largos de lo habitual (por ejemplo 10 s y 20 s), para que un microcorte no se considere desconexión.
- Transporte WebSocket con *fallback* a *long-polling*, por si la red de la facultad bloquea WebSocket.
- Todo por **HTTPS en el puerto 443**, que es lo que menos suelen bloquear los firewalls institucionales.

**En el host**
- Si un grupo deja de mandar datos, su marcador **sigue avanzando** con la última velocidad conocida durante unos segundos (predicción) y luego se ve atenuado hasta que vuelve.
- El lugar del grupo queda reservado durante toda la partida.

### 5.5 Escala: 40 grupos en la misma red
**Carga del servidor** (baja para un solo proceso de Node):
- 40 celulares × 4 mensajes de distancia por segundo = **160 mensajes/s** de entrada, de pocos bytes cada uno.
- Al host se le envían las posiciones **agregadas** 5 veces por segundo en un solo mensaje compacto (un arreglo con `[id, distancia, ventaja]` por grupo, ~1 KB).
- A cada celular solo se le envía su **propia posición** en el ranking una vez por segundo; los celulares no reciben los datos de los otros 39 grupos.
- Los cambios de carril durante la pregunta se envían con un límite (como máximo 2 por segundo por celular).

**Wi-Fi de la facultad**
- Con 40 celulares en el mismo punto de acceso, lo que más pesa es la **descarga inicial** del juego (40 × ~1 MB = ~40 MB), no la partida en sí. Por eso:
  - **No hace falta CDN**: como los modelos 3D se generan por código, todo el juego pesa ~1 MB y el mismo servidor de Node lo sirve sin problema. 40 MB repartidos en unos minutos es muy poco para cualquier hosting.
  - Los archivos se sirven **ya comprimidos** (Vite genera versiones Brotli y gzip al compilar) y con nombres con *hash*, con cabecera `Cache-Control: immutable` de un año: cada celular los descarga una sola vez.
  - Se cachean con un *Service Worker* y cabeceras de caché: si un celular recarga, no vuelve a descargar nada.
  - Se pide a los grupos que **entren al lobby antes** (por ejemplo, al principio de la presentación) para que la descarga no se concentre en el último minuto.
- Las redes institucionales suelen tener **portal cautivo** (hay que iniciar sesión) y **aislamiento de clientes** (los celulares no se ven entre sí ni ven a una notebook de la misma red). Por eso la opción en la nube es la principal (ver sección 10).
- Todos los celulares comparten la misma IP pública: no aplicar límites de conexión por IP en el servidor ni en el hosting.
- Plan B siempre disponible: que cada celular use **datos móviles**; el juego consume muy poco durante la partida.

### 5.6 Eventos de Socket.io (borrador)

| Dirección | Evento | Datos |
|---|---|---|
| host → server | `host:create_room` | `{ maxGroups }` |
| server → host | `room:created` | `{ code }` |
| server → todos | `room:groups` | `[{ number, color, taken, connected }]` |
| player → server | `player:join` | `{ code, groupId, deviceToken? }` |
| server → player | `player:joined` | `{ groupId, deviceToken }` |
| server → player | `player:join_rejected` | `{ reason: "taken" \| "room_not_found" }` |
| host → server | `host:release_group` | `{ groupId }` |
| player ↔ server | `time:ping` / `time:pong` | `{ clientTime }` / `{ clientTime, serverTime }` (sincronización de reloj) |
| host → server | `host:start` | `{ settings }` |
| server → todos | `game:script` | `{ startsAt, phases: [{ type, index, startsAt, duration, seed? }], difficulty }` |
| server → player | `run:modifiers` | `{ advantage?, slowStart?, extraObstacles? }` |
| player → server | `run:progress` | `{ runDistance, hits, jumps, likes }` |
| server → host | `run:positions` | `[[id, distance, advantage, connected]]` |
| server → player | `run:rank` | `{ position, total }` |
| server → todos | `question:start` | `{ index, text, options, shortOptions, timeLimit, closedOption? }` |
| player → server | `question:lane` | `{ index, lane }` (para el contador "posicionados") |
| player → server | `question:answer` | `{ index, lane, serverTime }` (con reintento hasta el `ack`) |
| server → player | `question:answer_ack` | `{ index }` |
| server → player | `question:result` | `{ index, correct, bonus, advantageId?, powerId? }` |
| server → host | `question:reveal` | `{ index, correctIndex, correctCount, total, distribution }` |
| player → server | `player:use_power` | `{ powerId }` |
| server → player | `state:sync` | `{ phase, bonusDistance, advantage, power, position, answeredIndexes }` |
| server → todos | `game:end` | `{ winner, queue, stats }` (un solo ganador; `queue` es el orden de llegada del resto) |
| server → host | `review:data` | `[{ index, text, options, correctIndex, distribution, explanation }]` (preguntas con más errores) |
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
      "explicacion": "Explicación que se muestra en el repaso final si esta pregunta fue de las más erradas.",
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
| `explicacion` | texto | **Recomendado**; se muestra en el **repaso de errores** al final (no durante la carrera). Puede ser más larga que antes, ya que hay tiempo para leerla y comentarla |
| `tiempo` | número | Opcional; segundos para responder (por defecto 20) |

> El servidor **mezcla el orden de las opciones** en cada partida, para que la respuesta correcta no quede siempre en el mismo carril. Las estadísticas del repaso se muestran con el orden mezclado que vieron los grupos.

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
| `maxGrupos` | 40 | Cantidad de grupos; se numeran del 1 a este valor |
| `cantidadPreguntas` | 10 | Cuántas preguntas del banco se usan |
| `ordenAleatorio` | true | Mezclar el orden de las preguntas |
| `mezclarOpciones` | true | Mezclar el orden de las opciones en los carriles |
| `tiempoPorDefecto` | 20 | Segundos por pregunta |
| `duracionTramo` | 22 | Segundos de cada tramo de carrera |
| `duracionRevelado` | 3 | Segundos que el proyector resalta la respuesta correcta (el juego no se frena) |
| `preguntasEnRepaso` | 3 | Cuántas de las preguntas más erradas se explican al final |
| `dificultadObstaculos` | `"facil"` | `"facil"`, `"normal"` o `"caotico"` |
| `saltoActivo` | true | Salto con deslizar hacia arriba (si se desactiva, no aparecen obstáculos que obliguen a saltar) |
| `calidadGrafica` | `"auto"` | `"auto"`, `"alta"`, `"media"` o `"baja"` |
| `toleranciaRespuestaTardia` | 10 | Segundos durante los que se acepta una respuesta que llega tarde por un corte (si se dio a tiempo) |
| `bonusAcierto` | 150 | Distancia base por respuesta correcta |
| `bonusRapidezMax` | 100 | Distancia extra máxima por responder rápido |
| `penalizacionChoque` | 1.0 | Segundos de frenado al chocar |
| `poderesActivos` | true | Activar o desactivar poderes y rachas |
| `rachaParaPoder` | 3 | Aciertos seguidos necesarios para ganar un poder |
| `emparejar` | true | Bonus de velocidad para el último cuarto de la tabla |
| `sonido` | true | Música y efectos en el host |

**Referencia para balancear:** si a velocidad normal un tramo de 22 s equivale a unas **200 unidades** de distancia, una respuesta correcta (150 a 250) tiene que valer **lo mismo o más que un tramo completo**. Chocar en un tramo le cuesta al grupo solo unas 10 a 20 unidades.

---

## 8. Estructura del juego (propuesta)

El juego vive en `juego/` dentro del repositorio del trabajo, junto a `presentacion/` y `design-system/`. Los estilos y colores no se definen acá: se importan del design system (Vite sirve `../design-system` con `server.fs.allow`, y el build lo copia).

```
juego/
├── PLANIFICACION.md
├── package.json
├── vite.config.js
├── server/
│   ├── index.js          # Express + Socket.io (con recuperación de estado)
│   ├── game.js           # Guion de fases, temporizadores, puntuación, ventajas, poderes
│   ├── rooms.js          # Salas, grupos y tokens de dispositivo (un celular por grupo)
│   ├── stats.js          # Estadísticas por pregunta y selección del repaso de errores
│   ├── presentacion.js   # Drop falso y votación de la presentación (ver presentacion/PLANIFICACION.md)
│   └── config.js         # Carga de config.json y valores por defecto
├── public/
│   ├── host/
│   │   ├── index.html    # Pantalla del proyector
│   │   ├── host.js       # Conexión, fases, revelado y repaso
│   │   └── map.js        # Mapa de la carrera (40 marcadores) y ranking animado
│   ├── play/
│   │   ├── index.html    # Controlador del celular
│   │   ├── play.js       # Fases e interfaz (HUD, pregunta, feedback)
│   │   ├── net.js        # Socket, sincronización de reloj, cola de salida y state:sync
│   │   ├── timeline.js   # Sigue el guion de la partida aunque no haya conexión
│   │   ├── runner.js     # Lógica a paso fijo: carriles, salto, choques
│   │   ├── track.js      # Generación de obstáculos a partir de la semilla
│   │   ├── input.js      # Deslizar (izquierda, derecha, arriba) y tocar, con buffer
│   │   └── render/
│   │       ├── scene.js      # Renderer, cámara, luces, niebla, mundo curvado
│   │       ├── world.js      # Bloques de calle reciclados e instancias
│   │       ├── character.js  # Personaje y animaciones procedurales
│   │       ├── models/       # Modelos generados por código (ver 5.3.1)
│   │       │   ├── kit.js        # Utilidades: primitivas, colores por vértice, unión de geometrías
│   │       │   ├── runner.js     # Corredor articulado
│   │       │   ├── obstacles.js  # Valla, fan, bot, bache, caja, camión
│   │       │   ├── street.js     # Bloques de calle, veredas, edificios, faroles, carteles
│   │       │   ├── props.js      # Likes, arcos de respuesta, power-ups
│   │       │   └── store.js      # Tienda de la meta
│   │       ├── effects.js    # Partículas, líneas de velocidad, sacudida de cámara
│   │       └── quality.js    # Medición de FPS y niveles de calidad
│   ├── assets/           # Sonidos (tipografías y colores vienen del design system; sin modelos 3D: se generan por código)
│   ├── sw.js             # Service Worker para cachear los assets
│   └── shared/
│       ├── styles.css    # Solo layout propio; importa design-system/tokens.css y components.css
│       └── rng.js        # Generador aleatorio con semilla (compartido)
├── tools/
│   └── bots.js           # Simulador de 40 jugadores para pruebas de carga
└── data/
    ├── preguntas.json
    └── config.json
```

- `/host` es la pantalla del proyector.
- `/play` (o la raíz) es la entrada de los celulares, a la que lleva el QR.

---

## 9. Plan de trabajo

### Fase 0: Prototipo técnico (riesgos primero)
- [ ] Escena 3D mínima en Three.js: calle infinita reciclada, corredor que cambia de carril y salta, obstáculos simples
- [ ] **Medir FPS en 2 o 3 celulares de gama baja reales** y ajustar el presupuesto de la sección 5.3
- [ ] Prueba de reconexión: cortar el Wi-Fi unos segundos en medio de un tramo y verificar que el juego sigue
- [ ] Simulador de 40 bots (`tools/bots.js`) contra el servidor

### Fase 1: Base jugable (solo preguntas)
- [ ] Inicializar el proyecto Node con Express, Socket.io y Vite
- [ ] Crear sala con código y QR; lista de grupos con **un celular por grupo** y token de dispositivo
- [ ] Cargar las preguntas desde el JSON
- [ ] Guion de la partida, sincronización de reloj y ciclo pregunta → elección de carril → **revelado instantáneo**
- [ ] Puntuación por distancia y ranking en el host para 40 grupos
- [ ] Estadísticas por pregunta, pantalla final con ranking y **repaso de errores**

### Fase 2: Runner 3D y obstáculos
- [ ] Runner 3D de 3 carriles con controles de deslizar, tocar y **saltar**
- [ ] Simulación a paso fijo e interpolación del render
- [ ] Generación de obstáculos altos y bajos con semilla (`rng.js` + `track.js`)
- [ ] Choques: tropiezo, frenado e invulnerabilidad
- [ ] Likes coleccionables (en el piso y en el aire)
- [ ] Envío de la distancia al servidor y mapa en vivo en el host
- [ ] Arcos de respuesta dentro del runner y feedback sin pausa
- [ ] Sprint final, meta con la tienda, un único ganador y cartel SOLD OUT para el resto

### Fase 3: Red robusta, ventajas y poderes
- [ ] Cola de salida con `ack`, `state:sync` y recuperación de estado de Socket.io
- [ ] Predicción de marcadores en el host para grupos sin datos
- [ ] Liberar grupo desde el host
- [ ] Ventajas por respuesta correcta (turbo, escudo, imán, ruta VIP)
- [ ] Rachas y poderes (Cambio de algoritmo, 50/50, Hype)
- [ ] Mecanismo para emparejar
- [ ] Sonidos, música y vibración

### Fase 4: Gráficos, pulido y prueba
- [ ] Modelos finales generados por código: corredor animado, obstáculos, calles de Madrid, tienda, arcos (ver 5.3.1)
- [ ] Visor de modelos (`/dev/models`) para revisarlos y ajustar colores y proporciones
- [ ] Aplicar el [design system](../design-system/README.md) (paleta, tipografía, cielo, niebla, componentes `np-*`)
- [ ] Efectos: partículas, líneas de velocidad, sacudida de cámara, *squash & stretch*
- [ ] Calidad automática, resolución adaptable, Wake Lock y Service Worker
- [ ] Controles del presentador (pausar, saltar, terminar)
- [ ] **Balanceo**: comprobar que acertar pese más que esquivar (sección 7)
- [ ] Prueba de carga con 40 bots + algunos celulares reales a la vez
- [ ] Prueba en el **Wi-Fi real de la facultad** (portal cautivo, WebSocket, velocidad de descarga)
- [ ] Deploy

---

## 10. Despliegue

Con 40 grupos en la red de la facultad, la nube pasa a ser la **opción principal**.

### A. En la nube (principal)
- Servidor de Node en **Fly.io** (región São Paulo `gru`, la más cercana), **Railway** o **Render**: todos soportan WebSockets y HTTPS en el puerto 443.
- **Un solo servidor**: el mismo proceso de Node sirve los archivos del juego (Express) y el tiempo real (Socket.io), en el mismo dominio. No hace falta CDN.
- Los celulares entran por una URL pública usando el Wi-Fi de la facultad o datos móviles.
- ⚠️ Los planes gratuitos pueden "dormir" el servidor: abrir la URL unos minutos antes de la clase (o usar un plan que no duerma ese día).
- Un solo proceso de Node alcanza de sobra para 40 jugadores (ver 5.5).

### B. Red local (respaldo, con limitaciones)
- Correr el servidor en la notebook del presentador (`npm start`).
- ⚠️ El Wi-Fi de la facultad probablemente tiene **aislamiento de clientes**, así que los celulares no van a ver a la notebook.
- ⚠️ Un hotspot de celular o de notebook suele aceptar **solo 8 a 10 dispositivos**: no alcanza para 40.
- Solo es viable con un **router propio** que soporte 40 clientes. Los celulares entran por `http://IP-DE-LA-NOTEBOOK:3000` (el QR la muestra automáticamente).

> Como el runner corre en el celular y sigue el guion aunque se corte la red, una conexión lenta o intermitente **no afecta el control del personaje**: solo puede demorar un poco la actualización del mapa en el proyector.

---

## 11. Integración con la presentación

Ver también la [estructura de la presentación](../presentacion/README.md): el juego ocupa el último bloque.

La presentación es interactiva y usa **el mismo servidor** ([plan de la presentación](../presentacion/PLANIFICACION.md)): los grupos entran con el QR antes de empezar, participan del *drop* falso y de una votación desde el mismo celular, y esa sesión pasa directo al lobby del juego. El controlador del celular (`public/play/`) suma esas fases de la presentación.

- **Momento**: al final de los 15 minutos de exposición, como repaso. El bloque del juego dura **10 minutos** (1 de instrucciones, ~7 de carrera y 2 de repaso de errores y debate), para un total de **25 minutos**.
- **Antes de jugar**:
  - Pedir que cada grupo tenga **un** celular con batería, conexión y el brillo alto.
  - Mostrar el QR **al principio de la presentación** para que los 40 grupos entren al lobby con tiempo y se descarguen los gráficos.
  - El lobby funciona como práctica: el corredor 3D ya se puede mover y saltar mientras esperan.
  - Sugerir un rol por grupo: uno **maneja el celular** y los demás **leen la pregunta en el proyector** y le dicen qué carril elegir. Así participa todo el grupo.
- **Después de jugar**:
  - **Repaso de errores**: comentar las preguntas que más se equivocaron, con sus explicaciones.
  - Usar el resultado (un ganador y 39 grupos sin sudadera) para abrir el debate sobre exclusividad vs. accesibilidad y conectarlo con los desafíos del caso.

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| 40 celulares saturan el Wi-Fi de la facultad | Juego liviano (≤ 1 MB, modelos generados por código) servido comprimido, caché con Service Worker, entrar al lobby con tiempo; datos móviles como plan B |
| El Wi-Fi tiene portal cautivo | Avisar que inicien sesión en el Wi-Fi antes de escanear el QR; probar la red con anticipación |
| La red bloquea WebSocket o puertos raros | HTTPS en el puerto 443 y *fallback* a *long-polling* |
| Aislamiento de clientes en la red | Servidor en la nube (opción A) |
| Microcortes de conexión | El juego sigue con el guion local; cola de respuestas con reintento; `state:sync` al volver; sin carteles de reconexión |
| Un celular se queda sin batería | El presentador libera el grupo y otro celular lo retoma conservando la distancia |
| Dos celulares del mismo grupo | Un solo celular por grupo, con token de dispositivo; el segundo es rechazado |
| El 3D va lento en celulares viejos | Presupuesto de rendimiento, calidad automática, resolución adaptable; prueba temprana en Fase 0 |
| El celular se calienta o se apaga la pantalla | Partida corta, límite de FPS en calidad baja, Wake Lock |
| Celular sin WebGL | Aviso en el lobby para usar otro celular del grupo |
| Esquivar distrae de las preguntas | Sin obstáculos durante las preguntas y aviso de "mirá el proyector"; roles dentro del grupo |
| Los grupos hábiles esquivando ganan aunque no sepan | Balanceo: el acierto vale más que un tramo entero; choques con castigo bajo |
| Obstáculos demasiado difíciles | Dificultad "fácil" por defecto, siempre un carril libre o saltable, práctica en el lobby |
| 40 grupos no se leen en el proyector | Marcadores con número grande, top 10 destacado, agrupación de marcadores cercanos |
| Proyector de baja resolución | Tipografías grandes y alto contraste; probar antes en el aula |
| Servidor gratuito dormido | Abrirlo antes de la clase |

---

## 13. Pendientes y decisiones abiertas

**Decididas**
- [x] Cantidad de grupos: hasta **40**, un celular por grupo
- [x] Vista del runner: **3D** estilo Subway Surfers (Three.js)
- [x] Motor: **Three.js** (se descarta Canvas 2D y Phaser)
- [x] Salto: **incluido** desde el principio
- [x] Revelado: instantáneo y sin pausa; explicaciones en el **repaso de errores** final
- [x] Nombres de grupos: **solo número** (1 a 40)
- [x] Assets 3D: **los crea Claude**, generados por código (ver 5.3.1)

**Abiertas**
- [ ] Redactar el banco de preguntas (`data/preguntas.json`), con 2 o 3 opciones y una buena explicación por pregunta
- [ ] Conseguir 2 o 3 celulares de gama baja para las pruebas de rendimiento
- [ ] Averiguar cómo es el Wi-Fi de la facultad (portal cautivo, bloqueos) y probarlo
- [ ] Elegir el hosting del servidor (uno solo)
- [ ] Hacer un ensayo general con el equipo

---

## Créditos
Proyecto académico basado en el caso de estudio *"Nude Project: comunidad, comunicación y autenticidad en la era digital"*.
Materia: Comercialización · Licenciatura en Administración.
