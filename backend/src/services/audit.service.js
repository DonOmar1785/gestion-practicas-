import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export function createAuditService(supabase) {
  return {
    async record(req, responseBody) {
      const data = responseBody?.data;
      const entityId =
        req.params.id ??
        data?.id_usuario ??
        data?.id_sesion ??
        data?.id_asignacion ??
        data?.id_bitacora ??
        data?.id_documento ??
        data?.id_plantilla ??
        data?.id_practica ??
        data?.id_ciclo ??
        data?.id_programa ??
        data?.id_institucion;

      const { error } = await supabase.from("evento_auditoria").insert({
        id_usuario: req.actor.id_usuario,
        accion: req.method,
        entidad: req.path.split("/").filter(Boolean)[0] ?? "api",
        id_entidad: entityId === undefined ? null : String(entityId),
        detalle: { ruta: req.originalUrl.split("?")[0] },
      });
      throwDatabaseError(error);
    },

    async list(limit = 200) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
        throw new AppError(400, "El límite de auditoría debe estar entre 1 y 500.");
      }
      const { data, error } = await supabase
        .from("evento_auditoria")
        .select("id_evento, id_usuario, accion, entidad, id_entidad, detalle, creado_en")
        .order("creado_en", { ascending: false })
        .limit(limit);
      throwDatabaseError(error);
      return data;
    },
  };
}
