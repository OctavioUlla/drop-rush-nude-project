import { Group, Mesh, Box3, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { crearEscena } from '../../play/render/scene.js';
import { Personaje } from '../../play/render/character.js';
import { Efectos } from '../../play/render/effects.js';
import { materialMundo, curvatura, triangulos } from '../../play/render/models/kit.js';
import { valla, cajaStock, bache, fan, bot, camion, like } from '../../play/render/models/obstacles.js';
import { bloqueCalle } from '../../play/render/models/street.js';
import { crearArco } from '../../play/render/models/props.js';
import { crearTienda } from '../../play/render/models/store.js';
import { crearRng } from '../../shared/rng.js';
import { DURACION_SALTO, ALTURA_SALTO, CARRILES } from '../../shared/constantes.js';

// Visor de modelos (/dev/models/, sección 5.3.1): cada modelo generado por código girando, con su
// cantidad de triángulos contra el presupuesto del plan. Sirve para revisar colores y proporciones
// y para exportarlo a .glb si alguna vez se quiere retocar en Blender.

const $ = (id) => document.getElementById(id);
const CURVATURA = curvatura.value;
curvatura.value = 0; // los modelos se ven derechos salvo que se pida el mundo curvado

const malla = (geometria) => new Mesh(geometria, materialMundo);

/** Catálogo de la sección 5.3.1 con su presupuesto de triángulos. */
const MODELOS = [
  { id: 'corredor', nombre: 'Corredor', presupuesto: 1500, crear: () => crearCorredorAnimado() },
  { id: 'fan', nombre: 'Fan haciendo fila', presupuesto: 600, crear: () => malla(fan()) },
  { id: 'valla', nombre: 'Valla de la cola', presupuesto: 150, crear: () => malla(valla()) },
  { id: 'caja', nombre: 'Caja de stock', presupuesto: 150, crear: () => malla(cajaStock()) },
  { id: 'bache', nombre: 'Bache del algoritmo', presupuesto: 110, crear: () => malla(bache()) },
  { id: 'bot', nombre: 'Bot revendedor', presupuesto: 500, crear: () => malla(bot()) },
  { id: 'camion', nombre: 'Camión de reparto', presupuesto: 600, crear: () => malla(camion()) },
  { id: 'like', nombre: 'Like', presupuesto: 100, crear: () => malla(like()) },
  { id: 'arcos', nombre: 'Arcos de respuesta (×3)', presupuesto: 600, crear: () => crearArcos() },
  { id: 'tienda', nombre: 'Tienda Nude Project', presupuesto: 2000, crear: () => crearTienda() },
  // El bloque incluye asfalto, veredas, faroles, árboles y ~6 edificios (≤ 300 + 400 c/u en el plan).
  { id: 'bloque', nombre: 'Bloque de calle completo', presupuesto: 3000, crear: () => malla(bloqueCalle(crearRng(20240611), 24, Number($('nivel-detalle').value))) },
];

const { renderer, escena, camara, ajustarTamano, distanciaDibujo } = crearEscena($('lienzo'));
distanciaDibujo(400);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
const giro = new Group();
escena.add(giro);
const efectos = new Efectos(escena);

let actual = null; // { modelo, objeto, animar? }
let corredorFalso = null;

function contarTriangulos(objeto) {
  let n = 0;
  objeto.traverse((o) => {
    if (o.isMesh) n += triangulos(o.geometry);
  });
  return n;
}

/** Corredor con la animación del juego (correr, saltar, tropezar) en el lugar. */
function crearCorredorAnimado() {
  const raiz = new Group();
  const personaje = new Personaje(raiz, Number($('grupo').value) || 1);
  corredorFalso = { velocidad: 9.4, tSalto: -1, eventos: [], invulnerable: 0, pausado: false, corriendo: true };
  const estado = { distancia: 0, x: 0, y: 0 };
  raiz.userData.animar = (dt, tiempo) => {
    const c = corredorFalso;
    c.velocidad += ((c.corriendo ? 9.4 : 0) - c.velocidad) * Math.min(1, dt * 4);
    if (c.tSalto >= 0) {
      c.tSalto += dt;
      const t = c.tSalto / DURACION_SALTO;
      if (t >= 1) {
        c.tSalto = -1;
        c.eventos.push('aterrizaje');
      }
      estado.y = t >= 1 ? 0 : 4 * ALTURA_SALTO * t * (1 - t);
    }
    personaje.actualizar(estado, c, dt, tiempo);
    for (const e of c.eventos) efectos.rafaga(e, 0, estado.y, 0, 0, 1);
    efectos.actualizar(dt, 0, 0, 0);
    c.eventos.length = 0;
  };
  return raiz;
}

/** Los 3 arcos como se ven en una pregunta: uno elegido, uno normal y uno cerrado por el 50/50. */
function crearArcos() {
  const raiz = new Group();
  const ejemplos = [
    { letra: 'A', texto: 'EGC', activo: true, cerrado: false },
    { letra: 'B', texto: 'Contenido de los fans', activo: false, cerrado: false },
    { letra: 'C', texto: 'Influencers', activo: false, cerrado: true },
  ];
  CARRILES.forEach((x, i) => {
    const arco = crearArco();
    arco.raiz.position.x = x;
    arco.mostrar(ejemplos[i]);
    raiz.add(arco.raiz);
  });
  return raiz;
}

function mostrar(modelo) {
  if (actual) {
    giro.remove(actual.objeto);
    actual.objeto.traverse((o) => o.isMesh && o.geometry.dispose());
  }
  const objeto = modelo.crear();
  giro.add(objeto);
  actual = { modelo, objeto };
  if (modelo.id !== 'corredor') corredorFalso = null;

  // Centrar el modelo en el origen y alejar la cámara según su tamaño.
  giro.rotation.y = 0;
  const caja = new Box3().setFromObject(objeto);
  const centro = caja.getCenter(new Vector3());
  const tamano = caja.getSize(new Vector3());
  objeto.position.x -= centro.x;
  objeto.position.z -= centro.z;
  const radio = Math.max(tamano.x, tamano.y, tamano.z);
  controles.target.set(0, tamano.y / 2, 0);
  camara.position.set(radio * 0.9, tamano.y * 0.6 + radio * 0.45, radio * 1.4 + 1.5);
  controles.update();

  const tris = contarTriangulos(objeto);
  $('nombre').textContent = modelo.nombre;
  $('detalle').textContent = `${tris.toLocaleString('es')} triángulos · presupuesto ${modelo.presupuesto.toLocaleString('es')}${tris > modelo.presupuesto ? ' · se pasa' : ''}`;
  $('control-grupo').hidden = modelo.id !== 'corredor';
  $('control-corredor').hidden = modelo.id !== 'corredor';
  $('control-detalle').hidden = modelo.id !== 'bloque';
  aplicarAlambre();
  for (const b of $('modelos').querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.id === modelo.id));
  history.replaceState(null, '', `#${modelo.id}`);
}

function aplicarAlambre() {
  const alambre = $('alambre').checked;
  actual?.objeto.traverse((o) => {
    if (o.isMesh) o.material.wireframe = alambre;
  });
}

function dibujarLista() {
  $('modelos').replaceChildren(
    ...MODELOS.map((modelo) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.dataset.id = modelo.id;
      const objeto = modelo.crear();
      const tris = contarTriangulos(objeto);
      objeto.traverse((o) => o.isMesh && o.geometry.dispose());
      b.classList.toggle('excede', tris > modelo.presupuesto);
      const nombre = document.createElement('span');
      nombre.textContent = modelo.nombre;
      const cuenta = document.createElement('small');
      cuenta.textContent = `${tris} / ${modelo.presupuesto}`;
      b.append(nombre, cuenta);
      b.addEventListener('click', () => mostrar(modelo));
      li.append(b);
      return li;
    }),
  );
}

function exportar() {
  if (!actual) return;
  new GLTFExporter().parse(
    actual.objeto,
    (glb) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
      a.download = `drop-rush-${actual.modelo.id}.glb`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    (error) => alert(`No se pudo exportar: ${error.message}`),
    { binary: true },
  );
}

$('grupo').addEventListener('change', () => mostrar(actual.modelo));
$('nivel-detalle').addEventListener('change', () => mostrar(actual.modelo));
$('alambre').addEventListener('change', aplicarAlambre);
$('curvo').addEventListener('change', (e) => (curvatura.value = e.target.checked ? CURVATURA : 0));
$('btn-exportar').addEventListener('click', exportar);
$('btn-correr').addEventListener('click', () => {
  if (!corredorFalso) return;
  corredorFalso.corriendo = !corredorFalso.corriendo;
  $('btn-correr').setAttribute('aria-pressed', String(corredorFalso.corriendo));
});
$('btn-saltar').addEventListener('click', () => {
  if (corredorFalso && corredorFalso.tSalto < 0) {
    corredorFalso.tSalto = 0;
    corredorFalso.eventos.push('salto');
  }
});
$('btn-tropezar').addEventListener('click', () => corredorFalso?.eventos.push('choque'));

new ResizeObserver(ajustarTamano).observe($('lienzo'));
dibujarLista();
mostrar(MODELOS.find((m) => m.id === location.hash.slice(1)) ?? MODELOS[0]);

let tAnterior = performance.now();
let tiempo = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, (t - tAnterior) / 1000);
  tAnterior = t;
  tiempo += dt;
  if ($('girar').checked) giro.rotation.y += dt * 0.6;
  actual?.objeto.userData.animar?.(dt, tiempo);
  controles.update();
  renderer.render(escena, camara);
}
requestAnimationFrame(bucle);
