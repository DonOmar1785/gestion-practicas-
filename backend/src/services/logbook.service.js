import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

function hoursBetween(start, end) {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const startMatch = timePattern.exec(start ?? "");
  const endMatch = timePattern.exec(end ?? "");
  if (!startMatch || !endMatch) {
    throw new AppError(400, "Las horas de ingreso y salida deben estar en formato HH:MM.");
  }

  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  if (endMinutes <= startMinutes) {
    throw new AppError(400, "La hora de salida debe ser posterior a la de ingreso.");
  }
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function createLogbookService({ supabase, assignmentService }) {
  return {
    async list(actor) {
      let query = supabase
        .from("bitacora")
        .select("*, asignacion_estudiante!inner(*), respuesta_bitacora(*, pregunta_bitacora(id_pregunta, texto, tipo, orden)), evaluacion_asesor(*), evaluacion_tutor(*)")
        .order("fecha", { ascending: false });

      if (["estudiante", "tutor", "asesor"].includes(actor.role)) {
        const assignments = await assignmentService.listFor(actor);
        const ids = assignments.map((assignment) => assignment.id_asignacion);
        if (!ids.length) return [];
        query = query.in("id_asignacion", ids);
      }

      const { data, error } = await query;
      throwDatabaseError(error);
      return data;
    },

    async create(input, actor) {
      const {
        idAsignacion,
        idSesion,
        fecha,
        actividad,
        urlEvidencias,
        numeroVisita,
        horaIngreso,
        horaSalida,
        reflexionPedagogica,
        respuestas = [],
      } = input ?? {};

      if (
        idAsignacion === undefined ||
        idAsignacion === null ||
        idAsignacion === "" ||
        !Number.isInteger(Number(idAsignacion)) ||
        Number(idAsignacion) < 1 ||
        !isValidDate(fecha) ||
        !Array.isArray(respuestas)
      ) {
        throw new AppError(400, "La asignación, fecha y respuestas son obligatorias.");
      }
      const assignment = await assignmentService.getForActor(Number(idAsignacion), actor);

      let session;
      if (idSesion !== undefined && idSesion !== null) {
        const { data, error } = await supabase
          .from("sesion_bitacora")
          .select("id_sesion, id_practica, id_programa, estado, fecha_inicio, fecha_fin, visible")
          .eq("id_sesion", idSesion)
          .maybeSingle();
        throwDatabaseError(error);
        session = data;
        if (
          !session ||
          session.estado !== "Abierta" ||
          !session.visible ||
          (session.id_practica !== null &&
            session.id_practica !== assignment.id_practica) ||
          (session.id_programa !== null &&
            session.id_programa !== assignment.practica?.id_programa) ||
          fecha < session.fecha_inicio ||
          fecha > session.fecha_fin
        ) {
          throw new AppError(409, "La sesión no está disponible para esta fecha.");
        }
      }

      const hours = hoursBetween(horaIngreso, horaSalida);
      if (typeof actividad !== "string" || !actividad.trim()) {
        throw new AppError(400, "Describe la actividad realizada.");
      }
      if (
        urlEvidencias &&
        (typeof urlEvidencias !== "string" ||
          urlEvidencias.length > 255 ||
          !/^https?:\/\//i.test(urlEvidencias))
      ) {
        throw new AppError(400, "La evidencia debe ser un enlace http(s) de máximo 255 caracteres.");
      }
      if (
        reflexionPedagogica !== undefined &&
        reflexionPedagogica !== null &&
        typeof reflexionPedagogica !== "string"
      ) {
        throw new AppError(400, "La reflexión pedagógica debe ser texto.");
      }
      if (
        numeroVisita !== undefined &&
        numeroVisita !== null &&
        numeroVisita !== "" &&
        (!Number.isInteger(Number(numeroVisita)) || Number(numeroVisita) < 1)
      ) {
        throw new AppError(400, "El número de visita debe ser un entero positivo.");
      }
      if (!session && respuestas.length) {
        throw new AppError(400, "Las respuestas dinámicas requieren una sesión de bitácora.");
      }

      if (session) {
        const { data: questions, error } = await supabase
          .from("pregunta_bitacora")
          .select("id_pregunta, tipo, opciones, obligatoria, activa")
          .eq("id_sesion", session.id_sesion)
          .eq("activa", true);
        throwDatabaseError(error);

        const questionsById = new Map(
          questions.map((question) => [question.id_pregunta, question]),
        );
        const answered = new Set();
        const invalidAnswer = respuestas.some((answer) => {
          const id = Number(answer?.idPregunta);
          const question = questionsById.get(id);
          const value = String(answer?.valor ?? "").trim();
          if (!question || answered.has(id)) return true;
          answered.add(id);
          if (question.obligatoria && !value) return true;
          if (question.tipo === "numero" && value && !Number.isFinite(Number(value))) {
            return true;
          }
          return (
            question.tipo === "opcion" &&
            value &&
            !question.opciones.includes(value)
          );
        });
        const missing = questions.some(
          (question) => question.obligatoria && !answered.has(question.id_pregunta),
        );
        if (missing || invalidAnswer) {
          throw new AppError(400, "Faltan respuestas obligatorias o hay preguntas inválidas.");
        }
      }

      const { data: logbook, error } = await supabase
        .from("bitacora")
        .insert({
          fecha,
          horas_realizadas: hours,
          actividad: actividad.trim(),
          url_evidencias: urlEvidencias || null,
          reflexion_pedagogica: reflexionPedagogica || null,
          estado: "Pendiente",
          id_asignacion: Number(idAsignacion),
          id_sesion: session?.id_sesion ?? null,
          numero_visita:
            numeroVisita !== undefined && numeroVisita !== null && numeroVisita !== ""
              ? Number(numeroVisita)
              : null,
          hora_ingreso: horaIngreso,
          hora_salida: horaSalida,
        })
        .select("*")
        .single();
      throwDatabaseError(error);

      if (respuestas.length) {
        const answerRows = respuestas.map((answer) => ({
          id_bitacora: logbook.id_bitacora,
          id_pregunta: Number(answer.idPregunta),
          valor: String(answer.valor ?? ""),
        }));
        const { error: answerError } = await supabase
          .from("respuesta_bitacora")
          .insert(answerRows);
        if (answerError) {
          const { error: cleanupError } = await supabase
            .from("bitacora")
            .delete()
            .eq("id_bitacora", logbook.id_bitacora);
          if (cleanupError) {
            console.error("No se pudo revertir la bitácora incompleta:", cleanupError);
          }
          throwDatabaseError(answerError);
        }
      }
      return logbook;
    },

    async evaluate(id, input, actor, evaluatorRole) {
      const logbookId = Number(id);
      if (!Number.isInteger(logbookId)) throw new AppError(400, "Identificador de bitácora inválido.");

      const { data: logbook, error: logbookError } = await supabase
        .from("bitacora")
        .select("id_bitacora, id_asignacion")
        .eq("id_bitacora", logbookId)
        .maybeSingle();
      throwDatabaseError(logbookError);
      if (!logbook) throw new AppError(404, "No se encontró la bitácora.");
      const assignment = await assignmentService.getForActor(logbook.id_asignacion, actor);
      if (
        evaluatorRole === "asesor" &&
        actor.role !== "director" &&
        assignment.id_asesor !== actor.id_usuario
      ) {
        throw new AppError(403, "Solo puedes evaluar estudiantes asignados a ti.");
      }
      if (
        evaluatorRole === "tutor" &&
        actor.role !== "director" &&
        assignment.id_tutor !== actor.id_usuario
      ) {
        throw new AppError(403, "Solo puedes evaluar estudiantes asignados a ti.");
      }

      const { calificacion, observacion, fecha, corteActividad } = input ?? {};
      if (
        !Number.isFinite(Number(calificacion)) ||
        Number(calificacion) < 0 ||
        Number(calificacion) > 5 ||
        typeof observacion !== "string" ||
        !observacion.trim()
      ) {
        throw new AppError(400, "La calificación debe estar entre 0 y 5 e incluir observaciones.");
      }

      const table = evaluatorRole === "asesor" ? "evaluacion_asesor" : "evaluacion_tutor";
      const record = {
        id_bitacora: logbookId,
        calificacion_cuant: Number(calificacion),
        observacion_cual: observacion.trim(),
        fecha: fecha || new Date().toISOString().slice(0, 10),
      };
      if (evaluatorRole === "tutor") record.corte_actividad = corteActividad ?? null;

      const { data, error } = await supabase
        .from(table)
        .upsert(record, { onConflict: "id_bitacora" })
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },

    async review(id, input, actor) {
      const logbookId = Number(id);
      const { estado, retroalimentacion } = input ?? {};
      if (
        !Number.isInteger(logbookId) ||
        !["Aprobada", "Corrección"].includes(estado) ||
        typeof retroalimentacion !== "string" ||
        !retroalimentacion.trim()
      ) {
        throw new AppError(400, "Indica estado Aprobada/Corrección y retroalimentación.");
      }

      const { data: logbook, error } = await supabase
        .from("bitacora")
        .select("id_asignacion")
        .eq("id_bitacora", logbookId)
        .maybeSingle();
      throwDatabaseError(error);
      if (!logbook) throw new AppError(404, "No se encontró la bitácora.");
      const assignment = await assignmentService.getForActor(logbook.id_asignacion, actor);
      if (
        actor.role === "tutor" &&
        assignment.id_tutor !== actor.id_usuario
      ) {
        throw new AppError(403, "Solo puedes revisar bitácoras de estudiantes asignados a ti.");
      }

      const { data, error: reviewError } = await supabase.rpc("review_logbook", {
        p_id_bitacora: logbookId,
        p_estado: estado,
        p_retroalimentacion: retroalimentacion.trim(),
        p_revisado_por: actor.id_usuario,
      });
      throwDatabaseError(reviewError);
      return data;
    },
  };
}
