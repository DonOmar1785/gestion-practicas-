// Mapea cada catálogo a su tabla y campos permitidos para crear y actualizar registros.

export const CATALOG_MODELS = Object.freeze({
  programs: Object.freeze({
    table: "programa_academico",
    id: "id_programa",
    fields: ["nombre_programa", "facultad", "id_director"],
  }),
  cycles: Object.freeze({
    table: "ciclo_practica",
    id: "id_ciclo",
    fields: ["nombre_periodo", "estado_ciclo", "id_director"],
  }),
  institutions: Object.freeze({
    table: "institucion",
    id: "id_institucion",
    fields: [
      "nombre_institucion",
      "ciudad",
      "direccion",
      "telefono",
      "estado_institucion",
    ],
  }),
  practices: Object.freeze({
    table: "practica",
    id: "id_practica",
    fields: [
      "fecha_fin",
      "estado_practica",
      "estado_seg",
    ],
  }),
});
