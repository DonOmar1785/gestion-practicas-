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
      "fecha_inicio",
      "fecha_fin",
      "horas_requeridas",
      "estado_horas",
      "estado_practica",
      "estado_seg",
      "id_programa",
      "id_ciclo",
      "semestre",
      "tipo_practica",
    ],
  }),
});
