// Sincronización del reloj con el servidor (estilo NTP), para que cada celular
// siga el guion de la partida en hora del servidor aunque se corte la red.
// Funciona igual en el navegador y en Node (lo usan los bots).

const ahoraLocal = () => performance.timeOrigin + performance.now();
// En Android y iOS performance.now() no avanza mientras el celular duerme (pantalla bloqueada): al despertar, la
// hora de pared (Date.now) le lleva lo que duró el sueño. Un salto mayor a esto es un sueño, no una deriva del reloj.
const deriva = () => Date.now() - ahoraLocal();
const SALTO_SUENO = 1000;

export class Reloj {
  constructor(socket) {
    this.socket = socket;
    this.desfase = 0; // hora del servidor − hora local (ms)
    this.rtt = null;
    this.sincronizado = false;
    this.muestras = [];
    this.deriva = null; // Date.now − hora local en la última sincronización
  }

  ahora() {
    return ahoraLocal() + this.desfase + this.dormido();
  }

  /** Lo que se atrasó la hora local desde la última sincronización porque el celular durmió (0 si no durmió). */
  dormido() {
    if (this.deriva == null) return 0;
    const salto = deriva() - this.deriva;
    return Math.abs(salto) > SALTO_SUENO ? salto : 0;
  }

  medirUna() {
    return new Promise((resolve) => {
      const t0 = ahoraLocal();
      this.socket.timeout(3000).emit('time:ping', t0, (error, horaServidor) => {
        if (error) return resolve(null);
        const t1 = ahoraLocal();
        resolve({ rtt: t1 - t0, desfase: horaServidor - (t0 + t1) / 2 });
      });
    });
  }

  /** Varias mediciones seguidas; se queda con las de menor ida y vuelta, que son las más precisas. */
  async sincronizar(cantidad = 6) {
    // Las muestras de antes de dormir tienen el desfase viejo: se descartan y el nuevo se toma entero, sin suavizar.
    if (this.dormido()) {
      this.muestras = [];
      this.sincronizado = false;
    }
    for (let i = 0; i < cantidad; i++) {
      if (!this.socket.connected) break;
      const m = await this.medirUna();
      if (m) this.muestras.push(m);
    }
    this.muestras = this.muestras.slice(-12);
    if (!this.muestras.length) return;
    const mejores = [...this.muestras].sort((a, b) => a.rtt - b.rtt).slice(0, 3);
    const desfase = mejores.reduce((s, m) => s + m.desfase, 0) / mejores.length;
    this.rtt = mejores[0].rtt;
    // Los ajustes posteriores son chicos y no hacen saltar el guion.
    this.desfase = this.sincronizado ? this.desfase + (desfase - this.desfase) * 0.5 : desfase;
    this.sincronizado = true;
    this.deriva = deriva();
  }
}
