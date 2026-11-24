export function serializeQuestions(questions) {
  const savedOrders = questions.map((question) => question.orden).filter(Number.isInteger);
  let nextOrder = Math.max(0, ...savedOrders) + 1;
  return questions.map((question, index) => {
    const savedOptions = question.opciones ?? [];
    const options = question.optionsText === savedOptions.join("\n")
      ? savedOptions
      : question.optionsText.split("\n").map((item) => item.trim()).filter(Boolean);
    const opciones = question.tipo === "opcion" ? options : [];
    if (!question.texto.trim()) throw new Error(`Escribe el enunciado de la pregunta ${index + 1}.`);
    if (question.tipo === "opcion" && !opciones.length) throw new Error(`Añade una opción a la pregunta ${index + 1}.`);
    return { texto: question.texto, tipo: question.tipo, obligatoria: question.obligatoria, opciones, orden: Number.isInteger(question.orden) ? question.orden : nextOrder++, activa: true };
  });
}

export function initialQuestions(questions = []) {
  return questions.filter((question) => question.activa !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((question, index) => ({ ...question, key: `saved-${index}`, optionsText: (question.opciones ?? []).join("\n") }));
}
