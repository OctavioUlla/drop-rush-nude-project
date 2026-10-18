# 🎤 Presentación · Caso Nude Project

Exposición del caso de éxito de Nude Project para la materia **Comercialización** (Licenciatura en Administración).

- **Duración:** **23 minutos en total**: 15 de exposición + 8 del juego Drop Rush (la consigna pide entre 20 y 30).
- **Consigna completa:** [`docs/caso-nude-project.pdf`](../docs/caso-nude-project.pdf) (sección *Tarea*).
- **Estética:** [Design System](../design-system/README.md), el mismo que usa el juego.
- **Visual:** lanzamiento de producto en **un solo plano secuencia**: la cámara recorre una Nude House en miniatura estilo *clay* y la **sudadera 3D** viaja con ella por cada bloque (gira, cambia de color, se desarma en piezas con datos). Ver la [maqueta viva](../design-system/escena.html).
- **Formato:** HTML interactivo, con hype colectivo de apertura, cola de la tienda como barra de progreso, votación en vivo, feeds de EGC vs. UGC y la foto de cada grupo (selfie o *fit check*) como UGC en vivo. Ver la [planificación de la presentación](PLANIFICACION.md).
- **Guion:** [GUION.md](GUION.md), el texto hablado de cada bloque.
- **Cierre interactivo:** el juego [Drop Rush](../juego/PLANIFICACION.md).

---

## Cómo abrirla

```
cd juego
npm run dev
```

- **Proyector:** `http://localhost:3000/presentacion/` (pantalla completa con F11).
- **Modo presentador:** tecla `P` desde el proyector (abre otra ventana con las notas, la próxima diapositiva, el cronómetro, los grupos conectados y el estado del hype y de la votación).
- **Celulares:** el QR de la portada abre `/play/` con la sala ya elegida; cada grupo toca su número **una sola vez** y queda adentro hasta el final del juego. Mientras dura la presentación, el celular muestra una espera quieta (donde, antes del hype, el grupo se puede sacar la **foto del grupo**: selfie o *fit check*, solo con la cámara), el botón **HYPE** y la votación; al llegar al bloque de Drop Rush pasa solo al lobby del juego.

| Tecla | Acción |
|---|---|
| → / Espacio / ↓ / RePág | Siguiente |
| ← / ↑ / AvPág | Anterior |
| Inicio / Fin | Primera / última |
| `P` | Modo presentador |
| `B` (o `.` del control) | Pantalla en cacao (pausa) |
| `H` | En la portada: hype colectivo (cuenta regresiva, botón HYPE en los celulares, medidor y drop). Con el medidor corriendo, lo completa |
| `Q` | QR a pantalla completa (también tocando el QR chico de la portada), con el código de la sala para escribirlo a mano. Sirve en cualquier diapositiva para los que llegan tarde; se cierra con `Q`, `Esc` o al cambiar de diapositiva |
| `V` | Abrir o cerrar la votación en vivo (en la historia solo se ve cuántos grupos votaron; el resultado se revela en los desafíos, con la balanza) |
| `F` | Pausar o reanudar los feeds de EGC vs. UGC (para comentar una publicación) |
| `U` | En EGC vs. UGC, después de los clips reales: el celular de UGC muestra unos 15 s las fotos que se sacaron los grupos (*@grupo7*, *@grupo12*…) y vuelve solo a los clips; otra `U` lo corta antes. Sin servidor o sin fotos, fotos de ensayo |
| `J` | En el bloque de Drop Rush: abrir el proyector del juego (`/host/`) en la misma ventana, con la misma sala y los mismos celulares |
| `M` | Medidor de fps |

- `#3` en la URL abre directo en la diapositiva 3.
- `?medir` hace un recorrido de prueba por las 9 estaciones y muestra los fps; `?escala=1` baja la resolución interna si la notebook no llega a 60 fps.
- `?imprimir` muestra el PDF de respaldo en pantalla; imprimir desde el navegador (Ctrl+P) genera una diapositiva por página, sobre la imagen pre-renderizada de su escena.
- **PDFs para la cátedra:** `npm run pdf:presentacion` (en `juego/`, necesita Playwright) genera [`docs/presentacion-nude-project.pdf`](../docs/presentacion-nude-project.pdf) (las 13 diapositivas, una por página) y [`docs/guion-nude-project.pdf`](../docs/guion-nude-project.pdf) (el [guion](GUION.md) de los oradores, sin los pendientes). Volver a generarlos si cambian las diapositivas o el guion (por ejemplo, al anotar los nombres de los oradores).
- `renders/` guarda esas imágenes (una por encuadre): también se ven si la notebook no tiene WebGL y como miniaturas del modo presentador. Después de cambiar la escena, `npm run renders:presentacion` en `juego/` las vuelve a generar (necesita Playwright).
- Las publicaciones de los feeds de EGC vs. UGC están en [`datos/feeds.json`](datos/feeds.json); las fotos y los clips van en [`media/`](media/README.md). Si un archivo falta, se ve la ilustración de prueba.
- La **cola de la tienda** (abajo a la derecha) es la barra de progreso: *"N personas adelante"* = bloques que faltan. En cada bloque entra una persona; en el último nos toca y aparece *Queda 1*. La forman los grupos conectados: cada persona toma el color de su grupo.
- La pregunta de la **votación** y sus opciones están en [`datos/votacion.json`](datos/votacion.json) (cada opción dice hacia dónde inclina la balanza de los desafíos). El resultado queda guardado en el servidor: se ve en los desafíos, en el modo presentador y en el debate del juego.
- **Fotos de la clase:** cada grupo se saca, en la espera del celular y antes del hype, una selfie o un *fit check* (opcional; con el aviso de que se ve en el proyector). Es su foto de perfil en Drop Rush (lobby, ranking, ganador y la cola con *SOLD OUT*) y la que muestra `U` en el bloque 2. Ver la [planificación](PLANIFICACION.md#25-la-foto-del-grupo-ugc-en-vivo-).
- **Sin servidor o sin celulares conectados**, `H` y `V` hacen un ensayo con 40 grupos simulados (lo dice el medidor y la votación), así se puede ensayar en casa. Abriendo la presentación con un servidor cualquiera (sin el del juego), la portada avisa *"Sin servidor"* en lugar del QR.
- La presentación vuelve a la sala que tenía (la guarda el navegador, igual que `/host/`); `?nueva-sala` crea otra. Después de un ensayo, *Reiniciar hype y votación* en el modo presentador borra lo guardado.
- **Ensayo con bots:** con la presentación abierta, `npm run bots -- --sala ABCD --bots 39 --desde 2` (en `juego/`) suma 39 grupos que tocan HYPE, votan y después juegan; `npm run bots -- --presentacion` hace la prueba completa sola (40 bots, hype y votación) y verifica los resultados.
- Las diapositivas están en [`index.html`](index.html): cada `<section data-escena>` es una diapositiva, con sus notas en `<aside class="notas">`.

---

## Estructura propuesta

Cada punto de la consigna es un bloque; los separadores de bloque usan el tema **cacao** y el contenido el tema **crema**.

| # | Bloque | Consigna | Tiempo aprox. |
|---|---|---|---|
| 0 | **Portada** + QR + **hype colectivo** de apertura | — | 1 min |
| 1 | **La historia:** de 600 € en una habitación a +25 M€; *nude* = autenticidad; modelo D2C y drops + **votación en vivo** | Introducción | 2 min |
| 2 | **EGC vs. UGC:** diferencia y ejemplos reales de sus redes; impacto en identidad y autenticidad. **Feeds** EGC vs. UGC | Punto 1 | 3 min |
| 3 | **Marketing viral:** una campaña o publicación viral; qué la hizo funcionar (tono, mensaje, estética, contexto) | Punto 2 | 2 min |
| 4 | **Marketing experiencial:** tiendas (Nude House de Madrid), pop-ups, Nude Project Château; cómo alimentan la comunidad digital | Punto 3 | 2 min |
| 5 | **Métricas:** seguidores, engagement, alcance y visualizaciones de fuentes públicas, con interpretación | Punto 4 | 2 min |
| 6 | **Objetivo comunicacional:** cuál es y con qué ejemplos se fundamenta | Punto 5 | 1,5 min |
| 7 | **Desafíos:** autenticidad al crecer, sostenibilidad, dependencia de las redes, exclusividad vs. accesibilidad (se retoma la votación) | Cierre | 1,5 min |
| | **Subtotal exposición** | | **15 min** |
| 8 | **Drop Rush:** instrucciones (1 min), carrera con 8 preguntas (~4,5 min), repaso de errores y debate final (2,5 min) | Punto 6 (creatividad) | **8 min** |
| | **Total** | | **23 min** |

> El punto 6 de la consigna (*presentar de forma creativa, con coherencia estética*) se cubre con el design system en toda la presentación y con el juego como cierre.

## Diapositivas tipo

Todas están en la guía visual del [design system](../design-system/index.html) (sección *Presentación*). Detrás de ellas está siempre la escena 3D de la sudadera (ver el [guion visual por bloque](PLANIFICACION.md#33-guion-visual-por-bloque)), así que se arman con `np-diapo np-diapo--escena` (transparentes):

- **Portada / separador** (tema cacao, estudio cacao): etiqueta + título que sube línea por línea + pie con logo; en los separadores, la cinta *DROP 001 — QUEDA 1*.
- **Contenido editorial**: `np-diapo__editorial`, con etiqueta del bloque, título y texto en 5/12 y la sudadera en 7/12.
- **Comparación** (EGC vs. UGC): los dos **feeds 9:16** (`np-feeds`) con la sudadera en el centro.
- **Votación**: barras en vivo (`np-votacion`) con el contador de grupos que votaron.
- **Métricas**: vista desarmada de la sudadera con **etiquetas flotantes** (`np-etiqueta-3d`) o `np-diapo__datos` con hasta 3 cifras grandes.
- **Cita** (tema cacao): frase de Bruno con un subrayado mostaza, con la sudadera desenfocada al fondo.
- **Hype colectivo**: cuenta regresiva (`np-cuenta`) y medidor de hype (`np-hype`) con las fichas de los grupos que suman; en el celular, el botón `np-hype-boton`.
- **Juego** (tema cacao): cartel *QUEDA 1*, logo Drop Rush y QR.

En todas, la **cola de la tienda** (`np-cola`) corre al pie. Las plantillas planas (sin escena) quedan para el PDF de respaldo.

## Pendientes
- [x] Herramienta: **HTML** con el design system (ver [PLANIFICACION.md](PLANIFICACION.md))
- [x] Definir los contenidos de cada bloque (ver el [guion](GUION.md))
- [x] Juntar ejemplos reales de EGC y UGC: 4 y 4 clips de TikTok en los feeds (ver [`media/`](media/README.md)).
- [x] Elegir la campaña viral a analizar: *Out of Office* (agosto de 2025).
- [x] Relevar métricas públicas actualizadas y citar las fuentes (perfiles oficiales al 18/10/2026; ver las notas de respaldo de [`GUION.md`](GUION.md)). Falta verificar las cifras de Instagram de comienzos de 2024.
- [ ] Fotos de la Nude House y del Château para el bloque 4 (hoy se ve el cartel *Pendiente*).
- [x] Confirmar la pregunta de la votación ([`datos/votacion.json`](datos/votacion.json)): queda la de 90 €.
- [ ] Confirmar la fecha del episodio del podcast con la anécdota de Álex (bloque 7).
- [x] Revisar el banco de preguntas del juego ([`juego/data/preguntas.json`](../juego/data/preguntas.json)): todas salen del guion y las diapositivas. Si cambia el guion, revisar las que dependen de ese bloque.
- [x] Repartir los bloques entre los oradores: cinco oradores, A a E, por bloques enteros (ver el [reparto](GUION.md#reparto-de-oradores)). Falta anotar los nombres.
- [ ] Ensayar con cronómetro: 15 min de exposición + 8 min de juego. Son 13 diapositivas para 9 bloques; las notas del orador suman unas 1.660 palabras (≈ 13 min a 130 palabras por minuto), así que el hype y la votación tienen que entrar en el margen.
- [ ] Prueba en el aula: notebook (`?medir`), proyector, celulares reales en el Wi-Fi de la facultad y PDF de respaldo (ver [PLANIFICACION.md](PLANIFICACION.md#fase-5-contenido-y-ensayo)).
