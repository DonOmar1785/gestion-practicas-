import { AppError } from "../utils/app-error.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export function createAssignmentService(supabase) {
  return {
    async listFor(actor) {
      let query = supabase
        .from("asignacion_estudiante")
        .select(
          "*, practica(*), institucion(*), estudiante:estudiante!inner(id_estudiante, usuario:usuario!inner(id_usuario, nombre_completo, correo)), tutor:tutor(id_tutor, usuario:usuario!inner(id_usuario, nombre_completo, correo)), asesor:asesor(id_asesor, usuario:usuario!inner(id_usuario, nombre_completo, correo))",
        )
        .order("id_asignacion", { ascending: false });

      if (actor.role === "estudiante") {
        query = query.eq("id_estudiante", actor.id_usuario);
      } else if (actor.role === "tutor") {
        query = query.eq("id_tutor", actor.id_usuario);
      } else if (actor.role === "asesor") {
        query = query.eq("id_asesor", actor.id_usuario);
      }

      const { data, error } = await query;
      throwDatabaseError(error);
      return data;
    },

    async getForActor(id, actor) {
      const { data, error } = await supabase
        .from("asignacion_estudiante")
        .select("*, practica(*)")
        .eq("id_asignacion", id)
        .maybeSingle();
      throwDatabaseError(error);
      if (!data) throw new AppError(404, "No se encontró la asignación.");

      const ownsAssignment =
        (actor.role === "estudiante" && data.id_estudiante === actor.id_usuario) ||
        (actor.role === "tutor" && data.id_tutor === actor.id_usuario) ||
        (actor.role === "asesor" && data.id_asesor === actor.id_usuario);
      if (!ownsAssignment && !["director", "tutor"].includes(actor.role)) {
        throw new AppError(403, "No tienes acceso a esta asignación.");
      }
      return data;
    },

    async create(input) {
      const allowed = [
        "horas_acumuladas",
        "estado_arl",
        "id_estudiante",
        "id_practica",
        "id_institucion",
        "id_tutor",
        "id_asesor",
      ];
      const body = Object.fromEntries(
        Object.entries(input ?? {}).filter(([key]) => allowed.includes(key)),
      );
      for (const field of ["id_estudiante", "id_practica", "id_institucion", "id_tutor", "id_asesor"]) {
        if (
          body[field] === undefined ||
          body[field] === null ||
          body[field] === "" ||
          !Number.isInteger(Number(body[field])) ||
          Number(body[field]) < 1
        ) {
          throw new AppError(400, `El campo ${field} es obligatorio.`);
        }
        body[field] = Number(body[field]);
      }

      const { data, error } = await supabase
        .from("asignacion_estudiante")
        .insert(body)
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },
  };
}
