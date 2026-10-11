import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export function createTemplateService(supabase) {
  return {
    async list(actor) {
      let query = supabase
        .from("plantilla_tutor")
        .select("*")
        .order("id_plantilla", { ascending: false });
      if (actor.role === "tutor") query = query.eq("id_tutor", actor.id_usuario);
      const { data, error } = await query;
      throwDatabaseError(error);
      return data;
    },

    async create(input, actor) {
      const { contenido, idTutor } = input ?? {};
      if (typeof contenido !== "string" || !contenido.trim()) {
        throw new AppError(400, "El contenido de la plantilla no puede estar vacío.");
      }
      const ownerId = actor.role === "tutor" ? actor.id_usuario : Number(idTutor);
      if (!Number.isInteger(Number(ownerId))) {
        throw new AppError(400, "Indica un tutor académico para la plantilla.");
      }

      const { data, error } = await supabase
        .from("plantilla_tutor")
        .insert({ contenido: contenido.trim(), id_tutor: Number(ownerId) })
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },

    async update(id, input, actor) {
      const { data: current, error: lookupError } = await supabase
        .from("plantilla_tutor")
        .select("id_plantilla, id_tutor")
        .eq("id_plantilla", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!current) throw new AppError(404, "No se encontró la plantilla.");
      if (actor.role === "tutor" && current.id_tutor !== actor.id_usuario) {
        throw new AppError(403, "Solo puedes modificar tus propias plantillas.");
      }

      const contenido = input?.contenido;
      if (typeof contenido !== "string" || !contenido.trim()) {
        throw new AppError(400, "El contenido de la plantilla no puede estar vacío.");
      }
      const { data, error } = await supabase
        .from("plantilla_tutor")
        .update({ contenido: contenido.trim() })
        .eq("id_plantilla", id)
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },
  };
}
