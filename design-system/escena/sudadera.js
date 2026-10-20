// Sudadera Nude Project estilo clay, hecha por código y por piezas (para poder desarmarla).
// crearSudadera(color) → { grupo, piezas, material, texturas, ponerColor(hex), desarmar(t) }
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tokens, colores, colores3d } from '../tokens.js';

const { material: m } = tokens.escena;

// Logo bordado: textura de canvas con el logotipo en grotesca bold.
function texturaLogo(color) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  const fuente = '700 150px "Inter Tight", "Inter", sans-serif';
  const t = new THREE.CanvasTexture(c);
  const dibujar = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = fuente;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '-8px';
    ctx.fillText('Nude® Project', 512, 132);
    t.needsUpdate = true;
  };
  dibujar();
  document.fonts?.load(fuente).then(dibujar, () => {}); // se dibuja de nuevo cuando carga la tipografía
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Tubo que se afina de un extremo al otro (mangas relajadas).
function tuboAfinado(curva, r0, r1, tramos = 48, lados = 24) {
  const geo = new THREE.TubeGeometry(curva, tramos, 1, lados, false);
  const pos = geo.attributes.position;
  const centro = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tramos; i++) {
    const t = i / tramos;
    curva.getPointAt(t, centro);
    const r = THREE.MathUtils.lerp(r0, r1, t) * (1 + 0.06 * Math.sin(t * Math.PI)); // leve pliegue en el codo
    for (let j = 0; j <= lados; j++) {
      const k = i * (lados + 1) + j;
      v.fromBufferAttribute(pos, k).sub(centro).multiplyScalar(r).add(centro);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Acanalado (rib): surcos verticales suaves sobre una geometría, según el ángulo alrededor del eje Y.
function acanalar(geo, surcos, profundidad) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const k = 1 - profundidad * (0.5 + 0.5 * Math.cos(a * surcos));
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

export function crearSudadera(colorInicial = colores3d.marca.cacao) {
  const tela = new THREE.MeshPhysicalMaterial({
    color: colorInicial,
    roughness: m.rugosidad,
    metalness: m.metalico,
    sheen: m['brillo-tela'],
    sheenRoughness: m['brillo-tela-rugosidad'],
    sheenColor: new THREE.Color(colores3d.marca.crema),
  });
  // Interior (cuello y capucha): la misma tela, más oscura.
  const interior = tela.clone();
  const logoMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const cordonMat = new THREE.MeshStandardMaterial({ color: colores3d.marca.crema, roughness: 0.85 });

  const malla = (geo, mat = tela) => {
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = true;
    me.receiveShadow = true;
    return me;
  };
  const grupo = new THREE.Group();
  const piezas = {};
  const pieza = (nombre) => { const g = new THREE.Group(); g.name = nombre; grupo.add(g); piezas[nombre] = g; return g; };

  // Cuerpo: caja muy redondeada, más ancha abajo y con los hombros caídos.
  const cuerpo = pieza('cuerpo');
  const geoCuerpo = new RoundedBoxGeometry(1.6, 1.85, 0.62, 8, 0.3);
  const p = geoCuerpo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const abajo = THREE.MathUtils.clamp((0.925 - y) / 1.85, 0, 1);
    p.setX(i, x * (0.94 + 0.1 * abajo));
    p.setZ(i, z * (0.92 + 0.12 * Math.sin(abajo * Math.PI))); // panza suave
    if (y > 0.6) p.setY(i, y - Math.abs(x) * 0.12); // hombros caídos
  }
  geoCuerpo.computeVertexNormals();
  cuerpo.add(malla(geoCuerpo));
  // Cintura acanalada.
  const cintura = malla(acanalar(new THREE.CylinderGeometry(0.84, 0.84, 0.2, 96, 1), 60, 0.012));
  cintura.scale.set(1, 1, 0.38);
  cintura.position.y = -0.97;
  cuerpo.add(cintura);
  // Logo bordado en el pecho.
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.23), logoMat);
  logo.position.set(0, 0.3, 0.335);
  cuerpo.add(logo);
  // Cordones con sus puntas.
  for (const lado of [-1, 1]) {
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(lado * 0.12, 0.84, 0.22), new THREE.Vector3(lado * 0.14, 0.62, 0.34), new THREE.Vector3(lado * 0.15, 0.42, 0.35),
    ]);
    const cordon = malla(new THREE.TubeGeometry(curva, 16, 0.022, 8, false), cordonMat);
    const punta = malla(new THREE.CapsuleGeometry(0.03, 0.09, 4, 8), cordonMat);
    punta.position.set(lado * 0.15, 0.37, 0.35);
    cuerpo.add(cordon, punta);
  }

  // Bolsillo canguro: pieza aparte (se separa en la vista desarmada).
  const bolsillo = pieza('bolsillo');
  const geoBolsillo = new RoundedBoxGeometry(0.98, 0.44, 0.07, 4, 0.03);
  const pb = geoBolsillo.attributes.position;
  for (let i = 0; i < pb.count; i++) if (pb.getY(i) > 0) pb.setX(i, pb.getX(i) * 0.8); // trapecio
  geoBolsillo.computeVertexNormals();
  const bolsilloMalla = malla(geoBolsillo);
  bolsilloMalla.position.set(0, -0.52, 0.33);
  bolsillo.add(bolsilloMalla);

  // Capucha: casquete aplanado apoyado sobre la espalda, con el borde engrosado al frente.
  const capucha = pieza('capucha');
  // El casco se apoya plano sobre la espalda: casi no asoma por encima de los hombros.
  const casco = malla(new THREE.SphereGeometry(0.46, 48, 32));
  casco.scale.set(1.0, 0.62, 0.62);
  casco.position.set(0, 0.8, -0.26);
  casco.rotation.x = 0.35;
  const borde = malla(new THREE.TorusGeometry(0.3, 0.075, 20, 64));
  borde.scale.set(1, 0.7, 1);
  borde.rotation.x = -Math.PI * 0.42;
  borde.position.set(0, 0.9, 0.04);
  const cuello = malla(new THREE.CircleGeometry(0.27, 48), interior);
  cuello.scale.set(1, 0.7, 1);
  cuello.rotation.x = -Math.PI * 0.42;
  cuello.position.set(0, 0.895, 0.03);
  capucha.add(casco, borde, cuello);

  // Mangas: tubos que bajan por una curva suave, con hombro redondo y puño acanalado.
  for (const lado of [-1, 1]) {
    const manga = pieza(lado < 0 ? 'mangaIzquierda' : 'mangaDerecha');
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(lado * 0.68, 0.62, 0),
      new THREE.Vector3(lado * 0.96, 0.25, 0.02),
      new THREE.Vector3(lado * 1.05, -0.3, 0.08),
      new THREE.Vector3(lado * 1.0, -0.82, 0.12),
    ]);
    manga.add(malla(tuboAfinado(curva, 0.28, 0.2)));
    const hombro = malla(new THREE.SphereGeometry(0.28, 32, 24));
    hombro.position.copy(curva.getPointAt(0));
    const puno = malla(acanalar(new THREE.CylinderGeometry(0.2, 0.19, 0.2, 48, 1), 24, 0.03));
    const fin = curva.getPointAt(1);
    const tangente = curva.getTangentAt(1);
    puno.position.copy(fin).addScaledVector(tangente, 0.05);
    puno.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangente);
    manga.add(hombro, puno);
  }

  // El origen queda al pie de la prenda, así se apoya sobre pedestales y perchas.
  for (const g of Object.values(piezas)) g.position.y += 1.08;

  const reposo = Object.fromEntries(Object.entries(piezas).map(([k, g]) => [k, g.position.clone()]));
  const despiece = {
    capucha: new THREE.Vector3(0, 0.6, -0.3),
    mangaIzquierda: new THREE.Vector3(-0.6, 0.05, 0),
    mangaDerecha: new THREE.Vector3(0.6, 0.05, 0),
    bolsillo: new THREE.Vector3(0, -0.1, 0.7),
    cuerpo: new THREE.Vector3(0, 0, 0),
  };

  const hsl = {};
  let bordadoClaro;
  // Las dos versiones del bordado se dibujan una sola vez: regenerarlas al cambiar de colorway trababa el viaje.
  const logos = { claro: texturaLogo(colores.marca.cacao), oscuro: texturaLogo(colores.marca.crema) };
  /** Acepta un hex o un THREE.Color; se puede llamar en cada cuadro durante un fundido. */
  function ponerColor(c) {
    tela.color.set(c);
    interior.color.copy(tela.color).multiplyScalar(0.55);
    // Bordado en crema sobre colores oscuros, en cacao sobre los claros (solo se regenera al cruzar el umbral).
    const claro = tela.color.getHSL(hsl).l > 0.55;
    if (claro === bordadoClaro) return;
    bordadoClaro = claro;
    logoMat.map = claro ? logos.claro : logos.oscuro;
  }
  ponerColor(colorInicial);

  /** t de 0 (armada) a 1 (desarmada). */
  function desarmar(t) {
    for (const [k, g] of Object.entries(piezas)) g.position.copy(reposo[k]).addScaledVector(despiece[k], t);
    piezas.capucha.rotation.x = -0.35 * t;
    piezas.mangaIzquierda.rotation.z = -0.25 * t;
    piezas.mangaDerecha.rotation.z = 0.25 * t;
  }

  return { grupo, piezas, material: tela, texturas: Object.values(logos), ponerColor, desarmar };
}
