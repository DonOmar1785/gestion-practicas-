import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { ROLE_HOME } from "../config/roles.js";

// Solo deja pasar a usuarios con sesión y con uno de los roles permitidos.
export default function ProtectedRoute({ roles, children }) {
  const { status, user } = useAuth();

  if (status === "loading") return <p className="ayuda pantalla-centrada">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.rol)) return <Navigate to={ROLE_HOME[user.rol] ?? "/login"} replace />;
  return children;
}

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};
