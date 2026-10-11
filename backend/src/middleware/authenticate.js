import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { normalizeRole } from "../utils/roles.js";

export function createAuthenticate({ firebaseAuth, userService }) {
  return asyncHandler(async (req, _res, next) => {
    const authorization = req.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    if (!token) {
      throw new AppError(401, "Se requiere un token de Firebase.");
    }

    let decodedToken;
    try {
      decodedToken = await firebaseAuth.verifyIdToken(token, true);
    } catch {
      throw new AppError(401, "El token de Firebase no es válido o expiró.");
    }

    const user = await userService.findActiveByFirebaseUid(decodedToken.uid);
    if (!user) {
      throw new AppError(403, "La cuenta no tiene un perfil activo en el sistema.");
    }

    const role = normalizeRole(user.rol);
    if (!role) {
      throw new AppError(403, "El rol de la cuenta no está habilitado.");
    }

    req.actor = { ...user, role };
    next();
  });
}
