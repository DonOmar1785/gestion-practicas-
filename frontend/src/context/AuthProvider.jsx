import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "./AuthContext.js";
import { onAuthChange, requestPasswordReset, signIn, signOutUser } from "../services/auth.js";
import { apiRequest } from "../services/api.js";
import { homeForRole, toUiRole } from "../config/roles.js";

const ANONYMOUS = { status: "anonymous", user: null, error: "" };

// Convierte la respuesta de /me en el usuario que usa la interfaz.
function buildUser(profile) {
  return {
    id: String(profile.id),
    nombre: profile.name,
    rol: toUiRole(profile.role),
    correo: profile.email,
    semestre: profile.semester,
  };
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: "loading", user: null, error: "" });

  // Escucha los cambios de sesión (Firebase o modo demostración).
  useEffect(() => {
    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthChange(async (authUser) => {
        if (!authUser || !authUser.emailVerified) {
          // Conserva el mensaje de error si ya estábamos como anónimos.
          setSession((current) => (current.status === "anonymous" ? current : ANONYMOUS));
          return;
        }
        try {
          const profile = await apiRequest("/me");
          if (!homeForRole(profile.role)) {
            throw new Error("El rol de tu cuenta no tiene una página asignada.");
          }
          setSession({ status: "authenticated", user: buildUser(profile), error: "" });
        } catch (error) {
          await signOutUser().catch((signOutError) => console.error(signOutError));
          setSession({ ...ANONYMOUS, error: error.message || "No se pudo cargar el perfil." });
        }
      });
    } catch (error) {
      setSession({ ...ANONYMOUS, error: error.message || "No fue posible iniciar la autenticación." });
    }

    return () => unsubscribe();
  }, []);

  // Inicia sesión. Devuelve un mensaje informativo si hay algo que avisar.
  const login = useCallback(async ({ email, password, remember }) => {
    setSession((current) => (current.error ? { ...current, error: "" } : current));
    const result = await signIn({ email, password, remember });
    return result.message ?? null;
  }, []);

  const logout = useCallback(() => signOutUser(), []);
  const resetPassword = useCallback((email) => requestPasswordReset(email), []);

  const value = useMemo(
    () => ({
      status: session.status,
      user: session.user,
      authError: session.error,
      login,
      logout,
      resetPassword,
    }),
    [session, login, logout, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
