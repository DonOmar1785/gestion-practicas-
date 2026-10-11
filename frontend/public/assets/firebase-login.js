import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form = document.getElementById("formLogin");
const message = document.getElementById("mensajeLogin");
const submitButton = form.querySelector('button[type="submit"]');
const emailInput = document.getElementById("correo");
const passwordInput = document.getElementById("password");
let auth;

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `mensaje ${type}`;
  message.hidden = false;
}

function normalizeRole(role) {
  return String(role ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const landingPage = {
  director: "12-director.html",
  tutor: "06-docente.html",
  asesor: "09-asesor.html",
  estudiante: "02-estudiante.html",
  "director de programa": "12-director.html",
  "tutor academico": "06-docente.html",
  "asesor pedagogico": "09-asesor.html",
};

async function loadProfile(user) {
  if (!user.emailVerified) {
    try {
      await sendEmailVerification(user);
      showMessage(
        "Debes verificar que tienes acceso a este correo. Te enviamos un enlace de verificación; confírmalo y vuelve a iniciar sesión.",
        "info",
      );
    } catch (error) {
      console.error("No se pudo enviar el correo de verificación de Firebase:", error);
      showMessage(
        error.code === "auth/too-many-requests"
          ? "Firebase limitó temporalmente los correos de verificación. Espera unos minutos e inténtalo de nuevo."
          : "No se pudo enviar el correo de verificación. Confirma que la dirección sea correcta o contacta al Director.",
      );
    }
    if (auth.currentUser) await signOut(auth);
    return;
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "No se pudo cargar el perfil.");

  const page = landingPage[normalizeRole(body.role)];
  if (!page) throw new Error("El rol de tu cuenta no tiene una página asignada.");
  window.location.replace(`/${page}`);
}

async function initialize() {
  const response = await fetch("/api/config/firebase");
  const config = await response.json();
  if (!response.ok) throw new Error(config.error || "No se pudo cargar Firebase.");

  auth = getAuth(initializeApp(config));
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
  if (user) await loadProfile(user);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showMessage("Ingresa tu correo y contraseña.");
    return;
  }
  if (!emailInput.validity.valid) {
    showMessage("Escribe un correo electrónico válido.");
    emailInput.focus();
    return;
  }

  submitButton.disabled = true;
  try {
    await setPersistence(
      auth,
      document.getElementById("recordar").checked
        ? browserLocalPersistence
        : browserSessionPersistence,
    );
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await loadProfile(credential.user);
  } catch (error) {
    if (auth?.currentUser) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("No se pudo cerrar la sesión Firebase tras el error:", signOutError);
      }
    }
    showMessage(
      error.code?.startsWith("auth/")
        ? "Correo o contraseña incorrectos."
        : error.message || "No fue posible iniciar sesión.",
    );
    passwordInput.value = "";
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("olvidoClave").addEventListener("click", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  if (!email) {
    showMessage("Escribe tu correo para enviarte el enlace de recuperación.", "info");
    emailInput.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Si el correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.", "info");
  } catch (error) {
    showMessage(
      error.code?.startsWith("auth/")
        ? "No se pudo enviar el correo de recuperación."
        : error.message || "No fue posible solicitar el cambio de contraseña.",
    );
  }
});

initialize().catch(async (error) => {
  if (auth?.currentUser) {
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error("No se pudo cerrar la sesión Firebase:", signOutError);
    }
  }
  showMessage(error.message || "No fue posible conectar con Firebase.");
  submitButton.disabled = true;
});
