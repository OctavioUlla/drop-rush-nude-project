# 🏃 Drop Rush · Juego

Runner 3D multijugador para el cierre de la presentación. El plan completo está en [`PLANIFICACION.md`](PLANIFICACION.md).

> **Estado: Fase 4 (gráficos, pulido y prueba).** Se juega la partida completa con el runner 3D, los 6 obstáculos, likes, arcos de respuesta, sprint final hacia la tienda Nude Project y el mapa en vivo de los 40 grupos, con ventajas, poderes, emparejar, música y red robusta (Fase 3). La Fase 4 suma **partículas, líneas de velocidad y *squash & stretch***, calles de Madrid con árboles, toldos y carteles del drop, un **visor de modelos** (`/dev/models/`), los **controles del presentador** (pausar, saltar y terminar), **Service Worker** y archivos precomprimidos, un **balanceo comprobado** con la simulación real y todo lo necesario para el **deploy** en Fly.io o Render. Falta lo que solo se puede hacer en el aula: medir FPS en celulares de gama baja reales y probar el Wi-Fi de la facultad (ver [Ensayo en el aula](#ensayo-en-el-aula)). Las preguntas de [`data/preguntas.json`](data/preguntas.json) salen de lo que se dijo en la exposición (guion y diapositivas) y son difíciles a propósito, para que haya diferencia entre los grupos.

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
| `/dev/models/` | Visor de los modelos 3D generados por código, con sus triángulos contra el presupuesto y exportación a `.glb`. |

Parámetros extra: `/play/?debug` abre el panel de pruebas (en el celular no hay botón para abrirlo), `/play/?calidad=alta|media|baja` fija la calidad gráfica y `/host/?debug` (o 🐞) muestra la carga del servidor, las mediciones de FPS y el botón para terminar la partida.

Para producción: `npm run build` y después `npm start`. El build deja junto a cada archivo su versión Brotli y gzip, y el servidor manda la que acepte el navegador (los archivos con *hash* con caché `immutable` de un año). En producción el celular registra un **Service Worker** (`/sw.js`) que guarda el juego: si recarga, no vuelve a descargar nada. Todo lo que baja un celular pesa **~250 kB** con Brotli (Three.js ~116 kB, el juego ~30 kB y las dos tipografías ~93 kB). Para subirlo a la nube, ver [Deploy](#deploy).

**Controles**: deslizar a izquierda o derecha (o tocar ese lado de la pantalla) para cambiar de carril y deslizar hacia arriba para saltar. El poder guardado se usa con el botón amarillo de abajo. En la compu: flechas, A/D/W o espacio, y E (o Enter) para el poder.

## Cómo se juega una partida

1. **Proyector**: abrir `/host/`. Se crea una sala con un código de 4 letras y un QR. Si se recarga la página, vuelve a la misma sala (la clave queda guardada en el navegador); *Ajustes → Nueva sala* crea otra.
2. **Celulares**: escanear el QR (o entrar a `/play/` y escribir el código) y tocar el número del grupo. Un solo celular por grupo: los números tomados aparecen bloqueados y el celular vuelve solo a su grupo si recarga o se corta la red.
   - **Profes**: debajo de los grupos están **P1 a P5**, uno por profe y cada uno con su celular. Los profes participan del hype, la votación y la carrera (aparecen en cacao en el mapa y en el ranking, con 🎓 en vez de puesto), pero corren **fuera de concurso**: nunca ganan la sudadera, no le quitan el puesto ni el impulso de emparejar a ningún grupo y no cuentan en los aciertos del revelado ni en el repaso de errores. Sí pueden recibir y usar poderes. Internamente son los grupos 101 a 105 (`shared/constantes.js`).
3. Si un celular se queda sin batería, tocar su número en el lobby (o su ficha en el ranking durante la carrera) para **liberarlo**: otro celular del grupo lo retoma conservando la distancia.
4. **Empezar el drop**. En *Ajustes* se cambia la cantidad de preguntas, la duración de tramos y preguntas, la dificultad, cuántas preguntas entran en el repaso y si hay **rachas y poderes** y **emparejar**. El 🔊 de la barra prende o apaga la música (el navegador la habilita con el primer clic en la página). Antes de la cuenta regresiva aparece la pantalla **Cómo se juega** (controles, obstáculos, likes, preguntas, ventajas y poderes, según los ajustes elegidos): **¡Arrancar!** (o Enter / →) empieza la carrera y *← Lobby* (o Esc) vuelve atrás.
5. **Tramos**: el corredor avanza solo; hay que esquivar y saltar obstáculos y juntar likes (❤ = +0,5 m cada uno; hay muchos, en filas y en arcos sobre los obstáculos bajos). Chocar no elimina: el corredor tropieza, frena 1 s y parpadea 1,5 s sin poder chocar de nuevo. El proyector muestra el **mapa de la carrera** (un marcador por grupo camino a la tienda, con cuánto le falta al primero) y el ranking al costado.
6. Durante cada pregunta, los obstáculos se hunden y se acercan **3 arcos** por la calle, uno por carril, con la letra y el texto corto de la opción: el corredor los cruza justo cuando se acaba el tiempo y cuenta el carril en el que esté. El proyector muestra la pregunta, las opciones, el tiempo y cuántos grupos ya se movieron de carril; abajo, el celular repite la letra y el texto corto de cada carril (en las preguntas de 2 opciones el tercero es una pared ✕). Acertar suma 150 m más un extra de hasta 100 m por rapidez, que baja cuanto más tarde se elige el carril (y se queda ahí): el celular muestra en vivo cuánto vale la respuesta («⚡ Si es la correcta: +243 m») y el proyector lo recuerda debajo de la pregunta. Al terminar, cada celular ve ✅ (con el desglose de la rapidez y la **ventaja** que ganó para el tramo que empieza) o ❌ (arranca el tramo un poco más lento 2 s) y el proyector resalta la correcta unos segundos sin frenar la carrera. Ver [ventajas y poderes](#qué-hay-en-la-fase-3).
7. **Sprint final y llegada**: después de la última pregunta aparece la tienda Nude Project al final de la calle y el corredor llega justo a su puerta cuando termina el sprint. Un único ganador con la sudadera y el resto en la cola (SOLD OUT). Cada celular ve su puesto, aciertos, distancia, esquivados y likes.
8. **Controles del presentador** (en la barra de arriba durante la carrera, o con el teclado):
   - **⏸ Pausar / ▶ Seguir** (`P`): todos los corredores quedan quietos donde estaban, el proyector muestra *Pausa* y los celulares *Mirá el proyector*. Al seguir, todo lo que faltaba (preguntas, ventajas, el sprint) se corre lo que duró la pausa.
   - **⏭ Saltar** (`S`): termina ya la fase en curso. En un tramo, la pregunta empieza enseguida; en una pregunta, se cierra con el carril en el que esté cada grupo y se revela al segundo.
   - **🏁 Terminar** (`F`, pide confirmación): la carrera termina ahora y gana el grupo que va primero. Solo cuentan las preguntas ya reveladas, y el repaso usa solo esas.
   - Para cancelar sin ganador y volver al lobby: 🐞 → *Cancelar la partida*.
9. **Repaso de errores** (botón en el proyector): las preguntas con menos aciertos, con cuántos grupos eligieron cada opción y la explicación. Se avanza con los botones, las flechas o el control remoto. Al final, la pregunta para el **debate** y *Volver al lobby* para otra partida con los mismos grupos.

## Pruebas

### 1. FPS en celulares reales
1. Correr el servidor en una notebook y conectar los celulares a la **misma red**. Abrir `/host/` en la notebook: el QR ya apunta a la IP de la red local. También sirve `/play/?solo` publicado en cualquier hosting estático después de `npm run build`.
2. En cada celular: abrir `/play/?debug`, entrar a un grupo y después tocar **Medir 20 s** mientras se juega normalmente.
3. El resultado aparece en el celular y en la tabla *Mediciones de FPS* del panel técnico del proyector (`/host/?debug`), con el modelo de GPU, la resolución, las *draw calls* y los triángulos. También se puede bajar en JSON desde `/api/informes`.
4. Repetir con `?calidad=alta`, `media` y `baja` para comparar.

Qué mirar: **FPS medio ≥ 30 y "% > 34 ms" bajo** en gama baja (objetivo de la sección 5.3). En calidad automática el juego arranca en *alta* y baja la resolución (y después el nivel) si los FPS caen. En calidad *baja* se dibuja a 30 FPS como máximo (el celular se calienta menos) y no hay partículas.

Medido en Chromium sin GPU (render por software, el peor caso): **~25 draw calls y ~14.000 triángulos** por cuadro en un tramo (con los árboles, toldos y efectos de la Fase 4), dentro del presupuesto de 80 llamadas y 60.000 triángulos. Las partículas y las líneas de velocidad suman una llamada cada una.

### 2. Reconexión
- **Manual**: en plena partida, cortar el Wi-Fi del celular unos segundos (o, con `/play/?debug`, tocar **Cortar red 5 s / 20 s**). El corredor tiene que seguir corriendo sin carteles; si el corte dura más de 5 s aparece solo un 📶 chico. Al volver, el panel muestra *sesiones recuperadas* y el proyector suma la respuesta si se dio a tiempo.
- **Automática**: `npm test` levanta un servidor con fases cortas y 40 bots que sufren un corte de 1 a 4 s cada uno, y verifica que **todas las respuestas llegan y se cuentan una sola vez**. También prueba las salas, el token de cada celular, liberar un grupo en plena partida, el revelado, el ganador, el desempate y la elección del repaso, (Fase 2) los obstáculos nuevos, el cruce del bot revendedor, los likes y la ubicación de la tienda en el mapa, (Fase 3) cada ventaja y cada poder, la racha, el tope del Cambio de algoritmo, emparejar, la predicción del proyector y que un poder reintentado se aplique una sola vez, (Fase 4) pausar, seguir, saltar y terminar, las reglas del balanceo y los archivos comprimidos, (la presentación) el hype colectivo con su tope de toques, la votación y la prueba con 40 bots, y (el reloj) que la hora del servidor siga bien después de que el celular durmió con la pantalla bloqueada.

### 3. 40 bots contra el servidor

```bash
npm run dev                                          # en una terminal
npm run bots -- --bots 40 --empezar --cortes 2       # en otra: crea su propia sala y la arranca
npm run bots -- --sala ABCD --bots 39 --desde 2      # o: entran a la sala del proyector (y la arranca el proyector)
npm run bots -- --presentacion                       # o: hacen la parte de la presentación (hype y votación)
```

| Opción | Descripción |
|---|---|
| `--url` | Servidor (por defecto `http://localhost:3000`; sirve uno en la nube) |
| `--sala` | Código de la sala que muestra el proyector (no hace falta con `--empezar`) |
| `--bots` | Cantidad de grupos simulados (40) |
| `--desde` | Primer número de grupo (para mezclar bots con celulares reales, por ejemplo `--desde 11`) |
| `--empezar` | El script hace de proyector: crea una sala, la arranca y al final pide el repaso |
| `--preguntas`, `--tramo`, `--pregunta` | Largo de la partida (8, 15 s y 15 s) |
| `--cortes`, `--corte-min`, `--corte-max` | Microcortes por bot y su duración en segundos |
| `--polling` | Fuerza *long-polling*, como si la red bloqueara WebSocket |
| `--presentacion` | El script hace de presentación: lanza el hype colectivo y abre y cierra la votación con los bots, y verifica que el drop salga con todos los grupos, que ningún celular pase el tope de toques y que el conteo coincida con el último voto de cada bot |

Al final muestra un resumen (respuestas confirmadas, cortes, sesiones recuperadas, RTT) y sale con error si se perdió alguna respuesta. Los bots también responden a la presentación: si entran a la sala de la presentación (`--sala` con el código de la portada), tocan HYPE cuando se lanza el hype (algunos más rápido que el tope de 8 por segundo) y votan cuando se abre la votación (uno de cada cuatro cambia su voto). Mientras corre, `/host/?debug` muestra los mensajes por segundo, la demora del *event loop* y la memoria del servidor. Los bots también siguen las pausas y los saltos del presentador.

**Resultado (Fase 4)**, contra el build de producción (`npm start`) en una notebook, con 40 bots, 6 preguntas de 10 s y 2 cortes de 1 a 6 s por bot: **240 de 240 respuestas** confirmadas y contadas una sola vez, 79 cortes y 79 sesiones recuperadas, 17 poderes usados sin rechazos, ~20.000 mensajes de distancia y RTT mediano de 1 ms (p95 3 ms, red local). Falta repetirlo con algunos celulares reales mezclados (ver [Ensayo en el aula](#ensayo-en-el-aula)).

### 4. Balanceo

```bash
npm run balanceo                                  # dificultad caótica (la de config.json)
npm run balanceo -- --dificultad facil            # o normal; --semillas 400 para más precisión
```

Corre cientos de tramos con la simulación real del corredor (`runner.js` + `track.js`) y dos jugadores extremos: uno que nunca choca y otro que se queda en el carril del medio sin saltar (choca con todo lo que aparece ahí). La diferencia es lo máximo que se puede perder por no saber esquivar, y se compara con lo que vale responder bien (sección 7). `npm test` comprueba las mismas reglas.

| Con 8 preguntas | Fácil | Normal | Caótico (por defecto) |
|---|---|---|---|
| Tramo completo (el primero / el más largo) | 142 / 180 m | 142 / 180 m | 142 / 180 m |
| Respuesta correcta | **150 a 250 m** | 150 a 250 m | 150 a 250 m |
| Choques por tramo sin esquivar nada | 2,2 | 3,4 | 4,9 |
| Costo de cada choque | ~8 m | ~8 m | ~8 m |
| Pérdida en **toda la carrera** sin esquivar nada | **158 m** | 237 m | 328 m |
| Turbo durante un tramo | +57 m | +57 m | +57 m |
| Cambio de algoritmo recibido | −6 m | −3 m | −2 m |
| Likes de toda la carrera (sin buscarlos / todos los que se pueden) | ~49 / 157 m | ~53 / 168 m | ~55 / 160 m |

Las reglas que miran **toda la carrera** (no esquivar nada, juntar todos los likes) se calibraron con 6 preguntas: con más preguntas hay más tramos, así que el tope crece en proporción y se comparan con **una respuesta correcta cada 6 preguntas** (con 8, 200 m).

Conclusiones:
- **En fácil, se cumplen todas las reglas**: una respuesta correcta vale más que cualquier tramo, cada choque cuesta ~8 m y un grupo que no esquiva **nada** en toda la carrera pierde 158 m, menos que el tope de 200 m (apenas más que **una** respuesta correcta, en una carrera de 8).
- En *normal* y *caótico* no esquivar nada cuesta entre 1,6 y 2,2 respuestas: siguen pesando más las preguntas (8 preguntas valen 1200 a 2000 m), y una respuesta sigue valiendo más que cualquier tramo. Aun así *caótico* es la dificultad por defecto: en las pruebas, *fácil* y *normal* resultaron demasiado fáciles. *Fácil* sigue disponible en *Ajustes*.
- El **impulso de emparejar** (+10 % al último cuarto) suma hasta ~235 m en toda la carrera: es a propósito, para que los de atrás no se desenganchen, y solo lo reciben mientras están en el último cuarto.
- El **Cambio de algoritmo** molesta (vibración, cartel y obstáculos que salen del piso) pero cuesta pocos metros, porque los obstáculos extra nunca se ponen cerca de los que ya hay.

## Ensayo en el aula

Lo que queda de la Fase 4 solo se puede hacer con celulares y la red reales. Lista para el ensayo (idealmente en el aula, unos días antes):

1. **Deploy** en la nube (ver [Deploy](#deploy)) y abrir `/api/health` desde la red de la facultad.
2. **Wi-Fi de la facultad**: conectar un celular, ver si aparece un **portal cautivo** (hay que iniciar sesión antes de escanear el QR) y abrir `/play/?debug`. En el panel de pruebas la línea `red` tiene que decir `websocket`; si dice `polling`, la red bloquea WebSocket pero el juego funciona igual (más lento el mapa).
3. **Velocidad de descarga**: con 5 a 10 celulares a la vez, cronometrar cuánto tarda en aparecer el corredor la primera vez (son ~250 kB) y después recargar: con el Service Worker tiene que ser instantáneo.
4. **FPS** en 2 o 3 celulares de gama baja: `/play/?debug` → *Medir 20 s* jugando normalmente (ver [prueba 1](#1-fps-en-celulares-reales)). Objetivo: FPS medio ≥ 30.
5. **Carga mixta**: `npm run bots -- --url https://TU-APP --sala ABCD --bots 35 --desde 6 --cortes 2` mientras 5 celulares reales juegan los grupos 1 a 5, con el proyector conectado. Mirar en `/host/?debug` la demora del *event loop* (< 20 ms) y que el mapa se mueva fluido.
6. **Corte de red** con un celular real: apagar el Wi-Fi 5 s en plena pregunta y volver; la respuesta tiene que contar.
   - **Pantalla bloqueada**: bloquear un celular unos minutos (como durante la exposición) y desbloquearlo en el lobby: la cuenta regresiva y las preguntas tienen que coincidir con el proyector. Android y iOS frenan el reloj de la página mientras el celular duerme; el juego lo detecta y corrige la hora apenas despierta.
7. **Controles**: pausar, seguir, saltar una pregunta y terminar, mirando que los celulares sigan al proyector.
8. **Proyector**: mirar la legibilidad del mapa y del ranking con 40 grupos desde el fondo del aula.
9. **Foto del grupo** en un iPhone y un Android reales: en la espera de la presentación, *Selfie* (cámara frontal) y *Fit check* (trasera), aceptar y negar el permiso de cámara (con el permiso negado se saltea sin trabarse), *Otra vez / Usar esta* y la foto en el lobby, el ranking y la cola del proyector. Necesita HTTPS (el deploy) o `localhost`.

## Deploy

El servidor es un único proceso de Node (Express + Socket.io) que sirve el juego y el tiempo real en el mismo dominio y puerto (sección 10). El estado de la partida vive en memoria: **tiene que haber una sola instancia**.

El plan para la clase es el **VPS de DonWeb** con deploy automático; la **notebook con Cloudflare Tunnel** queda de respaldo si el VPS o su red fallan ese día.

### VPS de DonWeb (el plan)

Cada push a `main` que toca `juego/`, `presentacion/`, `design-system/` o `deploy/vps/` dispara el workflow [**Deploy al VPS**](../.github/workflows/deploy-vps.yml): corre las pruebas, construye la imagen del [`Dockerfile`](Dockerfile), la sube a GitHub Container Registry (`ghcr.io/octavioulla/drop-rush:<commit>`) y la levanta en el VPS por SSH. En el VPS corren dos contenedores ([`deploy/vps/docker-compose.yml`](../deploy/vps/docker-compose.yml)): el juego y **Caddy**, que saca y renueva solo el certificado HTTPS y pasa los WebSockets. No hace falta comprar un dominio: sin dominio se usa la IP en [sslip.io](https://sslip.io) (`200-58-1-2.sslip.io`), que tiene certificado de verdad.

**Protecciones.** El deploy **no reinicia el servidor si hay alguien conectado** (celulares, proyector o presentación; lo cuenta `/api/health`), para no cortar una clase con un push: el workflow falla con un aviso y hay que correrlo a mano con *forzar*. Si la imagen nueva no da sano el healthcheck en 90 segundos, vuelve sola a la anterior. Al final el workflow abre `https://DOMINIO/api/health` desde afuera y deja las direcciones en el resumen del run.

**Configuración (una sola vez).**

1. El Cloud Server de DonWeb tiene **AlmaLinux 10** (también sirve Ubuntu o Debian; alcanza 1 vCPU y 1 GB, porque la imagen se construye en GitHub y no en el VPS). El panel de DonWeb tiene firewall propio: abrir ahí el puerto de SSH (**22** o el que use el VPS), **80 y 443** (TCP, y 443 UDP).
2. En la notebook, desde la raíz del repositorio, generar la clave con la que entra GitHub Actions. Pide una frase de contraseña: **Enter dos veces** (sin frase; Actions no puede escribirla). No usar `-N ""` en PowerShell: Windows PowerShell descarta el argumento vacío y `ssh-keygen` responde *Too many arguments*. Los archivos `drop-rush-deploy*` están en el `.gitignore`.
   ```bash
   ssh-keygen -t ed25519 -C github-actions -f drop-rush-deploy
   ```
3. Preparar el VPS desde la raíz del repositorio, con la contraseña de root que da DonWeb (el dominio es opcional; sin dominio, sslip.io). Si SSH no está en el 22, agregar `-P PUERTO` a `scp` y `-p PUERTO` a `ssh` (por ejemplo `ssh -p 5022 root@IP_DEL_VPS …`):
   ```bash
   scp deploy/vps/instalar.sh drop-rush-deploy.pub root@IP_DEL_VPS:
   ```
   ```bash
   ssh root@IP_DEL_VPS bash instalar.sh drop-rush-deploy.pub juego.midominio.com
   ```
   [`instalar.sh`](../deploy/vps/instalar.sh) instala Docker CE desde el repositorio oficial (en Alma saca antes Podman, que choca con Docker), crea el usuario `deploy` con esa clave (con la etiqueta de SELinux que necesita SSH), deja abiertos en firewalld solo SSH, 80 y 443, apaga Apache o Nginx si venían prendidos y prepara `/opt/drop-rush`. En Alma no activa actualizaciones automáticas, para que no reinicien Docker en medio de una clase: correr `dnf upgrade` a mano de vez en cuando. Al final muestra el dominio, el puerto de SSH si no es el 22 y las líneas para `VPS_KNOWN_HOSTS`. Con dominio propio, antes hay que apuntar un registro **A** a la IP del VPS.
4. En GitHub → *Settings* → *Secrets and variables* → *Actions* (o con `gh`, desde la misma carpeta, en PowerShell):
   - Variable **`VPS_HOST`**: la IP del VPS (sin esta variable el workflow no despliega, solo prueba y construye).      ```powershell
     gh variable set VPS_HOST --body IP_DEL_VPS
     ```
   - Variable **`VPS_PORT`**: el puerto de SSH del VPS, si no es el 22 (sin esta variable se usa el 22; también se lee si se carga como secreto).
     ```powershell
     gh variable set VPS_PORT --body 5022
     ```
   - Secreto **`VPS_SSH_KEY`**: el contenido de `drop-rush-deploy` (la clave privada, sin `.pub`). Después se puede borrar el archivo de la notebook.
     ```powershell
     Get-Content drop-rush-deploy -Raw | gh secret set VPS_SSH_KEY
     ```
   - Secreto **`VPS_KNOWN_HOSTS`**: alguna de las líneas que mostró `instalar.sh`; alcanza con la de `ssh-ed25519` (sin este secreto se acepta la clave que presente el servidor, con un aviso). Con otro puerto las líneas empiezan con `[IP_DEL_VPS]:PUERTO`; si se cargan solo con la IP, el workflow las adapta.
     ```powershell
     gh secret set VPS_KNOWN_HOSTS --body "IP_DEL_VPS ssh-ed25519 AAAA…"
     ```
5. *Actions* → **Deploy al VPS** → *Run workflow*. El resumen del run muestra las direcciones del proyector y de la presentación.

**Día a día.** Push a `main` y listo. Para **volver atrás**, *Run workflow* con el SHA completo de un commit ya desplegado en *version* (no vuelve a construir). Para ver qué pasa en el VPS: `ssh -p PUERTO deploy@IP_DEL_VPS`, `cd /opt/drop-rush` y `docker compose logs -f juego`; [`desplegar.sh`](../deploy/vps/desplegar.sh) también se puede correr a mano ahí. Antes de la clase, abrir `/api/health` desde el Wi-Fi de la facultad (ver [Ensayo en el aula](#ensayo-en-el-aula)).

### Notebook + Cloudflare Tunnel (respaldo)

**Notebook + Cloudflare Tunnel** (gratis, sin cuenta y con la menor latencia desde Argentina: el tráfico entra por el nodo de Cloudflare en Buenos Aires). El servidor corre en la notebook del proyector y Cloudflare le da una dirección pública `https://….trycloudflare.com` con WebSockets, a la que los celulares entran por el Wi-Fi de la facultad o por datos.

1. Instalar `cloudflared` una sola vez y volver a abrir la terminal: `winget install --id Cloudflare.cloudflared` en Windows o `brew install cloudflared` en macOS.
2. En `juego/`, correr `npm run tunel`. El script compila el juego si falta `dist/` o si el código es más nuevo que la última compilación, levanta el servidor en modo producción, abre el túnel, espera a que la dirección responda y muestra las direcciones del proyector, la presentación y los celulares. No abre el navegador salvo que se pida: `npm run tunel -- --abrir host` abre el proyector y `--abrir presentacion`, la presentación (`--build` compila igual; `--puerto 3001` cambia el puerto).
3. Abrir el proyector y la presentación **con la dirección del túnel, no con `localhost`**: el QR toma la dirección de la página, así que apunta al túnel solo. La dirección cambia cada vez que se corre el script; no hace falta anotarla.
4. `Ctrl+C` cierra el servidor y el túnel.

Si el servidor se cae con el túnel abierto (no debería: un error inesperado se anota en la terminal y el servidor sigue), el script lo vuelve a levantar solo con **la misma dirección**. La sala vive en memoria y se pierde: el proyector y la presentación crean otra al reconectarse y cada celular pide el código nuevo que muestra el proyector y se vuelve a tocar el número del grupo.

Probado desde Argentina con 40 bots por el túnel, 3 preguntas y un corte por bot: 120 de 120 respuestas contadas una sola vez, 40 sesiones recuperadas y RTT mediano de 17 ms (p95 56 ms).

Cosas a tener en cuenta: la notebook tiene que estar enchufada, sin suspenderse y con buena conexión durante toda la clase (si se corta, se corta el juego). `cloudflared` sale por el puerto 7844: si la red de la facultad lo bloquea, el script lo avisa y se puede conectar la notebook a los datos de un celular. El túnel rápido no tiene garantía de servicio; para el día de la clase conviene probarlo antes en el aula (ver [Ensayo en el aula](#ensayo-en-el-aula), prueba 5, con `--url` apuntando al túnel). En Windows, **no hacer clic adentro de la ventana de la terminal** mientras corre: con la *edición rápida* activada, seleccionar texto pausa la terminal y el proceso se traba apenas escribe algo (y con él pueden trabarse el servidor y el túnel) hasta apretar Esc o Enter.

### Otros hostings

**Fly.io** (región São Paulo, no se duerme; ya no tiene plan gratis para cuentas nuevas). Desde la raíz del repositorio:

```bash
fly launch --no-deploy --copy-config   # la primera vez (usa fly.toml; cambiar "app" si el nombre está tomado)
fly deploy
fly scale count 1                      # una sola máquina
```

**Render**: crear un *Blueprint* con el repositorio (usa [`render.yaml`](../render.yaml)). El plan gratuito se duerme: abrir la URL unos minutos antes de la clase.

**Cualquier otro hosting con Docker** (Railway, un VPS): la imagen se construye desde la raíz porque el juego usa `../design-system`:

```bash
docker build -f juego/Dockerfile -t drop-rush .
docker run -p 3000:3000 drop-rush
```

Sin Docker: `npm ci && npm run build && npm start` dentro de `juego/` (respeta la variable `PORT`). Todo tiene que ir por **HTTPS en el puerto 443** (lo dan Caddy en el VPS, Fly y Render), que es lo que menos bloquean las redes institucionales.

## Qué hay en la Fase 4

Sobre la Fase 3:

**Controles del presentador.** Pausar, saltar y terminar desde la barra del proyector o con `P`, `S` y `F` (ver [cómo se juega](#cómo-se-juega-una-partida)). Por dentro, el servidor corre las horas del guion y manda el **mismo guion de nuevo** (mismo `id`, `revision` nueva) con `pausedAt` mientras está en pausa y la lista de corrimientos en `shifts`. Cada celular, el proyector y los bots lo siguen solos: en pausa la hora del guion queda congelada (`Guion.tiempo()`), y al seguir corren sus propias horas (ventaja, Cambio de algoritmo) igual que el servidor. Un celular que no recibió a tiempo el guion de una pregunta saltada responde con la hora original y se le acepta igual. En pausa no se pueden usar poderes y el mapa no predice avance.

**Efectos** ([`render/effects.js`](public/play/render/effects.js)): partículas al juntar un like (rosa), al despegar y aterrizar (polvo), al chocar (polvo y ladrillo) y con el escudo (mostaza), en una sola malla instanciada que se recicla; **líneas de velocidad** con el turbo; el corredor se **estira al despegar y se aplasta al aterrizar** y la cámara tiembla al chocar. Van con la calidad: todo en *alta*, la mitad de las partículas en *media* y nada en *baja* (que además dibuja a 30 FPS como máximo).

**Modelos.** La calle suma árboles con alcorque, toldos verdes en los locales, carteles del drop y balcones con baranda; el corredor, cordones en la capucha, puño y zapatillas con suela; el fan, zapatillas y el celular filmando; el camión, puertas traseras, paragolpes y luces. Todos los colores nuevos (piel, árboles, toldos, partículas, líneas de velocidad) salen del design system (`color.juego` en [`tokens.json`](../design-system/tokens.json)). **Visor** en `/dev/models/`: cada modelo girando (el corredor, corriendo y con botones para saltar y tropezar), sus triángulos contra el presupuesto de la sección 5.3.1, alambre, mundo curvado y exportación a `.glb` para retocarlo en Blender.

| Modelo | Triángulos | Presupuesto |
|---|---|---|
| Corredor | 340 | 1.500 |
| Fan · valla · caja · bache | 156 · 144 · 60 · 92 | 600 · 150 · 150 · ~100 |
| Bot revendedor · camión | 192 · 272 | 500 · 600 |
| Like · arco de respuesta | 84 · 122 | 100 · 200 |
| Tienda Nude Project (con la cola) | 1.216 | 2.000 |
| Bloque de calle completo (alta · media · baja) | ~2.500 · ~1.700 · ~600 | 300 + 400 por edificio |

**Descarga y caché.** Service Worker ([`estaticos/sw.js`](estaticos/sw.js)): los archivos con *hash* se guardan la primera vez y la página se pide a la red (para tomar un deploy nuevo) con la guardada como respaldo sin conexión. El build genera las versiones `.br` y `.gz` y el servidor las manda según el navegador.

**Balanceo y deploy.** [`tools/balanceo.js`](tools/balanceo.js) (ver [prueba 4](#4-balanceo)); [`Dockerfile`](Dockerfile), [`fly.toml`](../fly.toml) y [`render.yaml`](../render.yaml) (ver [Deploy](#deploy)).

```
juego/
├── estaticos/sw.js        # Service Worker (se sirve en /sw.js)
├── public/
│   ├── play/render/effects.js   # Partículas y líneas de velocidad
│   └── dev/models/              # Visor de modelos
├── tools/balanceo.js      # Balanceo con la simulación real
├── Dockerfile
└── test/fase4.test.js
```

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

- **Obstáculos**: además de la valla, la caja de stock, el fan y el camión, están el **bache del algoritmo** (bajo, se salta: un pozo del que asoman las barras de un gráfico que baja, con una flecha roja que se hunde en el pozo) y el **bot revendedor** (alto), que cruza despacio al carril vecino cuando el corredor se acerca. Su posición depende solo de la distancia del corredor, así que todos los grupos lo ven igual y el choque coincide con el dibujo a cualquier FPS. Va siempre solo en su fila: siempre queda un carril libre.
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

