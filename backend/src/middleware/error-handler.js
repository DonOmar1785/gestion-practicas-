export function errorHandler(error, _req, res, _next) {
  const uploadErrorStatus =
    error.code === "LIMIT_FILE_SIZE" ? 413 : error.code === "LIMIT_UNEXPECTED_FILE" ? 400 : null;
  const status = Number.isInteger(error.status) ? error.status : uploadErrorStatus ?? 500;
  if (status >= 500) {
    console.error("Error de API:", error);
  }

  res.status(status).json({
    error: status >= 500 ? "Error interno del servidor." : error.message || "Archivo no válido.",
  });
}
