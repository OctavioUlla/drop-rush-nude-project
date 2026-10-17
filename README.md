# Nude Project · Presentación + Drop Rush

Trabajo práctico sobre el caso de estudio **Nude Project: comunidad, comunicación y autenticidad en la era digital** (materia Comercialización, Licenciatura en Administración).

El repositorio reúne las tres piezas del trabajo, que comparten una misma identidad visual:

| | Qué es | Dónde |
|---|---|---|
| 🎤 **Presentación** | Exposición interactiva en HTML de 15 minutos sobre la estrategia de comunicación y marketing de Nude Project, según la consigna de la cátedra. Una sudadera 3D estilo *clay* es la protagonista de cada bloque, y la exposición arranca con un *drop* falso en los celulares de la clase. | [`presentacion/`](presentacion/README.md) |
| 🏃 **Drop Rush** | Juego multijugador de 7 minutos para el cierre de la presentación (22 minutos en total): hasta 40 grupos (un celular por grupo) corren en un runner 3D hacia el último drop de Nude Project, esquivando obstáculos y atravesando el arco de la respuesta correcta. | [`juego/`](juego/PLANIFICACION.md) |
| 🎨 **Design System** | Colores, tipografía y componentes basados en la identidad real de la marca, para que la presentación y el juego se vean como una sola cosa. | [`design-system/`](design-system/README.md) |

> 🚧 **Estado:** design system listo; presentación y juego en planificación.

## Estructura

```
├── README.md
├── docs/
│   └── caso-nude-project.pdf   # Caso y consigna provistos por la cátedra
├── presentacion/
│   ├── README.md               # Estructura, tiempos y diapositivas tipo
│   └── PLANIFICACION.md        # Plan de la presentación interactiva en HTML
├── juego/
│   └── PLANIFICACION.md        # Plan completo de Drop Rush
└── design-system/
    ├── README.md               # Identidad, principios y uso
    ├── index.html              # Guía visual (abrir en el navegador)
    ├── tokens.json             # Fuente única de verdad
    ├── build.mjs               # Genera tokens.css y tokens.js
    ├── tokens.css · tokens.js  # (generados)
    ├── components.css          # Componentes np-*
    └── fonts/                  # Inter e Inter Tight (OFL)
```

## Identidad en una línea
Cacao `#482922` y crema `#fff8ee`, grotesca bold con interletra cerrada, mucho aire y un solo acento por pantalla. *By artists, for artists.*

## Créditos
Proyecto académico basado en el caso de estudio provisto por la cátedra. Nude Project y su logo son marcas de sus respectivos dueños; su uso aquí es solo con fines educativos.
