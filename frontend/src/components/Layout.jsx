import { useState } from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { USE_MOCK } from "../config/env.js";
import { getMenu } from "../config/menus.js";
import { ROLE_TITLES } from "../config/roles.js";
import NotificationCenter from "./NotificationCenter.jsx";
import { disablePushNotifications } from "../services/firebaseMessaging.js";

export default function Layout({ title, description, children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menu = getMenu(user.rol, user.semestre);
  const initials = user.nombre?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "GP";

  const closeSession = async () => {
    setSigningOut(true);
    try {
      await disablePushNotifications().catch((error) => console.error("No se pudo desactivar FCM al cerrar sesión:", error));
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="dashboard workspace-shell">
      <a className="skip-link" href="#contenido">Ir al contenido</a>
      <aside className="sidebar workspace-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">GP</span>
          <div><strong>Gestión de Prácticas</strong><small>{ROLE_TITLES[user.rol]}</small></div>
          <button type="button" className="mobile-menu" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(!menuOpen)}>Menú</button>
        </div>
        <nav id="workspace-navigation" className={menuOpen ? "workspace-navigation is-open" : "workspace-navigation"} aria-label="Navegación principal">
          {menu.map(([label, path]) => <NavLink key={path} to={path} end>{label}</NavLink>)}
          <button className="logout-button" type="button" disabled={signingOut} onClick={() => void closeSession()}>{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</button>
        </nav>
      </aside>
      <main id="contenido" className="content workspace-main" tabIndex={-1}>
        <div className="workspace-inner">
          <header className="workspace-header">
            <div>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            <div className="workspace-tools">
              <NotificationCenter />
              <div className="profile-chip"><span className="profile-avatar" aria-hidden="true">{initials}</span><span>{user.nombre}</span></div>
            </div>
          </header>
          {USE_MOCK && <p className="demo-banner">Modo demostración. Los cambios se reinician al recargar la página.</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

Layout.propTypes = { title: PropTypes.string.isRequired, description: PropTypes.string, children: PropTypes.node };
