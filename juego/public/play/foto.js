import { LADO_FOTO, urlFoto } from '../shared/fotos.js';

// Foto del grupo en la espera de la presentación (issue #42): una selfie del grupo (cámara frontal) o un fit check
// (la ropa o las zapatillas, cámara trasera). Aparece en el feed de UGC de la presentación y como foto de perfil del
// grupo en Drop Rush. Es opcional y se saca solo con la cámara (getUserMedia, sin galería): solo se puede subir lo que
// hay en el aula. Se recorta a un cuadrado de 256 px y viaja como JPEG de ~20 KB.
// Vale hasta que arranca la presentación (el hype de apertura), igual que el cambio de grupo: se hace mientras la
// clase se acomoda, sin quitarle minutos a la exposición.

const MAX_BYTES = 48 * 1024; // el mismo tope que el servidor (FOTO_MAX_BYTES en rooms.js)
const CALIDADES = [0.82, 0.7, 0.55]; // si el JPEG se pasa del tope, se baja la calidad
const AVISO = 'Su foto va a aparecer en la pantalla del aula, junto a las de los demás grupos.';
const TITULOS = { selfie: 'Selfie del grupo', fit: 'Fit check' };

export class FotoGrupo {
  /**
   * @param {object} p
   * @param {import('./net.js').Red} p.red
   * @param {HTMLElement} p.espera  la espera de la presentación: oferta, foto lista y botón para sacarla después
   * @param {HTMLElement} p.camara  la sección #camara: visor en vivo, disparo y "Otra vez / Usar esta"
   * @param {() => boolean} p.puede hasta el hype de apertura, con la espera en pantalla
   * @param {() => number|null} p.grupo
   */
  constructor({ red, espera, camara, puede, grupo }) {
    this.red = red;
    this.camara = camara;
    this.puede = puede;
    this.grupo = grupo;
    this.version = 0; // versión de la foto del grupo en el servidor (0: sin foto)
    this.local = null; // { version, url } de la foto que se sacó en este celular (se ve sin pedirla al servidor)
    this.salteada = false;
    this.nota = '';
    this.de = null; // grupo al que corresponde el estado de arriba (si cambia de grupo, se empieza de nuevo)
    this.modo = null; // 'selfie' | 'fit' con la cámara abierta
    this.flujo = null; // MediaStream de la cámara
    this.foto = null; // Blob de la foto sacada, esperando "Usar esta"
    this.enviando = false;
    this.pintado = null;

    const $ = (raiz, nombre) => raiz.querySelector(`[data-foto="${nombre}"]`);
    this.el = {
      oferta: $(espera, 'oferta'),
      lista: $(espera, 'lista'),
      mini: $(espera, 'mini'),
      abrir: $(espera, 'abrir'),
      nota: $(espera, 'nota'),
      titulo: $(camara, 'titulo'),
      video: $(camara, 'video'),
      lienzo: $(camara, 'lienzo'),
      aviso: $(camara, 'aviso'),
      error: $(camara, 'error'),
      usar: $(camara, 'usar'),
    };
    this.el.lienzo.width = this.el.lienzo.height = LADO_FOTO;

    const acciones = {
      selfie: () => this.abrir('selfie'),
      fit: () => this.abrir('fit'),
      saltear: () => ((this.salteada = true), this.pintar()),
      abrir: () => ((this.salteada = false), (this.nota = ''), this.pintar()),
      quitar: () => this.quitar(),
      cancelar: () => this.cerrar(),
      disparar: () => this.disparar(),
      girar: () => this.abrir(this.modo === 'selfie' ? 'fit' : 'selfie'),
      otra: () => this.otraVez(),
      usar: () => this.usar(),
    };
    for (const raiz of [espera, camara]) {
      raiz.addEventListener('click', (ev) => {
        const accion = ev.target.closest('button[data-foto]')?.dataset.foto;
        acciones[accion]?.();
      });
    }
    red.addEventListener('room:groups', (e) => this.recibirGrupos(e.detail));
  }

  /** room:groups dice qué versión de foto tiene cada grupo (la de este puede cambiar si se recargó o se borró). */
  recibirGrupos(lista) {
    this.grupos = lista;
    this.version = lista.find((g) => g.number === this.grupo())?.photo ?? 0;
    this.pintar();
  }

  /** Se llama en cada cuadro: muestra la oferta, la foto lista o nada, y cierra la cámara si arrancó el hype. */
  actualizar() {
    if (this.de !== this.grupo()) {
      this.de = this.grupo();
      this.salteada = false;
      this.nota = '';
      this.version = this.grupos?.find((g) => g.number === this.de)?.photo ?? 0;
    }
    if (this.modo && !this.puede()) this.cerrar();
    this.pintar();
  }

  pintar() {
    const estado = !this.puede() ? 'nada' : this.version ? 'lista' : this.salteada ? 'abrir' : 'oferta';
    const url = this.local?.version === this.version ? this.local.url : urlFoto(this.red.sala, this.grupo(), this.version, this.red.token);
    const clave = `${estado}:${url}:${this.nota}`;
    if (clave === this.pintado) return;
    this.pintado = clave;
    this.el.oferta.hidden = estado !== 'oferta';
    this.el.lista.hidden = estado !== 'lista';
    this.el.abrir.hidden = estado !== 'abrir';
    this.el.nota.hidden = estado !== 'abrir' || !this.nota;
    this.el.nota.textContent = this.nota;
    if (estado === 'lista' && url && this.el.mini.getAttribute('src') !== url) this.el.mini.src = url;
  }

  // ---------- Cámara ----------

  async abrir(modo) {
    if (!this.puede()) return;
    this.detenerFlujo();
    this.modo = modo;
    this.foto = null;
    this.camara.hidden = false;
    this.camara.dataset.paso = 'visor';
    this.camara.dataset.modo = modo;
    this.el.titulo.textContent = TITULOS[modo];
    this.el.aviso.textContent = AVISO;
    this.el.error.hidden = true;
    // Sin HTTPS (o en un navegador viejo) no hay cámara: se sigue sin foto, sin trabar nada.
    if (!navigator.mediaDevices?.getUserMedia) return this.sinCamara('Este navegador no deja usar la cámara acá.');
    let flujo;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: modo === 'selfie' ? 'user' : 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
    } catch {
      return this.sinCamara('No se pudo abrir la cámara (sin permiso).');
    }
    // Mientras pedía permiso se cerró, se giró la cámara o arrancó el hype.
    if (this.modo !== modo || this.flujo || this.camara.hidden) return flujo.getTracks().forEach((t) => t.stop());
    this.flujo = flujo;
    this.el.video.srcObject = flujo;
    this.el.video.play().catch(() => {});
  }

  sinCamara(motivo) {
    this.cerrar();
    this.salteada = true;
    this.nota = `${motivo} Siguen sin foto: el grupo se ve con su número.`;
    this.pintar();
  }

  /** Recorta al centro un cuadrado de 256 px (sin espejar: los logos de la ropa se leen bien) y lo deja para revisar. */
  async disparar() {
    const v = this.el.video;
    if (!this.flujo || !v.videoWidth) return;
    const lado = Math.min(v.videoWidth, v.videoHeight);
    const ctx = this.el.lienzo.getContext('2d');
    ctx.drawImage(v, (v.videoWidth - lado) / 2, (v.videoHeight - lado) / 2, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO);
    v.pause();
    navigator.vibrate?.(20);
    this.foto = await comprimir(this.el.lienzo);
    this.camara.dataset.paso = 'revision';
    // El aviso se repite al confirmar: nadie la sube sin saber dónde se va a ver.
    this.el.aviso.textContent = `¿Usamos esta? ${AVISO}`;
    this.el.error.hidden = Boolean(this.foto);
    this.el.error.textContent = this.foto ? '' : 'No se pudo preparar la foto. Prueben otra vez.';
    this.el.usar.disabled = !this.foto;
  }

  otraVez() {
    this.foto = null;
    this.camara.dataset.paso = 'visor';
    this.el.aviso.textContent = AVISO;
    this.el.error.hidden = true;
    this.el.video.play().catch(() => {});
  }

  async usar() {
    if (!this.foto || this.enviando) return;
    this.enviando = true;
    this.el.usar.disabled = true;
    this.el.usar.textContent = 'Subiendo…';
    const foto = this.foto;
    const r = await this.red.socket
      .timeout(8000)
      .emitWithAck('player:photo', { image: await foto.arrayBuffer() })
      .catch(() => ({ ok: false, reason: 'timeout' }));
    this.enviando = false;
    this.el.usar.disabled = false;
    this.el.usar.textContent = 'Usar esta';
    if (!r.ok) {
      this.el.error.hidden = false;
      this.el.error.textContent = r.reason === 'started' ? 'Ya arrancó la presentación: la foto ya no se puede cambiar.' : 'No se pudo subir. Prueben de nuevo.';
      if (r.reason === 'started') setTimeout(() => this.cerrar(), 2500);
      return;
    }
    if (this.local) URL.revokeObjectURL(this.local.url);
    this.local = { version: r.photo, url: URL.createObjectURL(foto) };
    this.version = r.photo;
    this.cerrar();
    this.pintar();
  }

  async quitar() {
    const r = await this.red.socket
      .timeout(5000)
      .emitWithAck('player:photo', { image: null })
      .catch(() => ({ ok: false }));
    if (!r.ok) return;
    this.version = 0;
    this.pintar();
  }

  detenerFlujo() {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    this.el.video.srcObject = null;
  }

  cerrar() {
    this.detenerFlujo();
    this.modo = null;
    this.foto = null;
    this.camara.hidden = true;
  }
}

/** JPEG de la foto: si se pasa del tope del servidor, con menos calidad. */
async function comprimir(lienzo) {
  for (const calidad of CALIDADES) {
    const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', calidad));
    if (blob && blob.type === 'image/jpeg' && blob.size <= MAX_BYTES) return blob;
  }
  return null;
}
