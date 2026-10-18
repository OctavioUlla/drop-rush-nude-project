// Música y efectos del proyector (sección 7, `sonido`), sintetizados con Web Audio:
// no hay archivos que descargar y el volumen se maneja desde la compu del aula.
// Los celulares no suenan (40 a la vez serían un caos): solo vibran.
// El navegador no deja sonar nada hasta que alguien toca la página: se habilita con el primer clic.

const TEMPO_TRAMO = 118;
const TEMPO_SPRINT = 140;
const VOLUMEN_MUSICA = 0.32;
const VOLUMEN_PREGUNTA = 0.12; // la música baja mientras se lee la pregunta
const ANTICIPO = 0.12; // segundos de música que se programan por adelantado

// Línea de bajo en La menor (corcheas) y acordes de acompañamiento (frecuencias en Hz).
const nota = (semitonosDesdeLa) => 110 * 2 ** (semitonosDesdeLa / 12);
const BAJO = [0, 0, 12, 0, 3, 3, 15, 3, -2, -2, 10, -2, -5, -5, 7, -2].map(nota);
const ACORDES = [
  [0, 3, 7],
  [3, 7, 10],
  [-2, 2, 5],
  [-5, -1, 2],
].map((a) => a.map((s) => nota(s + 24)));

export class Sonido {
  constructor(activo = true) {
    this.activo = activo;
    this.ctx = null;
    this.musica = { sonando: false, tempo: TEMPO_TRAMO, paso: 0, proximo: 0, temporizador: null };
  }

  /** Crea el contexto de audio en el primer gesto del presentador (exigencia de los navegadores). */
  desbloquear() {
    if (!this.ctx) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      this.ctx = new Contexto();
      this.general = this.ctx.createGain();
      this.general.gain.value = this.activo ? 1 : 0;
      this.general.connect(this.ctx.destination);
      this.musicaGain = this.ctx.createGain();
      this.musicaGain.gain.value = VOLUMEN_MUSICA;
      this.musicaGain.connect(this.general);
      this.efectos = this.ctx.createGain();
      this.efectos.gain.value = 0.6;
      this.efectos.connect(this.general);
      this.ruido = this.crearRuido();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get listo() {
    return Boolean(this.ctx) && this.ctx.state === 'running';
  }

  activar(activo) {
    this.activo = activo;
    if (this.general) this.general.gain.setTargetAtTime(activo ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  crearRuido() {
    const largo = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, largo, this.ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ---------- Piezas ----------
  tono(frecuencia, { cuando = 0, duracion = 0.15, tipo = 'square', volumen = 0.2, hasta = null, destino = this.efectos } = {}) {
    if (!this.listo) return;
    const t = this.ctx.currentTime + cuando;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, t);
    if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    osc.connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + duracion + 0.05);
  }

  soplido({ cuando = 0, duracion = 0.1, filtro = 'highpass', frecuencia = 2000, hasta = null, volumen = 0.2, destino = this.efectos } = {}) {
    if (!this.listo) return;
    const t = this.ctx.currentTime + cuando;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.ruido;
    const f = this.ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.setValueAtTime(frecuencia, t);
    if (hasta) f.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volumen, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    fuente.connect(f).connect(g).connect(destino);
    fuente.start(t, Math.random() * 0.5);
    fuente.stop(t + duracion + 0.05);
  }

  // ---------- Efectos ----------
  /** 3, 2, 1… (y el "¡DROP!" más agudo). */
  cuenta(numero) {
    if (numero > 0) this.tono(523, { duracion: 0.18, volumen: 0.25 });
    else {
      this.tono(1046, { duracion: 0.5, volumen: 0.3 });
      this.tono(1568, { cuando: 0.06, duracion: 0.45, volumen: 0.15, tipo: 'triangle' });
    }
  }

  /** Empieza una pregunta: barrido de aire y la música baja. */
  pregunta() {
    this.soplido({ duracion: 0.6, filtro: 'bandpass', frecuencia: 400, hasta: 4000, volumen: 0.35 });
    this.tono(660, { cuando: 0.45, duracion: 0.2, tipo: 'triangle', volumen: 0.2 });
    this.volumenMusica(VOLUMEN_PREGUNTA);
  }

  /** Últimos segundos de la pregunta. */
  tic(urgente) {
    this.tono(urgente ? 1320 : 990, { duracion: 0.05, tipo: 'square', volumen: 0.12 });
  }

  /** Revelado de la respuesta correcta: acorde mayor ascendente. */
  revelado() {
    [523, 659, 784, 1046].forEach((f, i) => this.tono(f, { cuando: i * 0.07, duracion: 0.35, tipo: 'triangle', volumen: 0.22 }));
    this.volumenMusica(VOLUMEN_MUSICA);
  }

  /** Un grupo usó un poder. */
  poder(id) {
    if (id === 'algoritmo') {
      this.tono(880, { duracion: 0.45, tipo: 'sawtooth', hasta: 110, volumen: 0.18 });
      this.soplido({ cuando: 0.05, duracion: 0.35, filtro: 'lowpass', frecuencia: 3000, hasta: 200, volumen: 0.2 });
    } else if (id === 'hype') {
      [440, 554, 659, 880].forEach((f, i) => this.tono(f, { cuando: i * 0.05, duracion: 0.18, tipo: 'sawtooth', volumen: 0.12 }));
    } else {
      this.tono(1200, { duracion: 0.12, tipo: 'square', volumen: 0.15 });
      this.tono(1600, { cuando: 0.1, duracion: 0.2, tipo: 'square', volumen: 0.15 });
    }
  }

  /** Llegada: fanfarria para el único ganador. */
  ganador() {
    this.pararMusica();
    const melodia = [
      [523, 0, 0.18], [523, 0.2, 0.18], [523, 0.4, 0.18], [659, 0.6, 0.5],
      [587, 1.15, 0.18], [659, 1.35, 0.18], [784, 1.55, 0.9],
    ];
    for (const [f, cuando, duracion] of melodia) {
      this.tono(f, { cuando, duracion, tipo: 'square', volumen: 0.2 });
      this.tono(f / 2, { cuando, duracion, tipo: 'triangle', volumen: 0.2 });
    }
    this.soplido({ cuando: 1.55, duracion: 1.2, filtro: 'highpass', frecuencia: 6000, volumen: 0.12 });
  }

  // ---------- Música ----------
  /** Loop de la carrera (bombo, caja, hi-hat, bajo y acordes). Más rápido en el sprint final. */
  tocarMusica(tempo = TEMPO_TRAMO) {
    if (!this.listo) return;
    const m = this.musica;
    m.tempo = tempo;
    this.volumenMusica(VOLUMEN_MUSICA);
    if (m.sonando) return;
    m.sonando = true;
    m.paso = 0;
    m.proximo = this.ctx.currentTime + 0.05;
    m.temporizador = setInterval(() => this.programar(), 25);
  }

  pararMusica() {
    clearInterval(this.musica.temporizador);
    this.musica.sonando = false;
  }

  volumenMusica(v) {
    if (this.musicaGain) this.musicaGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
  }

  get tempoSprint() {
    return TEMPO_SPRINT;
  }

  /** Programa las semicorcheas que caen en los próximos ANTICIPO segundos. */
  programar() {
    const m = this.musica;
    const destino = this.musicaGain;
    while (m.proximo < this.ctx.currentTime + ANTICIPO) {
      const cuando = m.proximo - this.ctx.currentTime;
      const p = m.paso % 16; // semicorchea dentro del compás
      const compas = Math.floor(m.paso / 16) % 4;
      if (p % 4 === 0) this.tono(150, { cuando, duracion: 0.25, tipo: 'sine', hasta: 40, volumen: 0.9, destino });
      if (p === 4 || p === 12) this.soplido({ cuando, duracion: 0.14, frecuencia: 1200, volumen: 0.35, destino });
      if (p % 2 === 0) this.soplido({ cuando, duracion: 0.035, frecuencia: 8000, volumen: p % 4 === 2 ? 0.16 : 0.08, destino });
      if (p % 2 === 0) this.tono(BAJO[compas * 4 + ((p / 2) % 4)], { cuando, duracion: 0.16, tipo: 'triangle', volumen: 0.5, destino });
      if (p === 2 || p === 10) for (const f of ACORDES[compas]) this.tono(f, { cuando, duracion: 0.12, tipo: 'square', volumen: 0.035, destino });
      m.proximo += 60 / m.tempo / 4;
      m.paso++;
    }
  }
}
