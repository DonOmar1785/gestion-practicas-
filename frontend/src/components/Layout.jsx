import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { USE_MOCK } from "../config/env.js";
import { getMenu } from "../config/menus.js";
import { ROLE_TITLES } from "../config/roles.js";
import NotificationCenter from "./NotificationCenter.jsx";
import { disablePushNotifications } from "../services/firebaseMessaging.js";

// Estructura común de todas las pantallas: barra lateral + encabezado + contenido.
export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const menu = getMenu(user.rol, user.semestre);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">GP</div>
        <h2>{ROLE_TITLES[user.rol] ?? "Gestión de Prácticas"}</h2>
        <ul className="sidebar-menu">
          {menu.map(([label, path]) => (
            <li key={path}>
              <NavLink to={path}>{label}</NavLink>
            </li>
          ))}
          <li>
            <a
              href="/login"
              onClick={(event) => {
                event.preventDefault();
                void disablePushNotifications()
                  .catch((error) => console.error("No se pudo desactivar FCM al cerrar sesión:", error))
                  .finally(logout);
              }}
            >
              Cerrar sesión
            </a>
          </li>
        </ul>
      </aside>

      <main className="content">
        <div className="dashboard-header">
          <h1>{title}</h1>
          <div className="usuario-info">
            <span>{user.nombre}</span>
            <div className="user-icon">🎓</div>
          </div>
        </div>
        <NotificationCenter />
        {USE_MOCK && (
          <p className="mensaje info">
            Modo demostración: los datos son de prueba y se reinician al recargar la página.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

Layout.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};
