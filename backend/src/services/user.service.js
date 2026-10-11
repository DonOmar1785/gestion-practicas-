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
        .select("id_usuario, uid_firebase, nombre_completo, rol, correo, estado, estudiante(semestre)")
        .eq("uid_firebase", uid)
        .eq("estado", "Activo")
        .maybeSingle();

      throwDatabaseError(error);
      if (!data) return data;
      const { estudiante, ...user } = data;
      return { ...user, semestre: estudiante?.semestre ?? null };
    },

    async list() {
      const { data, error } = await supabase
        .from("usuario")
        .select("id_usuario, nombre_completo, rol, correo, estado, estudiante(id_programa, semestre)")
        .order("nombre_completo");

      throwDatabaseError(error);
      return data.map(({ estudiante, ...user }) => ({
        ...user,
        id_programa: estudiante?.id_programa ?? null,
        semestre: estudiante?.semestre ?? null,
      }));
    },

    async create(input) {
      const { correo, password, nombreCompleto, rol, idPrograma, semestre } = input ?? {};
      if (
        typeof correo !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
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
      if (rol === "estudiante") {
        if (!Number.isInteger(Number(idPrograma)) || Number(idPrograma) < 1) {
          throw new AppError(400, "El estudiante debe tener un programa académico.");
        }
        if (!Number.isInteger(Number(semestre)) || Number(semestre) < 1 || Number(semestre) > 8) {
          throw new AppError(400, "Selecciona un semestre válido entre 1 y 8.");
        }
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
        if (rol === "estudiante") {
          childProfile.id_programa = Number(idPrograma);
          childProfile.semestre = Number(semestre);
        }

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
        .select("id_usuario, uid_firebase, nombre_completo, correo, rol, estado, estudiante(id_estudiante)")
        .eq("id_usuario", id)
        .maybeSingle();
      throwDatabaseError(lookupError);
      if (!current) throw new AppError(404, "No se encontró el usuario solicitado.");

      const body = {};
      if (input?.nombre_completo !== undefined) {
        if (typeof input.nombre_completo !== "string" || !input.nombre_completo.trim()) {
          throw new AppError(400, "El nombre del usuario no puede estar vacío.");
        }
        const nombreCompleto = input.nombre_completo.trim();
        if (nombreCompleto !== current.nombre_completo) body.nombre_completo = nombreCompleto;
      }
      if (input?.correo !== undefined) {
        if (typeof input.correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo)) {
          throw new AppError(400, "Indica un correo electrónico válido.");
        }
        const correo = input.correo.trim().toLowerCase();
        if (correo !== current.correo.toLowerCase()) body.correo = correo;
      }
      const changesSemester = input?.semestre !== undefined;
      if (changesSemester) {
        if (!current.estudiante) {
          throw new AppError(400, "El semestre solo se puede asignar a un estudiante.");
        }
        if (!Number.isInteger(Number(input.semestre)) || Number(input.semestre) < 1 || Number(input.semestre) > 8) {
          throw new AppError(400, "Selecciona un semestre válido entre 1 y 8.");
        }
      }
      if (!Object.keys(body).length && !changesSemester) {
        throw new AppError(400, "Indica el nombre, correo o semestre que deseas modificar.");
      }

      const firebaseUpdates = {};
      if (body.nombre_completo) firebaseUpdates.displayName = body.nombre_completo;
      let previousEmailVerified;
      if (body.correo) {
        const firebaseUser = await firebaseAuth.getUser(current.uid_firebase);
        previousEmailVerified = firebaseUser.emailVerified;
        firebaseUpdates.email = body.correo;
        firebaseUpdates.emailVerified = false;
      }
      if (Object.keys(firebaseUpdates).length) {
        try {
          await firebaseAuth.updateUser(current.uid_firebase, firebaseUpdates);
        } catch (error) {
          if (error.code === "auth/email-already-exists") {
            throw new AppError(409, "Ya existe una cuenta con ese correo.");
          }
          throw error;
        }
      }

      let data = {
        id_usuario: current.id_usuario,
        nombre_completo: body.nombre_completo ?? current.nombre_completo,
        correo: body.correo ?? current.correo,
        rol: current.rol,
        estado: current.estado,
      };
      let error = null;
      if (Object.keys(body).length) {
        ({ data, error } = await supabase
          .from("usuario")
          .update(body)
          .eq("id_usuario", id)
          .select("id_usuario, nombre_completo, rol, correo, estado")
          .single());
      } else {
        data = {
          id_usuario: current.id_usuario,
          nombre_completo: current.nombre_completo,
          rol: current.rol,
          correo: current.correo,
          estado: current.estado,
        };
      }
      if (error) {
        if (Object.keys(firebaseUpdates).length) {
          try {
            await firebaseAuth.updateUser(current.uid_firebase, {
              displayName: current.nombre_completo,
              email: current.correo,
              ...(previousEmailVerified === undefined
                ? {}
                : { emailVerified: previousEmailVerified }),
            });
          } catch (rollbackError) {
            console.error("No se pudo revertir el perfil actualizado en Firebase:", rollbackError);
          }
        }
        if (error.code === "23505") {
          throw new AppError(409, "Ya existe un usuario con ese correo.");
        }
        throwDatabaseError(error);
      }
      if (changesSemester) {
        const { error: semesterError } = await supabase
          .from("estudiante")
          .update({ semestre: Number(input.semestre) })
          .eq("id_estudiante", id);
        if (semesterError) {
          console.error("No se pudo actualizar el semestre del estudiante en Supabase:", semesterError);
          if (Object.keys(body).length) {
            const { error: profileRollbackError } = await supabase
              .from("usuario")
              .update({
                nombre_completo: current.nombre_completo,
                correo: current.correo,
              })
              .eq("id_usuario", id);
            if (profileRollbackError) {
              console.error("No se pudo revertir el perfil de usuario:", profileRollbackError);
            }
            if (Object.keys(firebaseUpdates).length) {
              try {
                await firebaseAuth.updateUser(current.uid_firebase, {
                  displayName: current.nombre_completo,
                  email: current.correo,
                  ...(previousEmailVerified === undefined
                    ? {}
                    : { emailVerified: previousEmailVerified }),
                });
              } catch (rollbackError) {
                console.error("No se pudo revertir el perfil actualizado en Firebase:", rollbackError);
              }
            }
          }
          throwDatabaseError(semesterError);
        }
        data.semestre = Number(input.semestre);
      }
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
