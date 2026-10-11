import multer from "multer";
import { AppError } from "../utils/app-error.js";

export const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    const isDocx =
      file.originalname.toLowerCase().endsWith(".docx") &&
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDocx) {
      callback(new AppError(400, "Adjunta un archivo Word .docx válido."));
      return;
    }
    callback(null, true);
  },
});
