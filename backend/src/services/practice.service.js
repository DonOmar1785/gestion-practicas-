// Administra las prácticas individuales y verifica el grupo antes de crear prácticas por lote.

import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error?.code === "23505") {
    throw new AppError(409, "Uno o más estudiantes ya tienen una práctica en ese ciclo y semestre.");
  }
  if (error?.code === "23503") {
    throw new AppError(400, "La institución, tutor, asesor o estudiante seleccionado no es válido.");
  }
  if (error) throw new Error(`Supabase: ${error.message}`);
}

function positiveId(value, label) {
  if (!Number.isInteger(Number(value)) || Number(value) < 1) {
    throw new AppError(400, `Selecciona ${label}.`);
  }
  return Number(value);
}

function validateDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, `Indica una fecha válida para ${label}.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, `Indica una fecha válida para ${label}.`);
  }
  return value;
}

function normalizePractice(input, common) {
  const idEstudiante = positiveId(input?.id_estudiante, "el estudiante");
  const idInstitucion = positiveId(input?.id_institucion, "la institución");
  const idTutor = positiveId(input?.id_tutor, "el tutor");
  const idAsesor = positiveId(input?.id_asesor, "el asesor");
  const modalidad = input?.modalidad;
  if (!["Presencial", "Virtual"].includes(modalidad)) {
    throw new AppError(400, "Selecciona la modalidad de cada práctica.");
  }

  const fechaVencimientoArl = modalidad === "Presencial"
    ? validateDate(input.fecha_vencimiento_arl, "el vencimiento de ARL")
    : null;
  const estadoArl = modalidad === "Virtual"
    ? "No aplica"
    : fechaVencimientoArl < new Date().toISOString().slice(0, 10)
      ? "Vencida"
      : "Vigente";

  return {
    ...common,
    id_estudiante: idEstudiante,
    id_institucion: idInstitucion,
    id_tutor: idTutor,
    id_asesor: idAsesor,
    modalidad,
    estado_arl: estadoArl,
    fecha_vencimiento_arl: fechaVencimientoArl,
    horas_acumuladas: 0,
    estado_horas: "En curso",
    estado_practica: "Activa",
    estado_seg: "En seguimiento",
  };
}

export function createPracticeService(supabase) {
  return {
    async listFor(actor) {
      let query = supabase
        .from("practica")
        .select(
          "*, estudiante:estudiante!inner(id_estudiante, id_programa, semestre, usuario:usuario!inner(id_usuario, nombre_completo, cedula, correo)), institucion(*), tutor:tutor(id_tutor, usuario:usuario!inner(id_usuario, nombre_completo)), asesor:asesor(id_asesor, usuario:usuario!inner(id_usuario, nombre_completo))",
        )
        .order("id_practica", { ascending: false });

      if (actor.role === "estudiante") query = query.eq("id_estudiante", actor.id_usuario);
      if (actor.role === "tutor") query = query.eq("id_tutor", actor.id_usuario);
      if (actor.role === "asesor") query = query.eq("id_asesor", actor.id_usuario);

      const { data, error } = await query;
      throwDatabaseError(error);
      return data;
    },

    async getForActor(id, actor) {
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de práctica inválido.");
      }
      let query = supabase
        .from("practica")
        .select(
          "*, estudiante:estudiante!inner(id_estudiante, id_programa, semestre, usuario:usuario!inner(id_usuario, nombre_completo, cedula)), institucion(*), tutor:tutor(id_tutor), asesor:asesor(id_asesor)",
        )
        .eq("id_practica", id);
      if (actor.role === "estudiante") query = query.eq("id_estudiante", actor.id_usuario);
      if (actor.role === "tutor") query = query.eq("id_tutor", actor.id_usuario);
      if (actor.role === "asesor") query = query.eq("id_asesor", actor.id_usuario);

      const { data, error } = await query.maybeSingle();
      throwDatabaseError(error);
      if (!data) throw new AppError(404, "No se encontró la práctica o no tienes acceso a ella.");
      return data;
    },

    async createBatch(input) {
      const {
        id_ciclo,
        id_programa,
        semestre,
        tipo_practica,
        fecha_inicio,
        fecha_fin,
        horas_requeridas,
        estudiantes,
      } = input ?? {};
      if (!Array.isArray(estudiantes) || !estudiantes.length) {
        throw new AppError(400, "Selecciona al menos un estudiante para crear las prácticas.");
      }
      if (!Number.isInteger(Number(semestre)) || Number(semestre) < 1 || Number(semestre) > 12) {
        throw new AppError(400, "Selecciona un semestre entre 1 y 12.");
      }
      if (!["Pedagógica", "Pedagógica investigativa"].includes(tipo_practica)) {
        throw new AppError(400, "Selecciona un tipo de práctica válido.");
      }
      const requiredHours = Number(horas_requeridas);
      if (
        !Number.isFinite(requiredHours) ||
        requiredHours <= 0 ||
        requiredHours > 9999.99 ||
        Math.abs(requiredHours * 100 - Math.round(requiredHours * 100)) > 1e-7
      ) {
        throw new AppError(400, "Las horas requeridas deben ser un número positivo de hasta dos decimales.");
      }
      const fechaInicio = validateDate(fecha_inicio, "la fecha de inicio");
      const fechaFin = validateDate(fecha_fin, "la fecha de fin");
      if (fechaFin < fechaInicio) throw new AppError(400, "La fecha final no puede ser anterior a la inicial.");

      const cycleId = positiveId(id_ciclo, "el ciclo");
      const programId = positiveId(id_programa, "el programa");
      const studentIds = estudiantes.map((item) => positiveId(item?.id_estudiante, "el estudiante"));
      if (new Set(studentIds).size !== studentIds.length) {
        throw new AppError(400, "La lista contiene estudiantes repetidos.");
      }

      const { data: cycle, error: cycleError } = await supabase
        .from("ciclo_practica")
        .select("id_ciclo, estado_ciclo")
        .eq("id_ciclo", cycleId)
        .maybeSingle();
      throwDatabaseError(cycleError);
      if (!cycle || cycle.estado_ciclo !== "Abierto") {
        throw new AppError(409, "El ciclo seleccionado no está abierto.");
      }

      const { data: studentProfiles, error: studentError } = await supabase
        .from("estudiante")
        .select("id_estudiante, id_programa, semestre, usuario:usuario!inner(estado)")
        .in("id_estudiante", studentIds);
      throwDatabaseError(studentError);
      if (studentProfiles.length !== studentIds.length) {
        throw new AppError(400, "Uno o más estudiantes ya no están disponibles.");
      }
      const profilesById = new Map(studentProfiles.map((student) => [student.id_estudiante, student]));
      for (const id of studentIds) {
        const student = profilesById.get(id);
        if (
          Number(student.id_programa) !== programId ||
          Number(student.semestre) !== Number(semestre) ||
          student.usuario?.estado !== "Activo"
        ) {
          throw new AppError(409, "Los estudiantes deben estar activos y coincidir con el programa y semestre seleccionados.");
        }
      }

      const common = {
        id_ciclo: cycleId,
        semestre: Number(semestre),
        tipo_practica,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        horas_requeridas: Number(requiredHours.toFixed(2)),
      };
      const rows = estudiantes.map((student) => normalizePractice(student, common));
      const { data, error } = await supabase.from("practica").insert(rows).select("*");
      throwDatabaseError(error);
      return data;
    },
  };
}
