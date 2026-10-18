// Estadísticas por pregunta y selección del repaso de errores (sección 2, paso 8).

/** Cómo respondieron los grupos una pregunta (con el orden mezclado que vieron). */
export function estadisticaPregunta(pregunta, index, grupos) {
  const distribution = pregunta.options.map(() => 0);
  let correctCount = 0;
  let answered = 0;
  for (const g of grupos) {
    const r = g.respuestas.get(index);
    if (!r) continue;
    answered++;
    if (r.lane >= 0 && r.lane < distribution.length) distribution[r.lane]++;
    if (r.correct) correctCount++;
  }
  const total = grupos.length;
  return {
    index,
    correctIndex: pregunta.correctIndex,
    correctCount,
    answered,
    total,
    distribution,
    // Sin respuesta también cuenta como error: el grupo no supo qué carril elegir.
    correctRate: total ? correctCount / total : 0,
  };
}

export function estadisticasPartida(preguntas, grupos) {
  return preguntas.map((p, i) => estadisticaPregunta(p, i, grupos));
}

/**
 * Las `cantidad` preguntas con menor porcentaje de aciertos, de la más errada a la menos.
 * `jugadas`: índices de las preguntas que se revelaron (todas, salvo que se haya terminado antes).
 * A igual porcentaje va primero la que más grupos respondieron mal (hubo más confusión).
 */
export function elegirRepaso(preguntas, grupos, cantidad, jugadas = null) {
  return estadisticasPartida(preguntas, grupos)
    // Si la partida se terminó antes, las preguntas que no llegaron a jugarse no entran.
    .filter((e) => !jugadas || jugadas.has(e.index))
    .sort((a, b) => a.correctRate - b.correctRate || b.answered - b.correctCount - (a.answered - a.correctCount) || a.index - b.index)
    .slice(0, Math.max(0, cantidad))
    .map((e) => {
      const p = preguntas[e.index];
      return { ...e, text: p.text, options: p.options, topic: p.topic, explanation: p.explanation };
    });
}

/** Orden de llegada: más distancia; si empatan, más aciertos y después quien respondió más rápido. */
export function ordenarLlegada(grupos) {
  return [...grupos].sort(
    (a, b) => b.distanciaTotal - a.distanciaTotal || b.aciertos - a.aciertos || a.demoraTotal - b.demoraTotal || a.numero - b.numero,
  );
}
