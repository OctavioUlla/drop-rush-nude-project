// TEMA: lo único que cambia de una presentación a otra (junto con las diapositivas y la paleta de index.html).
// Ejemplo: «Del grano a la taza», con una taza de cerámica clay como héroe.
//
// export default {
//   alturaHeroe,          alto del héroe en unidades (con la base en y = 0); la cámara lo encuadra con esto.
//   ajustes,              opcional: pisa valores de AJUSTES de motor.js (luz, cámara, producto…).
//   crearHeroe(kit, color) → objeto de kit.heroe(color) con sus piezas (desarmables) y, si hace falta, actualizar(dt, t).
//   estaciones: [{ nombre, tema: 'claro'|'oscuro', encuadre: 'editorial'|'centro'|'macro', color, escala,
//                  construir(g, kit) → { ancla, anclas, poses, actualizar, apoyada, quieta, giroReposo, balanceo, desarmar } }]
// }
// Colores: '#rrggbb' o variables de la paleta ('--acento'). Ver references/modelado-clay.md.

const ALTO_PEDESTAL = 0.32;

export default {
  alturaHeroe: 1.5,

  crearHeroe(kit, color) {
    const { THREE } = kit;
    const h = kit.heroe(color);
    const esmalte = h.material; // toma el colorway de cada estación

    // Plato: fijo en un neutro claro, para que el colorway se lea en la taza.
    h.pieza('plato', [0, -0.3, 0]).add(kit.torno([[0, 0], [0.92, 0], [1.08, 0.06], [1.12, 0.11], [1.04, 0.12], [0.5, 0.075], [0, 0.075]], '--arena'));

    // Taza: pared gruesa (perfil exterior hacia arriba y el interior de vuelta hacia abajo).
    h.pieza('taza', [0, 0.12, 0]).add(kit.torno([
      [0, 0.1], [0.4, 0.1], [0.48, 0.15], [0.66, 0.45], [0.75, 0.95], [0.78, 1.1], [0.75, 1.14], [0.7, 1.1], [0.67, 0.96], [0.58, 0.5], [0.42, 0.3], [0, 0.28],
    ], esmalte));

    // Asa: un tubo por una curva suave, del lado derecho.
    h.pieza('asa', [0.4, 0.15, 0], [0, 0, -0.3]).add(kit.tubo([[0.7, 0.92, 0], [1.02, 0.9, 0], [1.1, 0.66, 0], [0.98, 0.46, 0], [0.64, 0.42, 0]], 0.075, esmalte));

    // Café: un disco apenas brillante.
    h.pieza('cafe', [0, 0.55, 0]).add(kit.cilindro(0.685, 0.03, kit.clay('#3b2016', { roughness: 0.35 }), 0, 0.96, 0));

    // Vapor: tres hilos translúcidos que suben y se mecen (nada queda quieto del todo).
    const vapor = h.pieza('vapor', [0, 0.75, 0]);
    const matVapor = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 1, depthWrite: false });
    const hilos = [-0.22, 0.05, 0.3].map((x, i) => {
      const hilo = kit.tubo([[x, 1.05, 0], [x + 0.08, 1.3, 0.05], [x - 0.06, 1.55, 0], [x + 0.05, 1.8, -0.04]], 0.035 - i * 0.004, matVapor);
      hilo.castShadow = false;
      vapor.add(hilo);
      return hilo;
    });
    h.actualizar = (dt, t) => {
      hilos.forEach((hilo, i) => {
        hilo.rotation.y = Math.sin(t * 0.6 + i * 2) * 0.35;
        hilo.scale.y = 1 + Math.sin(t * 0.9 + i) * 0.08;
      });
    };
    return h;
  },

  estaciones: [
    // 0. Portada: estudio oscuro, pedestal bajo un foco con haz y polvo, copias flotando y palabra gigante detrás.
    {
      nombre: 'portada', tema: 'oscuro', encuadre: 'centro', color: '--claro',
      construir(g, kit) {
        g.add(kit.pisoSombra());
        g.add(kit.pedestal('--piso-oscuro', 1.25, ALTO_PEDESTAL));
        kit.foco(g, 0, 6.2, 0);
        // Las copias flotan arriba y a los costados: abajo a la izquierda va el título (nada de texto sobre objetos).
        const lugares = [[-3.3, 2.9, -1.8, '--arena'], [3.2, 2.7, -1.8, '--piedra'], [-1.6, 3.1, -3.4, '--color-3'], [2.7, 0.8, -0.4, '--arena']];
        for (const [x, y, z, c] of lugares) {
          const copia = kit.copiaHeroe(c);
          copia.piezas.vapor.visible = false;
          copia.grupo.position.set(x, y, z);
          copia.grupo.scale.setScalar(0.42);
          copia.grupo.rotation.set(0.2, x, -0.15);
          g.add(kit.flotante(copia.grupo, { amplitud: 0.15, giro: 0.2 }));
        }
        const ancla = new kit.THREE.Object3D();
        ancla.position.set(0, ALTO_PEDESTAL + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla };
      },
    },
    // 1. Origen: colinas y plantas de café; la taza levita sobre una bolsa de granos.
    {
      nombre: 'origen', tema: 'claro', encuadre: 'editorial', color: '--color-1', escala: 0.85,
      construir(g, kit) {
        g.add(kit.pisoSombra());
        // Las colinas quedan detrás del héroe (a la derecha), nunca detrás del texto.
        for (const [x, z, r, c] of [[2.4, -5.5, 3, '#c3cfa6'], [5.2, -4.2, 2.6, '#aebf8d'], [0.6, -7.5, 3.2, '#dfe3cc']]) {
          const colina = kit.esfera(r, c, x, -r * 0.55, z);
          colina.scale.y = 0.6;
          g.add(kit.fondo(colina));
        }
        for (const [x, z, e] of [[2.1, -1.4, 1.1], [3.2, 0.1, 0.9], [1.1, -2.8, 0.8]]) {
          const p = kit.planta(x, z, e, { maceta: '--arena', hojas: '#5f7a4a' });
          for (let i = 0; i < 6; i++) p.add(kit.esfera(0.06, '#b8402e', Math.cos(i * 2.1) * 0.28, 0.8 + (i % 3) * 0.15, Math.sin(i * 2.1) * 0.28));
          g.add(p);
        }
        // Bolsa de granos: caja muy redondeada con el borde enrollado.
        g.add(kit.caja(1.3, 0.75, 0.95, '#c9a77c', 0, 0, 0, 0.3));
        g.add(kit.caja(1.36, 0.14, 1.0, '#b8956a', 0, 0.68, 0, 0.07));
        const ancla = new kit.THREE.Object3D();
        ancla.position.set(0, 0.82 + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla };
      },
    },
    // 2. Tueste: dos cuencos con granos (claro y oscuro) a los costados; la taza al centro.
    {
      nombre: 'tueste', tema: 'claro', encuadre: 'centro', color: '--color-2', subirMira: -0.35,
      construir(g, kit) {
        g.add(kit.pisoSombra());
        g.add(kit.pedestal('--arena', 1.05, ALTO_PEDESTAL));
        const anclas = {};
        for (const [x, c, nombre] of [[-2.6, '#c08a5e', 'claro'], [2.6, '#3b2016', 'oscuro']]) {
          const cuenco = new kit.THREE.Group();
          cuenco.add(kit.torno([[0, 0], [0.45, 0], [0.8, 0.35], [0.85, 0.5], [0.78, 0.5], [0.72, 0.38], [0.4, 0.08], [0, 0.08]], '--claro'));
          for (let i = 0; i < 40; i++) {
            const a = i * 2.4, r = 0.62 * Math.sqrt((i + 0.5) / 40);
            const grano = kit.esfera(0.1, c, Math.cos(a) * r, 0.36 + Math.sin(i) * 0.03 + (r < 0.3 ? 0.08 : 0), Math.sin(a) * r);
            grano.scale.set(0.75, 0.55, 1);
            grano.rotation.y = a;
            cuenco.add(grano);
          }
          cuenco.position.set(x, 0, -0.4);
          g.add(cuenco);
          const ancla = new kit.THREE.Object3D();
          ancla.position.set(x, 0, 0.45);
          g.add(ancla);
          anclas[nombre] = ancla;
        }
        const ancla = new kit.THREE.Object3D();
        ancla.position.set(0, ALTO_PEDESTAL + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla, anclas };
      },
    },
    // 3. Datos: la taza se desarma con etiquetas; en la pose «barras», gráfico de pilas de platos y la taza arriba.
    {
      nombre: 'datos', tema: 'claro', encuadre: 'editorial', color: '--color-3', desarmar: true, escala: 0.9,
      construir(g, kit) {
        g.add(kit.pisoSombra(30));
        g.add(kit.pedestal('--arena', 1.05, ALTO_PEDESTAL));
        const { grupo, topes } = kit.barras([3, 5, 8], { colores: ['--piedra', '--arena', '--color-3'], separacion: 1.3, ancho: 0.95, alto: 0.16 });
        grupo.position.x = 8.5;
        g.add(grupo);
        const anclas = {};
        topes.forEach((tope, i) => {
          const base = new kit.THREE.Object3D();
          base.position.set(8.5 + tope.position.x, 0, 0.5);
          g.add(base);
          anclas[`barra-${i}`] = base;
        });
        const ancla = new kit.THREE.Object3D();
        ancla.position.set(0, ALTO_PEDESTAL + kit.LEVITA, 0);
        g.add(ancla);
        const tope = topes.at(-1);
        return {
          ancla, anclas,
          poses: {
            barras: { camara: [8.5, -0.25, 0], mira: [8.5, -0.25, 0], heroe: [8.5 + tope.position.x, tope.position.y + 0.08 - ancla.position.y, 0], escala: 0.5, desarmar: false },
          },
        };
      },
    },
    // 4. Cita: plano medio de la taza, quieta, girada hacia la frase.
    {
      nombre: 'cita', tema: 'claro', encuadre: 'macro', color: '--oscuro', giroReposo: -0.4,
      construir(g, kit) {
        g.add(kit.pisoSombra());
        const ancla = new kit.THREE.Object3D();
        ancla.position.set(0, 0.2, 0);
        g.add(ancla);
        return { ancla };
      },
    },
    // 5. Cierre: estudio oscuro, estante con las tazas de cada colorway y la protagonista bajo el foco.
    {
      nombre: 'cierre', tema: 'oscuro', encuadre: 'editorial', color: '--acento',
      construir(g, kit) {
        g.add(kit.pisoSombra());
        g.add(kit.pedestal('--piso-oscuro', 1.05, ALTO_PEDESTAL));
        kit.foco(g, 0, 6, 0, { intensidad: 0.9 });
        const estante = new kit.THREE.Group();
        for (const y of [0.9, 2.1]) estante.add(kit.caja(4.4, 0.1, 0.7, '--piso-oscuro', 0, y, 0, 0.03));
        ['--color-1', '--color-2', '--color-3', '--claro', '--arena', '--color-1'].forEach((c, i) => {
          const copia = kit.copiaHeroe(c);
          copia.piezas.vapor.visible = false;
          copia.grupo.scale.setScalar(0.38);
          copia.grupo.position.set(-1.4 + (i % 3) * 1.4, i < 3 ? 1.0 : 2.2, 0);
          copia.grupo.rotation.y = 0.4;
          estante.add(copia.grupo);
        });
        estante.position.set(1.4, 0, -3.4);
        g.add(estante);
        const ancla = new kit.THREE.Object3D();
        ancla.position.set(0, ALTO_PEDESTAL + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla };
      },
    },
  ],
};
