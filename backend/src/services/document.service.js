// Gestiona documentos de práctica y restringe su revisión al tutor o al director.

import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function createDocumentService({ supabase, practiceService, notifications }) {
  return {
    async list(actor) {
      let query = supabase
        .from("documento")
        .select("*, practica!inner(*)")
        .order("fecha", { ascending: false });
      if (["estudiante", "tutor", "asesor"].includes(actor.role)) {
        const practices = await practiceService.listFor(actor);
        const ids = practices.map((practice) => practice.id_practica);
        if (!ids.length) return [];
        query = query.in("id_practica", ids);
      }

      const { data, error } = await query;
      throwDatabaseError(error);
      return data;
    },

    async create(input, actor) {
      const { tipoDocumento, urlArchivo, fecha, idPractica } = input ?? {};
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
      const practiceId = Number(idPractica);
      if (!Number.isInteger(practiceId) || practiceId < 1) {
        throw new AppError(400, "Indica una práctica válida.");
      }
      await practiceService.getForActor(practiceId, actor);

      const { data, error } = await supabase
        .from("documento")
        .insert({
          tipo_documento: tipoDocumento.trim(),
          url_archivo: urlArchivo,
          fecha: fecha || new Date().toISOString().slice(0, 10),
          estado: "Pendiente",
          id_practica: practiceId,
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
        .select("id_documento, practica!inner(id_tutor, id_estudiante)")
        .eq("id_documento", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!current) throw new AppError(404, "No se encontró el documento.");

      const practice = current.practica;
      const canUpdate =
        actor.role === "director" ||
        (actor.role === "tutor" && practice.id_tutor === actor.id_usuario);
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
      if (notifications) {
        await notifications.notifyUser(practice.id_estudiante, {
          title: estado === "Aprobado" ? "Documento aprobado" : "Documento con observaciones",
          body: estado === "Aprobado"
            ? "Tu documento fue aprobado."
            : "Tu documento requiere una corrección.",
          url: "/documentos",
        });
      }
      return data;
    },
  };
}
