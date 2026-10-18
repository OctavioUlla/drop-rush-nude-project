# 🎤 Presentación · Caso Nude Project

Exposición del caso de éxito de Nude Project para la materia **Comercialización** (Licenciatura en Administración).

- **Duración:** **23 minutos en total**: 15 de exposición + 8 del juego Drop Rush (la consigna pide entre 20 y 30).
- **Consigna completa:** [`docs/caso-nude-project.pdf`](../docs/caso-nude-project.pdf) (sección *Tarea*).
- **Estética:** [Design System](../design-system/README.md), el mismo que usa el juego.
- **Visual:** lanzamiento de producto en **un solo plano secuencia**: la cámara recorre una Nude House en miniatura estilo *clay* y la **sudadera 3D** viaja con ella por cada bloque (gira, cambia de color, se desarma en piezas con datos). Ver la [maqueta viva](../design-system/escena.html).
- **Formato:** HTML interactivo, con hype colectivo de apertura, cola de la tienda como barra de progreso, votación en vivo y feeds de EGC vs. UGC. Ver la [planificación de la presentación](PLANIFICACION.md).
- **Cierre interactivo:** el juego [Drop Rush](../juego/PLANIFICACION.md).

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
- [ ] Definir los contenidos de cada bloque (ver la sección 8 de [PLANIFICACION.md](PLANIFICACION.md#8-contenido-pendiente-a-cargo-del-equipo))
- [ ] Juntar ejemplos reales de EGC y UGC (Instagram, TikTok, YouTube, podcast).
- [ ] Elegir la campaña viral a analizar.
- [ ] Relevar métricas públicas actualizadas y citar las fuentes.
- [ ] Ensayar con cronómetro: 15 min de exposición + 8 min de juego. Una diapositiva por minuto como máximo (≈ 15 diapositivas).
