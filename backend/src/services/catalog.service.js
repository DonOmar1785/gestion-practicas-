import { AppError } from "../utils/app-error.js";
import { CATALOG_MODELS } from "../models/catalog.model.js";

function selectFields(input, allowed) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "El cuerpo de la solicitud debe ser un objeto.");
  }
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => allowed.includes(key) && value !== undefined),
  );
}

function validateCreate(resource, body) {
  const requiredFields = {
    programs: ["nombre_programa"],
    cycles: ["nombre_periodo"],
    institutions: ["nombre_institucion"],
    practices: ["horas_requeridas"],
  }[resource];
  if (requiredFields.some((field) => body[field] === undefined || body[field] === "")) {
    throw new AppError(400, `Faltan campos obligatorios para crear ${resource}.`);
  }
  if (
    resource === "practices" &&
    (!Number.isInteger(Number(body.horas_requeridas)) || Number(body.horas_requeridas) < 1)
  ) {
    throw new AppError(400, "Las horas requeridas deben ser un entero positivo.");
  }
  if (body.fecha_inicio && body.fecha_fin && body.fecha_fin < body.fecha_inicio) {
    throw new AppError(400, "La fecha final no puede ser anterior a la inicial.");
  }
}

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export function createCatalogService(supabase) {
  return {
    async list(resource) {
      const config = CATALOG_MODELS[resource];
      const { data, error } = await supabase.from(config.table).select("*").order(config.id);
      throwDatabaseError(error);
      return data;
    },

    async create(resource, input) {
      const config = CATALOG_MODELS[resource];
      const body = selectFields(input, config.fields);
      if (!Object.keys(body).length) {
        throw new AppError(400, "No hay campos válidos para crear el registro.");
      }
      validateCreate(resource, body);

      const { data, error } = await supabase
        .from(config.table)
        .insert(body)
        .select("*")
        .single();
      throwDatabaseError(error);
      return data;
    },

    async update(resource, id, input) {
      const config = CATALOG_MODELS[resource];
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de registro inválido.");
      }
      const body = selectFields(input, config.fields);
      if (!Object.keys(body).length) {
        throw new AppError(400, "No hay campos válidos para actualizar.");
      }
      if (
        resource === "practices" &&
        body.horas_requeridas !== undefined &&
        (!Number.isInteger(Number(body.horas_requeridas)) ||
          Number(body.horas_requeridas) < 1)
      ) {
        throw new AppError(400, "Las horas requeridas deben ser un entero positivo.");
      }
      if (body.fecha_inicio && body.fecha_fin && body.fecha_fin < body.fecha_inicio) {
        throw new AppError(400, "La fecha final no puede ser anterior a la inicial.");
      }

      const { data, error } = await supabase
        .from(config.table)
        .update(body)
        .eq(config.id, id)
        .select("*")
        .maybeSingle();
      if (error?.code === "23503") {
        throw new AppError(409, "No se puede guardar porque hay datos relacionados o referencias inválidas.");
      }
      if (error?.code === "23505") {
        throw new AppError(409, "Ya existe un registro con esos datos.");
      }
      throwDatabaseError(error);
      if (!data) throw new AppError(404, "No se encontró el registro solicitado.");
      return data;
    },

    async remove(resource, id) {
      const config = CATALOG_MODELS[resource];
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de registro inválido.");
      }

      const { data, error } = await supabase
        .from(config.table)
        .delete()
        .eq(config.id, id)
        .select(config.id)
        .maybeSingle();
      if (error?.code === "23503") {
        throw new AppError(
          409,
          "No se puede eliminar porque el registro tiene datos relacionados.",
        );
      }
      throwDatabaseError(error);
      if (!data) throw new AppError(404, "No se encontró el registro solicitado.");
      return data;
    },
  };
}
