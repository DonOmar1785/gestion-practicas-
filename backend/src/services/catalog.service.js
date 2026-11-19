// Administra catálogos maestros y protege integridad referencial con validaciones de negocio.

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
    (!Number.isFinite(Number(body.horas_requeridas)) || Number(body.horas_requeridas) <= 0)
  ) {
    throw new AppError(400, "Las horas requeridas deben ser un número mayor que cero.");
  }
  if (body.fecha_inicio && body.fecha_fin && body.fecha_fin < body.fecha_inicio) {
    throw new AppError(400, "La fecha final no puede ser anterior a la inicial.");
  }
}

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

function validatePracticeUpdate(body, startDate) {
  if (
    body.estado_practica !== undefined &&
    !["Activa", "Finalizada"].includes(body.estado_practica)
  ) {
    throw new AppError(400, "El estado de práctica no es válido.");
  }
  if (
    body.estado_seg !== undefined &&
    !["En seguimiento", "Cerrado"].includes(body.estado_seg)
  ) {
    throw new AppError(400, "El estado de seguimiento no es válido.");
  }
  if (body.fecha_fin !== undefined) {
    if (
      typeof body.fecha_fin !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_fin) ||
      Number.isNaN(Date.parse(`${body.fecha_fin}T00:00:00Z`)) ||
      new Date(`${body.fecha_fin}T00:00:00Z`).toISOString().slice(0, 10) !== body.fecha_fin
    ) {
      throw new AppError(400, "Indica una fecha final válida.");
    }
    if (startDate && body.fecha_fin < startDate) {
      throw new AppError(400, "La fecha final no puede ser anterior a la inicial.");
    }
  }
}

// Mantiene catálogos con creación, actualización y eliminación segura de registros.
export function createCatalogService(supabase) {
  return {
    async list(resource) {
      const config = CATALOG_MODELS[resource];
      const { data, error } = await supabase.from(config.table).select("*").order(config.id);
      throwDatabaseError(error);
      return data;
    },

    async create(resource, input) {
      if (resource === "practices") {
        throw new AppError(405, "Las prácticas se crean mediante el flujo de grupo.");
      }
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
      if (resource === "practices" && body.fecha_fin !== undefined) {
        const { data: current, error: lookupError } = await supabase
          .from(config.table)
          .select("fecha_inicio")
          .eq(config.id, id)
          .maybeSingle();
        throwDatabaseError(lookupError);
        if (!current) throw new AppError(404, "No se encontró el registro solicitado.");
        validatePracticeUpdate(body, current.fecha_inicio);
      } else if (resource === "practices") {
        validatePracticeUpdate(body);
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
