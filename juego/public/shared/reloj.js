// Sincronización del reloj con el servidor (estilo NTP), para que cada celular
// siga el guion de la partida en hora del servidor aunque se corte la red.
// Funciona igual en el navegador y en Node (lo usan los bots).

const ahoraLocal = () => performance.timeOrigin + performance.now();

export class Reloj {
  constructor(socket) {
    this.socket = socket;
    this.desfase = 0; // hora del servidor − hora local (ms)
    this.rtt = null;
    this.sincronizado = false;
    this.muestras = [];
  }

  ahora() {
    return ahoraLocal() + this.desfase;
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
  }
}
