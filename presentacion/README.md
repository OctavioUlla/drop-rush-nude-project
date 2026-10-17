# 🎤 Presentación · Caso Nude Project

Exposición del caso de éxito de Nude Project para la materia **Comercialización** (Licenciatura en Administración).

- **Duración:** **22 minutos en total**: 15 de exposición + 7 del juego Drop Rush (la consigna pide entre 20 y 30).
- **Consigna completa:** [`docs/caso-nude-project.pdf`](../docs/caso-nude-project.pdf) (sección *Tarea*).
- **Estética:** [Design System](../design-system/README.md), el mismo que usa el juego.
- **Visual:** lanzamiento de producto con una **sudadera 3D estilo *clay*** que protagoniza cada bloque (gira, cambia de color, se desarma en piezas con datos).
- **Formato:** HTML interactivo, con drop falso de apertura, cola de la tienda como barra de progreso, votación en vivo y feeds de EGC vs. UGC. Ver la [planificación de la presentación](PLANIFICACION.md).
- **Cierre interactivo:** el juego [Drop Rush](../juego/PLANIFICACION.md).

---

## Estructura propuesta

Cada punto de la consigna es un bloque; los separadores de bloque usan el tema **cacao** y el contenido el tema **crema**.

| # | Bloque | Consigna | Tiempo aprox. |
|---|---|---|---|
| 0 | **Portada** + QR + **drop falso** de apertura | — | 1 min |
| 1 | **La historia:** de 600 € en una habitación a +25 M€; *nude* = autenticidad; modelo D2C y drops + **votación en vivo** | Introducción | 2 min |
| 2 | **EGC vs. UGC:** diferencia y ejemplos reales de sus redes; impacto en identidad y autenticidad. **Feeds** EGC vs. UGC | Punto 1 | 3 min |
| 3 | **Marketing viral:** una campaña o publicación viral; qué la hizo funcionar (tono, mensaje, estética, contexto) | Punto 2 | 2 min |
| 4 | **Marketing experiencial:** tiendas (Nude House de Madrid), pop-ups, Nude Project Château; cómo alimentan la comunidad digital | Punto 3 | 2 min |
| 5 | **Métricas:** seguidores, engagement, alcance y visualizaciones de fuentes públicas, con interpretación | Punto 4 | 2 min |
| 6 | **Objetivo comunicacional:** cuál es y con qué ejemplos se fundamenta | Punto 5 | 1,5 min |
| 7 | **Desafíos:** autenticidad al crecer, sostenibilidad, dependencia de las redes, exclusividad vs. accesibilidad (se retoma la votación) | Cierre | 1,5 min |
| | **Subtotal exposición** | | **15 min** |
| 8 | **Drop Rush:** instrucciones (1 min), carrera con 6 preguntas (~3,5 min), repaso de errores y debate final (2,5 min) | Punto 6 (creatividad) | **7 min** |
| | **Total** | | **22 min** |

> El punto 6 de la consigna (*presentar de forma creativa, con coherencia estética*) se cubre con el design system en toda la presentación y con el juego como cierre.

## Diapositivas tipo

Todas están en la guía visual del [design system](../design-system/index.html) (sección *Presentación*) y se arman con las clases `np-diapo`. Detrás de ellas está siempre la escena 3D de la sudadera (ver el [guion visual por bloque](PLANIFICACION.md#33-guion-visual-por-bloque)):

- **Portada / separador** (tema cacao): etiqueta + título display + pie con logo.
- **Contenido**: etiqueta con el número de bloque + título + 1 o 2 columnas.
- **Comparación** (EGC vs. UGC): `np-diapo__columnas`.
- **Cita** (tema cacao): frase de Bruno con un subrayado mostaza.
- **Datos** (métricas): `np-diapo__datos` con hasta 3 cifras grandes.
- **Juego** (tema cacao): cartel *QUEDA 1*, logo Drop Rush y QR.

## Pendientes
- [x] Herramienta: **HTML** con el design system (ver [PLANIFICACION.md](PLANIFICACION.md))
- [ ] Definir los contenidos de cada bloque (ver la sección 8 de [PLANIFICACION.md](PLANIFICACION.md#8-contenido-pendiente-a-cargo-del-equipo))
- [ ] Juntar ejemplos reales de EGC y UGC (Instagram, TikTok, YouTube, podcast).
- [ ] Elegir la campaña viral a analizar.
- [ ] Relevar métricas públicas actualizadas y citar las fuentes.
- [ ] Ensayar con cronómetro: 15 min de exposición + 7 min de juego. Una diapositiva por minuto como máximo (≈ 15 diapositivas).
