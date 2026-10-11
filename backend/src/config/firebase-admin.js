import { readFileSync } from "node:fs";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function parseServiceAccount(json, source) {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(json);
  } catch {
    throw new Error(`${source} debe contener un JSON válido de Firebase.`);
  }
  if (!serviceAccount || typeof serviceAccount !== "object" || Array.isArray(serviceAccount)) {
    throw new Error(`${source} debe contener un objeto JSON de Firebase.`);
  }
  return cert(serviceAccount);
}

function serviceAccountCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountJson) {
    return parseServiceAccount(serviceAccountJson, "FIREBASE_SERVICE_ACCOUNT");
  }

  if (credentialsPath) {
    let serviceAccountJsonFromFile;
    try {
      serviceAccountJsonFromFile = readFileSync(credentialsPath, "utf8");
    } catch {
      throw new Error("No se pudo leer el archivo indicado por GOOGLE_APPLICATION_CREDENTIALS.");
    }
    return parseServiceAccount(serviceAccountJsonFromFile, "El archivo de GOOGLE_APPLICATION_CREDENTIALS");
  }

  return applicationDefault();
}

export function createFirebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID no está configurado.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: serviceAccountCredential(),
      projectId,
    });

  return getAuth(app);
}
