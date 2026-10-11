import { randomBytes } from "node:crypto";
import { AppError } from "../utils/app-error.js";
import { MANAGER_ROLES } from "../utils/roles.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function createSessionService({ supabase, assignmentService }) {
  return {
    async list(actor) {
      let query = supabase
        .from("sesion_bitacora")
        .select("*, pregunta_bitacora(*)")
        .eq("pregunta_bitacora.activa", true)
        .order("fecha_inicio", { ascending: false });

      if (!MANAGER_ROLES.includes(actor.role)) {
        const assignments = await assignmentService.listFor(actor);
        const practiceIds = [...new Set(assignments.map((item) => item.id_practica))];
        if (!practiceIds.length) return [];
        query = query.in("id_practica", practiceIds).eq("visible", true);
      }

      const { data, error } = await query;
      throwDatabaseError(error);
      return data;
    },

    async create(input, actor) {
      const { nombre, descripcion, fecha_inicio, fecha_fin, id_programa, id_ciclo, id_practica, preguntas = [] } =
        input ?? {};
      if (
        typeof nombre !== "string" ||
        !nombre.trim() ||
        !isValidDate(fecha_inicio) ||
        !isValidDate(fecha_fin) ||
        new Date(fecha_fin) < new Date(fecha_inicio) ||
        !Array.isArray(preguntas)
      ) {
        throw new AppError(400, "Verifica el nombre, fechas y lista de preguntas de la bitácora.");
      }
      const normalizedQuestions = preguntas.map((question, index) =>
        normalizeQuestion(question, 1, index),
      );

      const { data: session, error } = await supabase
        .from("sesion_bitacora")
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion ?? null,
          codigo: randomBytes(5).toString("hex").toUpperCase(),
          fecha_inicio,
          fecha_fin,
          estado: "Abierta",
          visible: true,
          id_creado_por: actor.id_usuario,
          id_programa: id_programa ?? null,
          id_ciclo: id_ciclo ?? null,
          id_practica: id_practica ?? null,
        })
        .select("*")
        .single();
      throwDatabaseError(error);

      if (normalizedQuestions.length) {
        const questionRows = normalizedQuestions.map((question) => ({
          ...question,
          id_sesion: session.id_sesion,
        }));
        const { error: questionError } = await supabase
          .from("pregunta_bitacora")
          .insert(questionRows);
        if (questionError) {
          const { error: cleanupError } = await supabase
            .from("sesion_bitacora")
            .delete()
            .eq("id_sesion", session.id_sesion);
          if (cleanupError) {
            console.error("No se pudo revertir la sesión incompleta:", cleanupError);
          }
          throwDatabaseError(questionError);
        }
      }

      return session;
    },

    async setState(id, input) {
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de sesión inválido.");
      }
      const allowedStates = new Set(["Abierta", "Cerrada"]);
      const { estado, visible } = input ?? {};
      if (!allowedStates.has(estado) || typeof visible !== "boolean") {
        throw new AppError(400, "Indica estado Abierta/Cerrada y visibilidad booleana.");
      }

      const { data, error } = await supabase
        .from("sesion_bitacora")
        .update({ estado, visible })
        .eq("id_sesion", id)
        .select("*")
        .maybeSingle();
      throwDatabaseError(error);
      if (!data) throw new AppError(404, "No se encontró la sesión de bitácora.");
      return data;
    },

    async saveQuestions(id, input) {
      if (!Array.isArray(input?.preguntas)) {
        throw new AppError(400, "Envía una lista de preguntas.");
      }
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de sesión inválido.");
      }

      const { data: session, error: lookupError } = await supabase
        .from("sesion_bitacora")
        .select("id_sesion")
        .eq("id_sesion", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!session) throw new AppError(404, "No se encontró la sesión de bitácora.");

      const rows = input.preguntas.map((question, index) =>
        normalizeQuestion(question, Number(id), index),
      );
      const { data, error } = await supabase.rpc("replace_logbook_questions", {
        p_id_sesion: Number(id),
        p_preguntas: rows.map(({ id_sesion, ...question }) => question),
      });
      throwDatabaseError(error);
      return data;
    },
  };
}

function normalizeQuestion(question, idSession, order) {
  const allowedTypes = new Set(["texto", "numero", "opcion"]);
  if (
    typeof question?.texto !== "string" ||
    !question.texto.trim() ||
    !allowedTypes.has(question.tipo)
  ) {
    throw new AppError(400, "Cada pregunta debe tener texto y tipo válido.");
  }
  if (
    question.tipo === "opcion" &&
    (!Array.isArray(question.opciones) ||
      question.opciones.length === 0 ||
      question.opciones.some((option) => typeof option !== "string" || !option.trim()))
  ) {
    throw new AppError(400, "Las preguntas de opción requieren una lista de opciones válida.");
  }

  return {
    id_sesion: idSession,
    texto: question.texto.trim(),
    tipo: question.tipo,
    obligatoria: question.obligatoria === true,
    opciones: question.tipo === "opcion" ? question.opciones ?? [] : [],
    orden: Number.isInteger(question.orden) ? question.orden : order,
    activa: question.activa !== false,
  };
}
