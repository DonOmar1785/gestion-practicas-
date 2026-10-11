export const USER_ROLE_MODELS = Object.freeze({
  director: Object.freeze({ table: "director", foreignKey: "id_director" }),
  estudiante: Object.freeze({ table: "estudiante", foreignKey: "id_estudiante" }),
  tutor: Object.freeze({ table: "tutor", foreignKey: "id_tutor" }),
  asesor: Object.freeze({ table: "asesor", foreignKey: "id_asesor" }),
});
