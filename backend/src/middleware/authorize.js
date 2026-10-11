import { AppError } from "../utils/app-error.js";

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.actor || !allowedRoles.includes(req.actor.role)) {
      return next(new AppError(403, "No tienes permiso para realizar esta acción."));
    }
    return next();
  };
}
