// Error HTTP explícito para mantener respuestas consistentes con estado y mensaje.

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
