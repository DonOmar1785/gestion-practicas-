// Tablas que el Director puede modificar o eliminar: campo identificador y campos editables.
export const MANAGED_RESOURCES = {
  users: {
    idField: "id_usuario",
    fields: [
      { key: "nombre_completo", required: true },
      { key: "correo", type: "email", required: true },
      {
        key: "cedula",
        required: true,
        when: (user) => String(user.rol).toLowerCase() === "estudiante",
      },
      {
        key: "semestre",
        type: "number",
        required: true,
        min: 1,
        max: 12,
        when: (user) => String(user.rol).toLowerCase() === "estudiante",
      },
    ],
  },
  institutions: {
    idField: "id_institucion",
    fields: [
      { key: "nombre_institucion", required: true },
      { key: "ciudad" },
      { key: "direccion" },
      { key: "telefono" },
      { key: "estado_institucion" },
    ],
  },
  practices: {
    idField: "id_practica",
    fields: [
      { key: "fecha_fin", type: "date", required: true },
      { key: "estado_practica", type: "select", options: ["Activa", "Finalizada"] },
      { key: "estado_seg", type: "select", options: ["En seguimiento", "Cerrado"] },
    ],
  },
};
