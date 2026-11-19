// Envuelve handlers async para convertir errores en el flujo estándar de Express.

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
