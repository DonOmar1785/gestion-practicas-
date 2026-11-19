import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useForm } from "../hooks/useForm.js";
import { USE_MOCK } from "../config/env.js";
import { ROLE_HOME } from "../config/roles.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../mocks/db.js";

const INITIAL = { correo: "", password: "" };

export default function LoginPage() {
  const { status, user, authError, login, resetPassword } = useAuth();
  const { values, handleChange, setValues } = useForm(INITIAL);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState(null); // { text, type }
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión, se envía al usuario a su panel.
  if (user) return <Navigate to={ROLE_HOME[user.rol] ?? "/"} replace />;

  const shown = message ?? (authError ? { text: authError, type: "error" } : null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    const email = values.correo.trim();
    if (!email || !values.password) {
      setMessage({ text: "Ingresa tu correo y contraseña.", type: "error" });
      return;
    }
    if (!event.currentTarget.elements.correo.validity.valid) {
      setMessage({ text: "Escribe un correo electrónico válido.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const info = await login({ email, password: values.password, remember });
      if (info) setMessage({ text: info, type: "info" });
    } catch (error) {
      setMessage({
        text: error.code?.startsWith("auth/")
          ? "Correo o contraseña incorrectos."
          : error.message || "No fue posible iniciar sesión.",
        type: "error",
      });
    } finally {
      setValues((current) => ({ ...current, password: "" }));
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    const email = values.correo.trim();
    if (!email) {
      setMessage({ text: "Escribe tu correo para enviarte el enlace de recuperación.", type: "info" });
      return;
    }
    try {
      await resetPassword(email);
      setMessage({
        text: "Si el correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.",
        type: "info",
      });
    } catch (error) {
      setMessage({
        text: error.code?.startsWith("auth/")
          ? "No se pudo enviar el correo de recuperación."
          : error.message || "No fue posible solicitar el cambio de contraseña.",
        type: "error",
      });
    }
  };

  return (
    <div className="login-body">
      <div className="login-container">
        <div className="logo-container">
          <div className="logo">GP</div>
        </div>

        <h1>Gestión de Prácticas</h1>
        <p className="login-subtitle">Inicia sesión para continuar</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="correo">Correo institucional</label>
            <input
              type="email"
              id="correo"
              name="correo"
              placeholder="Ingrese su correo"
              autoComplete="username"
              value={values.correo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
              value={values.password}
              onChange={handleChange}
            />
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              Recordarme
            </label>
            <a href="#recuperar" onClick={handleForgotPassword}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {shown && <p className={`mensaje ${shown.type}`}>{shown.text}</p>}

          <button type="submit" className="btn-login" disabled={submitting || status === "loading"}>
            {submitting ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        {USE_MOCK && (
          <div className="demo-accounts">
            <p className="ayuda">
              Modo demostración: datos de prueba, sin servidor. Contraseña de todas las cuentas: {DEMO_PASSWORD}
            </p>
            <div className="fila-simple">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="btn-mini"
                  onClick={() => setValues({ correo: account.email, password: DEMO_PASSWORD })}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="login-footer">
          Sistema de Gestión de Prácticas Académicas
          <br />
        </p>
      </div>
    </div>
  );
}
