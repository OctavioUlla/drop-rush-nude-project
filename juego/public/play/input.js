// Controles: deslizar a izquierda/derecha (carril), hacia arriba (salto) o tocar
// un lado de la pantalla. En la compu también andan las flechas, A/D/W y espacio.

const UMBRAL = 28; // px para considerar que hubo deslizamiento
const TOQUE_MAX = 260; // ms

export function escucharControles(elemento, alGesto) {
  let inicio = null;

  const abajo = (e) => {
    if (!e.isPrimary) return;
    inicio = { x: e.clientX, y: e.clientY, t: performance.now(), usado: false };
  };

  const mover = (e) => {
    if (!inicio || inicio.usado || !e.isPrimary) return;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL) return;
    inicio.usado = true; // un gesto por deslizamiento: se dispara apenas se reconoce
    if (Math.abs(dx) > Math.abs(dy)) alGesto(dx < 0 ? 'izq' : 'der');
    else if (dy < 0) alGesto('saltar');
  };

  const arriba = (e) => {
    if (!inicio || !e.isPrimary) return;
    if (!inicio.usado && performance.now() - inicio.t < TOQUE_MAX) {
      const { left, width } = elemento.getBoundingClientRect();
      alGesto(e.clientX - left < width / 2 ? 'izq' : 'der');
    }
    inicio = null;
  };

  const teclas = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowUp: 'saltar', KeyW: 'saltar', Space: 'saltar' };
  const tecla = (e) => {
    const accion = teclas[e.code];
    if (!accion || e.repeat) return;
    e.preventDefault();
    alGesto(accion);
  };

  elemento.addEventListener('pointerdown', abajo);
  elemento.addEventListener('pointermove', mover);
  elemento.addEventListener('pointerup', arriba);
  elemento.addEventListener('pointercancel', () => (inicio = null));
  window.addEventListener('keydown', tecla);

  return () => {
    elemento.removeEventListener('pointerdown', abajo);
    elemento.removeEventListener('pointermove', mover);
    elemento.removeEventListener('pointerup', arriba);
    window.removeEventListener('keydown', tecla);
  };
}
