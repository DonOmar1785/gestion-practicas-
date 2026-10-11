import { AppError } from "../utils/app-error.js";
import { USER_ROLE_MODELS } from "../models/user-role.model.js";

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export function createUserService({ supabase, firebaseAuth }) {
  return {
    async findActiveByFirebaseUid(uid) {
      const { data, error } = await supabase
        .from("usuario")
        .select("id_usuario, uid_firebase, nombre_completo, rol, correo, estado")
        .eq("uid_firebase", uid)
        .eq("estado", "Activo")
        .maybeSingle();

      throwDatabaseError(error);
      return data;
    },

    async list() {
      const { data, error } = await supabase
        .from("usuario")
        .select("id_usuario, nombre_completo, rol, correo, estado, estudiante(id_programa)")
        .order("nombre_completo");

      throwDatabaseError(error);
      return data.map(({ estudiante, ...user }) => ({
        ...user,
        id_programa: estudiante?.id_programa ?? null,
      }));
    },

    async create(input) {
      const { correo, password, nombreCompleto, rol, idPrograma } = input;
      if (
        typeof correo !== "string" ||
        typeof password !== "string" ||
        password.length < 8 ||
        typeof nombreCompleto !== "string" ||
        !nombreCompleto.trim() ||
        !USER_ROLE_MODELS[rol]
      ) {
        throw new AppError(
          400,
          "Indica nombre, correo, contraseña de al menos 8 caracteres y un rol válido.",
        );
      }
      if (rol === "estudiante" && !Number.isInteger(Number(idPrograma))) {
        throw new AppError(400, "El estudiante debe tener un programa académico.");
      }

      let firebaseUser;
      try {
        firebaseUser = await firebaseAuth.createUser({
          email: correo.trim().toLowerCase(),
          password,
          displayName: nombreCompleto.trim(),
          disabled: false,
        });
      } catch (error) {
        if (error.code === "auth/email-already-exists") {
          throw new AppError(409, "Ya existe una cuenta con ese correo.");
        }
        throw error;
      }

      let profileId = null;
      try {
        const { data: profile, error: profileError } = await supabase
          .from("usuario")
          .insert({
            uid_firebase: firebaseUser.uid,
            nombre_completo: nombreCompleto.trim(),
            rol,
            correo: correo.trim().toLowerCase(),
            estado: "Activo",
          })
          .select("id_usuario, nombre_completo, rol, correo, estado")
          .single();

        throwDatabaseError(profileError);
        profileId = profile.id_usuario;

        const roleModel = USER_ROLE_MODELS[rol];
        const childProfile = { [roleModel.foreignKey]: profile.id_usuario };
        if (rol === "estudiante") childProfile.id_programa = Number(idPrograma);

        const { error: childError } = await supabase
          .from(roleModel.table)
          .insert(childProfile);
        throwDatabaseError(childError);

        return profile;
      } catch (error) {
        if (profileId !== null) {
          const { error: profileCleanupError } = await supabase
            .from("usuario")
            .delete()
            .eq("id_usuario", profileId);
          if (profileCleanupError) {
            console.error("No se pudo revertir el perfil Supabase incompleto:", profileCleanupError);
          }
        }
        try {
          await firebaseAuth.deleteUser(firebaseUser.uid);
        } catch (cleanupError) {
          console.error("No se pudo revertir el usuario Firebase incompleto:", cleanupError);
        }
        throw error;
      }
    },
  };
}
