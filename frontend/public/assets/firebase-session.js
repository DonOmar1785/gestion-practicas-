import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const LOGIN_PAGE = "/01-login.html";
const HOME_BY_ROLE = {
  director: "/12-director.html",
  tutor: "/06-docente.html",
  asesor: "/09-asesor.html",
  estudiante: "/02-estudiante.html",
};

async function requestProfile(user) {
  const token = await user.getIdToken();
  const response = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "No se pudo validar el perfil.");
  return body;
}

function subscribeToDataChanges(auth) {
  const controller = new AbortController();
  window.addEventListener("beforeunload", () => controller.abort(), { once: true });

  async function connect() {
    while (!controller.signal.aborted) {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch("/api/events", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(`No se pudo abrir la conexión de actualizaciones (${response.status}).`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";
          for (const message of messages) {
            const event = message.match(/^event: (.+)$/m)?.[1];
            const data = message.match(/^data: (.+)$/m)?.[1];
            if (event === "data-change" && data) {
              window.dispatchEvent(new CustomEvent("gp:data-change", { detail: JSON.parse(data) }));
            }
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Se perdió la conexión de actualizaciones en vivo:", error);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  connect();
}

async function protectCurrentPage() {
  const configResponse = await fetch("/api/config/firebase");
  const config = await configResponse.json();
  if (!configResponse.ok) throw new Error(config.error || "No se pudo cargar Firebase.");

  const auth = getAuth(initializeApp(config));
  window.firebaseAuth = auth;
  const user = await new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        unsubscribe();
        resolve(currentUser);
      },
      reject,
    );
  });
  if (!user) {
    window.location.replace(LOGIN_PAGE);
    return null;
  }

  const profile = await requestProfile(user);
  const uiRole = profile.role === "tutor" ? "docente" : profile.role;
  const allowedRoles = (document.body.dataset.rol || "").split(/\s+/);
  if (!allowedRoles.includes(uiRole)) {
    window.location.replace(HOME_BY_ROLE[profile.role] || LOGIN_PAGE);
    return null;
  }

  window.authenticatedUser = {
    id: String(profile.id),
    nombre: profile.name,
    rol: uiRole,
    correo: profile.email,
    semestre: profile.semester,
    activo: true,
  };
  subscribeToDataChanges(auth);
  window.logoutFirebase = async () => {
    await signOut(auth);
    window.location.replace(LOGIN_PAGE);
  };
  window.apiRequest = async (path, options = {}) => {
    const token = await auth.currentUser.getIdToken();
    const apiPath = path.startsWith("/api/")
      ? path
      : `/api/${path.replace(/^\/+/, "")}`;
    const response = await fetch(apiPath, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "La solicitud no pudo completarse.");
    return body.data ?? body;
  };
  return window.authenticatedUser;
}

window.authSessionReady = protectCurrentPage().catch((error) => {
  console.error("No se pudo validar la sesión:", error);
  window.location.replace(LOGIN_PAGE);
  return null;
});
