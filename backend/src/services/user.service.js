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

    async update(id, input) {
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de usuario inválido.");
      }
      const { data: current, error: lookupError } = await supabase
        .from("usuario")
        .select("id_usuario, uid_firebase, nombre_completo, correo")
        .eq("id_usuario", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!current) throw new AppError(404, "No se encontró el usuario solicitado.");

      const body = {};
      if (input?.nombre_completo !== undefined) {
        if (typeof input.nombre_completo !== "string" || !input.nombre_completo.trim()) {
          throw new AppError(400, "El nombre del usuario no puede estar vacío.");
        }
        body.nombre_completo = input.nombre_completo.trim();
      }
      if (input?.correo !== undefined) {
        if (typeof input.correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo)) {
          throw new AppError(400, "Indica un correo electrónico válido.");
        }
        body.correo = input.correo.trim().toLowerCase();
      }
      if (!Object.keys(body).length) {
        throw new AppError(400, "Indica el nombre o correo que deseas modificar.");
      }

      const firebaseUpdates = {};
      if (body.nombre_completo) firebaseUpdates.displayName = body.nombre_completo;
      if (body.correo) firebaseUpdates.email = body.correo;
      try {
        await firebaseAuth.updateUser(current.uid_firebase, firebaseUpdates);
      } catch (error) {
        if (error.code === "auth/email-already-exists") {
          throw new AppError(409, "Ya existe una cuenta con ese correo.");
        }
        throw error;
      }

      const { data, error } = await supabase
        .from("usuario")
        .update(body)
        .eq("id_usuario", id)
        .select("id_usuario, nombre_completo, rol, correo, estado")
        .single();
      if (error) {
        try {
          await firebaseAuth.updateUser(current.uid_firebase, {
            displayName: current.nombre_completo,
            email: current.correo,
          });
        } catch (rollbackError) {
          console.error("No se pudo revertir el perfil actualizado en Firebase:", rollbackError);
        }
        if (error.code === "23505") {
          throw new AppError(409, "Ya existe un usuario con ese correo.");
        }
      }
      throwDatabaseError(error);
      return data;
    },

    async remove(id, actor) {
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new AppError(400, "Identificador de usuario inválido.");
      }
      if (Number(id) === Number(actor.id_usuario)) {
        throw new AppError(400, "No puedes eliminar tu propia cuenta de Director.");
      }
      const { data: current, error: lookupError } = await supabase
        .from("usuario")
        .select("id_usuario, uid_firebase")
        .eq("id_usuario", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!current) throw new AppError(404, "No se encontró el usuario solicitado.");

      await firebaseAuth.updateUser(current.uid_firebase, { disabled: true });
      let data;
      let error;
      try {
        ({ data, error } = await supabase
          .from("usuario")
          .delete()
          .eq("id_usuario", id)
          .select("id_usuario")
          .maybeSingle());
      } catch (deleteError) {
        try {
          await firebaseAuth.updateUser(current.uid_firebase, { disabled: false });
        } catch (rollbackError) {
          console.error("No se pudo reactivar Firebase tras fallar el borrado:", rollbackError);
        }
        throw deleteError;
      }
      if (error) {
        try {
          await firebaseAuth.updateUser(current.uid_firebase, { disabled: false });
        } catch (rollbackError) {
          console.error("No se pudo reactivar la cuenta Firebase tras el borrado rechazado:", rollbackError);
        }
        if (error.code === "23503") {
          throw new AppError(
            409,
            "No se puede eliminar porque el usuario tiene asignaciones, bitácoras u otros datos relacionados.",
          );
        }
        throwDatabaseError(error);
      }
      if (!data) {
        await firebaseAuth.updateUser(current.uid_firebase, { disabled: false });
        throw new AppError(404, "No se encontró el usuario solicitado.");
      }

      try {
        await firebaseAuth.deleteUser(current.uid_firebase);
      } catch (error) {
        console.error("El perfil se eliminó, pero no se pudo borrar la cuenta Firebase:", error);
        throw new AppError(
          500,
          "Se eliminó el perfil de la aplicación, pero no la cuenta Firebase. Contacta al administrador.",
        );
      }
      return data;
    },
  };
}
