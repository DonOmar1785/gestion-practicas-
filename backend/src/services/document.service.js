import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function createDocumentService({ supabase, assignmentService }) {
  return {
    async list(actor) {
      let query = supabase
        .from("documento")
        .select("*, asignacion_estudiante!inner(*)")
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
      const { tipoDocumento, urlArchivo, fecha, idAsignacion } = input ?? {};
      if (
        typeof tipoDocumento !== "string" ||
        !tipoDocumento.trim() ||
        typeof urlArchivo !== "string" ||
        !/^https?:\/\//i.test(urlArchivo) ||
        urlArchivo.length > 255 ||
        (fecha !== undefined && fecha !== null && !isValidDate(fecha))
      ) {
        throw new AppError(400, "Indica el tipo de documento y un enlace http(s) válido.");
      }
      const assignmentId = Number(idAsignacion);
      if (!Number.isInteger(assignmentId)) {
        throw new AppError(400, "Indica una asignación válida.");
      }
      await assignmentService.getForActor(assignmentId, actor);

      const { data, error } = await supabase
        .from("documento")
        .insert({
          tipo_documento: tipoDocumento.trim(),
          url_archivo: urlArchivo,
          fecha: fecha || new Date().toISOString().slice(0, 10),
          estado: "Pendiente",
          id_asignacion: assignmentId,
        })
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },

    async setState(id, input, actor) {
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de documento inválido.");
      }
      const allowedStates = new Set(["Pendiente", "Aprobado", "Corrección"]);
      const { estado } = input ?? {};
      if (!allowedStates.has(estado)) {
        throw new AppError(400, "Indica un estado de documento válido.");
      }

      const { data: current, error: lookupError } = await supabase
        .from("documento")
        .select("id_documento, asignacion_estudiante!inner(id_tutor)")
        .eq("id_documento", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!current) throw new AppError(404, "No se encontró el documento.");

      const assignment = current.asignacion_estudiante;
      const canUpdate =
        actor.role === "director" ||
        (actor.role === "tutor" && assignment.id_tutor === actor.id_usuario);
      if (!canUpdate) {
        throw new AppError(403, "No tienes permiso para revisar este documento.");
      }

      const { data, error } = await supabase
        .from("documento")
        .update({ estado })
        .eq("id_documento", id)
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },
  };
}
