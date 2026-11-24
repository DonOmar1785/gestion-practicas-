export function studentName(practice) {
  return practice?.estudiante?.usuario?.nombre_completo ??
    (practice?.id_estudiante ? `Estudiante ${practice.id_estudiante}` : "Estudiante");
}

export function practiceName(practice) {
  if (!practice) return "Práctica";
  const context = [practice.institucion?.nombre_institucion, practice.semestre && `Semestre ${practice.semestre}`].filter(Boolean);
  return context.join(" · ") || `Práctica ${practice.id_practica}`;
}

export function practiceFor(entry, practices) {
  return practices.find((practice) => String(practice.id_practica) === String(entry.id_practica)) ?? entry.practica;
}

export function evaluationFor(logbook, role) {
  const suffix = role === "asesor" ? "asesor" : "tutor";
  const value = logbook[`evaluacion_${suffix}`];
  const evaluation = Array.isArray(value) ? value[0] : value;
  if (evaluation) return evaluation;
  const grade = logbook[`calificacion_${suffix}`];
  if (grade === null || grade === undefined) return null;
  return { calificacion_cuant: logbook[`calificacion_${suffix}`], observacion_cual: logbook[`observacion_${suffix}`] };
}
