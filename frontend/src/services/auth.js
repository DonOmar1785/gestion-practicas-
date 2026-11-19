import { USE_MOCK } from "../config/env.js";
import * as firebaseAuth from "./firebaseAuth.js";
import * as mockAuth from "./mockAuth.js";

// Un solo punto de acceso a la autenticación: Firebase real o sesión simulada.
const impl = USE_MOCK ? mockAuth : firebaseAuth;

export const onAuthChange = impl.onAuthChange;
export const signIn = impl.signIn;
export const signOutUser = impl.signOutUser;
export const requestPasswordReset = impl.requestPasswordReset;
export const getIdToken = impl.getIdToken;
