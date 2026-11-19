import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { ROLE_HOME } from "../config/roles.js";

// Ruta "/": envía al panel del rol o al login.
export default function HomeRedirect() {
  const { status, user } = useAuth();
  if (status === "loading") return <p className="ayuda pantalla-centrada">Cargando…</p>;
  return <Navigate to={user ? ROLE_HOME[user.rol] ?? "/login" : "/login"} replace />;
}
