# Modelado clay: el héroe y las estaciones

Todo se genera por código con piezas redondeadas, mate y sin texturas (salvo rótulos y fotos enmarcadas).
El motor (`motor.js`) ya resuelve cámara, luz, sombras, niebla, viajes, colorways, desarme, poses y precompilado;
`tema.js` solo describe **qué** hay.

## Contenido
1. Forma de `tema.js`
2. El kit (API)
3. Cómo modelar el héroe
4. Cómo armar una estación (con lo que entra en cuadro)
5. Poses, anclas y etiquetas
6. Recetas de objetos
7. Errores comunes

---

## 1. Forma de `tema.js`

```js
export default {
  alturaHeroe: 1.5,            // opcional: si no, se mide la caja del héroe armado
  ajustes: { luz: { colores: { principal: '#f2f6ff' } } }, // opcional: pisa AJUSTES de motor.js
  crearHeroe(kit, color) { const h = kit.heroe(color); /* piezas */ return h; },
  estaciones: [
    {
      nombre: 'portada',        // lo que pone data-escena en las diapositivas
      tema: 'oscuro',           // estudio: 'claro' | 'oscuro' (también el color del texto)
      encuadre: 'centro',       // 'editorial' | 'centro' | 'macro'
      color: '--claro',         // colorway del héroe en esta estación
      escala: 1,                // tamaño del héroe acá (0.6 a 1.2)
      // opcionales: desarmar, apoyada, quieta, giroReposo, balanceo, distancia, subirMira, mira, macro: { corrimiento, distancia }
      construir(g, kit) {       // g está en x = índice · 18; construí alrededor de x = 0 local
        // … objetos …
        return { ancla, anclas, poses, actualizar(dt, t, presencia) {} };
      },
    },
  ],
};
```

Lo que devuelve `construir` (todo opcional):
- `ancla`: `Object3D` donde va la **base** del héroe (si levita, poné el ancla a `altoDelApoyo + kit.LEVITA`). Sin ancla, el héroe flota a 1,2 m.
- `anclas`: `{ nombre: Object3D }` para las etiquetas HTML (`data-ancla="nombre"`).
- `poses`: `{ nombre: { camara: [x,y,z], mira: [x,y,z], heroe: [x,y,z], escala, desarmar } }` (desvíos en metros desde el encuadre base; `escala` absoluta).
- `actualizar(dt, t, presencia)`: animación propia de la estación; `presencia` va de 0 (lejos) a 1 (la cámara encima).
- Cualquier opción de la estación (`apoyada`, `quieta`, `giroReposo`…) también puede venir de acá.

Opciones de estación:
| Opción | Efecto |
|---|---|
| `desarmar: true` | el héroe se desarma al llegar (cada pieza se corre según su `desarme`) |
| `apoyada: true` | no flota (está apoyado en algo) |
| `quieta: true` | en vez de balancearse, queda girado `giroReposo` (por defecto 0.35 rad) |
| `giroReposo` | ángulo de reposo en radianes: negativo gira el frente hacia la izquierda de la pantalla (hacia el texto en editorial y macro), positivo hacia la derecha |
| `balanceo` | amplitud del balanceo (0.6 por defecto; 0.2 para objetos que no deben mostrar el costado) |
| `distancia` | distancia de cámara (8.5 por defecto). Más chica = más cerca |
| `subirMira` | solo `centro`: positivo baja el héroe en pantalla, negativo lo sube (deja lugar abajo para etiquetas) |
| `mira: [x,y,z]` | punto local que reemplaza al centro del héroe como centro del encuadre. En `editorial` se le sigue restando el corrimiento de 1,75 en x, así que `mira: [1, 1.2, 0]` corre todo el encuadre 1 m a la derecha: el héroe queda más a la izquierda y entra más decorado a su derecha (ver la sección 4) |
| `macro: { corrimiento, distancia }` | solo `macro`, en tamaños de héroe (−0.45 y 2.9 por defecto) |

## 2. El kit (API)

Colores: `'#rrggbb'`, `0xrrggbb` o una variable de la paleta (`'--acento'`). Medidas en metros de maqueta.

| Función | Devuelve |
|---|---|
| `kit.heroe(color)` | base del héroe: `{ grupo, material, piezas, pieza(nombre, desarme, giro), ponerColor, desarmar, alColor, actualizar, texturas }`. Si el héroe usa texturas propias (`kit.lienzo`, fotos), agregalas a `h.texturas` para que se suban a la placa durante el cargador |
| `kit.copiaHeroe(color)` | otra instancia del héroe (decorado: copias flotando, estantes, pilas) |
| `kit.clay(color, extra)` | material mate cacheado (`extra`: `{ roughness, emissive… }`) |
| `kit.malla(geo, mat, x, y, z)` | malla con sombras |
| `kit.caja(w, h, d, color, x, y, z, radio)` | caja redondeada **apoyada** en `y` |
| `kit.cilindro(r, h, color, x, y, z)` | cilindro apoyado en `y` |
| `kit.esfera(r, color, x, y, z)` | esfera centrada |
| `kit.varilla(a, b, r, color)` | tubo recto entre dos `Vector3` (patas, hilos, tallos) |
| `kit.torno(perfil, color)` | sólido de revolución desde `[[radio, altura], …]` de abajo hacia arriba (tazas, jarrones, botellas, torres, cohetes) |
| `kit.tubo(puntos, r, color)` | tubo por una curva `[[x,y,z], …]` (asas, cables, ramas, vapor) |
| `kit.pedestal(color, r, h)` | disco con canto redondeado (0.32 de alto por defecto) |
| `kit.pisoSombra(w, d)` | piso invisible que solo recibe la sombra (estaciones "en el vacío") |
| `kit.habitacion(g, { ancho, fondo, piso, pared, lateral })` | piso, pared del fondo con zócalo y, opcional, pared lateral |
| `kit.foco(g, x, y, z, { altoHaz, radio, intensidad })` | spot cenital + haz visible + polvo |
| `kit.polvo(cantidad, radio, alto)` | partículas que suben despacio |
| `kit.flotante(obj, { amplitud, periodo, giro })` | hace flotar y girar cualquier objeto |
| `kit.planta(x, z, escala, { maceta, hojas })` | planta en maceta |
| `kit.barras(valores, { colores, separacion, ancho, alto })` | gráfico de pilas: `{ grupo, topes }` (un `Object3D` arriba de cada barra) |
| `kit.lienzo(w, h, dibujar)` | `CanvasTexture`; `dibujar(ctx, w, h)` se repite al cargar las fuentes |
| `kit.rotulo(texto, { ancho, alto, color, fuente, peso })` | placa con texto (logos, carteles del decorado; el contenido va en HTML) |
| `kit.marco(ancho, alto, textura, { borde, colorMarco, brillo })` | marco con lámina luminosa (pantallas, cuadros, celulares, pizarras); para fotos: `new kit.THREE.TextureLoader().load('media/foto.webp')` |
| `kit.fondo(obj)` | marca algo como fondo |
| `kit.LEVITA` | hueco bajo el héroe cuando levita (~0.16) |
| `kit.THREE`, `kit.V(x,y,z)`, `kit.color(c)`, `kit.RoundedBoxGeometry` | utilidades |

## 3. Cómo modelar el héroe

Convenciones: **base en y = 0**, frente hacia **+z** (a cámara), ~**2 de alto** y ≤ 2,4 de ancho, centrado en x/z.

```js
crearHeroe(kit, color) {
  const h = kit.heroe(color);              // h.material = superficie principal: toma el colorway de cada estación
  // pieza(nombre, desarme [x,y,z], giro [rx,ry,rz]): las mallas se agregan EN SU POSICIÓN FINAL dentro de la pieza;
  // desarmar(t) corre la pieza desarme·t y la gira giro·t.
  h.pieza('cuerpo', [0, 0, 0]).add(kit.torno([[0, 0], [0.6, 0], [0.7, 1.4], [0.5, 1.8], [0, 1.85]], h.material));
  h.pieza('tapa', [0, 0.6, 0]).add(kit.cilindro(0.4, 0.2, '--oscuro', 0, 1.85, 0));
  h.pieza('etiqueta', [0, 0, 0.7]).add(/* rótulo, banda, logo */);
  h.alColor = (c) => { /* opcional: cambiar el logo a claro u oscuro según el colorway */ };
  h.actualizar = (dt, t) => { /* opcional: algo que se mueve siempre (hélice, luz, vapor) */ };
  return h;
}
```

Claves para que se vea clay y "de producto":
- **Siluetas simples y reconocibles** a 300 px. Exagerá las proporciones (más redondo, más grueso) en vez de agregar detalle.
- **Bordes redondeados en todo**: `RoundedBoxGeometry` con radio generoso, `torno` con perfiles suaves, tubos con extremos en cápsula.
- **Deformá la geometría** para que no parezca primitiva: recorré `geo.attributes.position` y ensanchá abajo, achicá arriba, agregá panza (`x *= 1 + 0.1 * abajo`), y `computeVertexNormals()` (ver la sudadera de `design-system/escena/sudadera.js` en el repo original).
- **Detalles que venden**: acanalados (puños, tapas), costuras, un logo/rótulo, un borde engrosado. Dos o tres, no más.
- **Un material principal** (`h.material`, MeshPhysical con un leve brillo de tela) para lo que cambia de color, y 1–2 materiales fijos (`kit.clay`) para lo que no (metal mate, papel, vidrio esmerilado = clay claro con `transparent`).
- **3 a 6 piezas desarmables**, con desarmes de 0.3 a 0.7 m, hacia arriba y hacia los costados (no hacia la cámara). Revisá en la captura que el héroe desarmado entre en cuadro.

## 4. Cómo armar una estación

### Qué entra en cuadro

Con la cámara por defecto (campo 30°, distancia 8,5, 16:9), lo visible depende de la profundidad. Medidas en metros
desde el centro del héroe (x = 0 local); el texto ocupa el 42 % izquierdo de la pantalla y la interfaz, ~8 % arriba y
~12 % abajo:

| Profundidad (z) | `editorial`: x visible | `editorial`: x libre a la derecha del texto | `centro`: x visible | alto visible |
|---|---|---|---|---|
| +2 (delante) | −4,8 a +1,3 | −2,2 a +1,3 | ±3,1 | ±1,7 |
| 0 (el héroe) | −5,8 a +2,3 | −2,4 a +2,3 | ±4,0 | ±2,3 |
| −3 | −7,2 a +3,7 | −2,6 a +3,7 | ±5,5 | ±3,1 |
| −6 | −8,7 a +5,2 | −2,9 a +5,2 | ±6,9 | ±3,9 |

(El alto se mide desde la mira, que está a la altura del centro del héroe.) Cuanto más lejos de la cámara, más ancho
entra pero más chico se ve. Lo que tenga que leerse al lado del héroe va en z = 0 a −2, entre x = +1,2 y +2,3; lo
grande (barrios, colinas, estantes) va al fondo. Si cambia `distancia`, los anchos escalan en proporción
(`distancia: 10` ≈ ×1,18); `escala` solo cambia el tamaño del héroe.

Para hacer lugar a la derecha del héroe, corré el encuadre con `mira` (o una pose con `camara` y `mira` iguales) en
vez de achicar todo.

### Pasos

1. **Piso**: `kit.pisoSombra()` para estaciones en el vacío (el fondo lo pinta el CSS, se ve como un ciclorama infinito) o `kit.habitacion()` para un interior.
2. **Apoyo del héroe**: pedestal, caja, mesa, roca, estante… y el `ancla` encima con `+ kit.LEVITA`.
3. **2 a 5 objetos que cuentan el bloque**, todos del lado del héroe:
   - en `editorial`, a la derecha del héroe y dentro de lo visible según la profundidad (tabla de arriba: en z = 0 solo hasta x = +2,3); lo que queda a la izquierda de la franja libre está detrás del texto: solo cosas claras y bajas;
   - en `centro`, a los costados (x = ±2.5) y un poco atrás (z ≈ −0.5), con el título arriba;
   - al fondo (z = −3 a −6) cosas grandes y de bajo contraste (colinas, edificios, estantes).
4. **Luz propia** si suma: `kit.foco()` en portada y cierre; lámparas con `PointLight` de alcance corto (< 8 m).
5. **Algo vivo**: `kit.flotante()` en copias o piezas sueltas, polvo, una animación en `actualizar`.
6. **Anclas** para las etiquetas de la diapositiva.

## 5. Poses, anclas y etiquetas

- **Medida de una etiqueta**: ~13 cqw de ancho (13 % de la pantalla) y ~5 cqw de alto, más 1,2 em de línea guía.
- **El héroe desarmado en `editorial`**: la franja libre entre el texto (termina en el 42 %) y el héroe (~70 %) mide
  ~18 % de la pantalla: entra una columna de etiquetas `--izquierda` si las piezas se separan **en vertical**
  (desarmes en y, poco en x). Si las piezas se abren a los costados, usá `encuadre: 'centro'` con etiquetas a ambos
  lados (`--izquierda` las de la izquierda, por defecto las de la derecha) y el título arriba.

- **Etiqueta sobre una pieza del héroe**: `<div class="etiqueta-3d etiqueta-3d--izquierda" data-pieza="tapa" data-punto="-1,0,0" style="--i: 0"><b>12 M</b><span>Ventas</span></div>`. `data-punto` es un punto dentro de la caja de la pieza, de −1 a 1 (`-1,0,0` = borde izquierdo, `0,1,0` = arriba).
- **Etiqueta sobre un objeto de la estación**: `data-ancla="nombre"` (un `Object3D` de `anclas`), con `data-punto` como desplazamiento en metros.
- Variantes: por defecto a la derecha del punto; `--izquierda` (cuando el punto está a la derecha de la pantalla); `--abajo` (bajo objetos apoyados en el piso). Las etiquetas aparecen cuando la cámara llega (`etiquetas--visibles`).
- **Poses**: definilas en `construir` (necesitan posiciones calculadas, como el tope de una barra). También sirven en una estación con **una sola diapositiva**: es la forma de cambiar la altura o el ángulo de la cámara para esa estación (por ejemplo, una vista alta de un barrio: `poses: { alta: { camara: [0, 3, -1], mira: [0, -0.5, 0] } }` y `data-pose="alta"`). `heroe` es el desvío desde el ancla: para coronar una barra, `tope.x + grupo.x − ancla.x, tope.y + 0.08 − ancla.y, 0`.

## 6. Recetas de objetos

| Objeto | Receta |
|---|---|
| Libro | `caja` para tapas (color) + `caja` un poco más chica para hojas (`--claro`), lomo con `cilindro` acostado |
| Celular / pantalla | `marco(0.9, 1.9, kit.lienzo(…))` con borde 0.06 y `colorMarco: '--oscuro'` |
| Edificio | `caja` alta + grilla de ventanas con `caja` finas en `--claro`, techo con `caja` más ancha |
| Árbol | `varilla` tronco + 3 `esfera` achatadas en verdes apagados |
| Montaña / colina | `esfera` enorme achatada (`scale.y = 0.6`) hundida en el piso, al fondo |
| Nube | 4–5 `esfera` blancas superpuestas + `flotante` |
| Moneda / ficha | `cilindro` bajo + `torno` para el canto |
| Engranaje | `cilindro` + dientes con `caja` en círculo, gira en `actualizar` |
| Cohete | `torno` (cuerpo y punta) + 3 aletas con `caja` finas giradas 120° |
| Gráfico de torta | `CylinderGeometry` con `thetaStart`/`thetaLength` por porción, separadas un poco |
| Caja de envío abierta | 5 `caja` (fondo y paredes) + 4 solapas rotadas + papel de seda en `--claro` |
| Corazón / like | dos `esfera` + un cono redondeado, `flotante` hacia arriba |
| Lámpara | `varilla` + `torno` pantalla + `PointLight` cálida de alcance 4 |
| Cartel de neón | `kit.rotulo()` con material `emissive` del acento |
| Balanza | barra + dos platos colgando de 3 `varilla` cada uno (hilos por fuera de lo que llevan); se inclina en `actualizar` |

## 7. Errores comunes

- **El héroe sale enorme o cortado**: bajá `escala` de la estación (0.75–0.9) o, en macro, subí `macro.distancia`.
- **Decorado cortado en el borde derecho**: mirá la tabla de la sección 4; mandalo más al fondo, acercalo al héroe o corré el encuadre con `mira`.
- **El héroe se ve lavado bajo el foco** (colores claros en portada y cierre): `kit.foco(g, x, y, z, { intensidad: 0.6 })`.
- **Algo tapa al héroe en el viaje**: lo que esté en x entre estaciones y alto (> 3 m) se cruza con el arco de la cámara; mantené el decorado alto al fondo (z < −3).
- **La cámara se traba la primera vez**: no agregues ni quites luces en caliente ni crees mallas en `actualizar`; todo se crea en `construir`.
- **Cambiar el color de algo que no es el héroe**: usá su propio material (`kit.clay` está cacheado y compartido: clonalo con `.clone()` antes de modificarlo).
- **Texto 3D para contenido**: no. El contenido va en HTML (se lee mejor, se anima y se traduce); `rotulo` es solo para lo que está impreso en los objetos.
- **Rutas relativas entre módulos**: los módulos se importan por nombre del importmap (`'motor'`, `'tema'`), nunca `./motor.js`, para que el empaquetado funcione.
