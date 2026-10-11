import { DOMParser } from "@xmldom/xmldom";
import { TextWriter, Uint8ArrayReader, ZipReader } from "@zip.js/zip.js";
import { AppError } from "../utils/app-error.js";

async function parseDocxQuestions(file) {
  if (!file?.buffer) throw new AppError(400, "Debes adjuntar el archivo en el campo «archivo».");

  let zipReader;
  let xml;
  try {
    zipReader = new ZipReader(new Uint8ArrayReader(new Uint8Array(file.buffer)));
    const entries = await zipReader.getEntries();
    const document = entries.find((entry) => entry.filename === "word/document.xml");
    if (!document) {
      throw new AppError(400, "El archivo no contiene el documento Word principal.");
    }
    if (document.uncompressedSize > 5 * 1024 * 1024) {
      throw new AppError(413, "El documento Word excede el tamaño descomprimido permitido.");
    }
    xml = await document.getData(new TextWriter());
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "No se pudo leer el documento Word. Verifica que el .docx sea válido.");
  } finally {
    await zipReader?.close();
  }

  if (/<!DOCTYPE/i.test(xml)) {
    throw new AppError(400, "El documento Word no puede incluir definiciones XML externas.");
  }

  let document;
  let parseError = null;
  document = new DOMParser({
    onError(level, message) {
      if (level === "error" || level === "fatalError") parseError = message;
    },
  }).parseFromString(xml, "application/xml");
  if (parseError || !document.documentElement) {
    throw new AppError(400, "El documento Word contiene XML no válido.");
  }

  const paragraphs = Array.from(
    document.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "p",
    ),
  )
    .map((paragraph) =>
      Array.from(
        paragraph.getElementsByTagNameNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "t",
        ),
      )
        .map((text) => text.textContent)
        .join("")
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
        .trim(),
    )
    .filter(Boolean);

  if (!paragraphs.length) {
    throw new AppError(400, "El documento no contiene preguntas en párrafos independientes.");
  }

  return paragraphs.map((texto, orden) => ({
    texto,
    tipo: "texto",
    obligatoria: true,
    opciones: [],
    orden,
    activa: true,
  }));
}

export function createQuestionImportService(supabase) {
  return async function importDocxQuestions(file, sessionId) {
    const id = Number(sessionId);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, "Identificador de sesión inválido.");
    }
    const { data, error } = await supabase
      .from("sesion_bitacora")
      .select("id_sesion")
      .eq("id_sesion", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data) throw new AppError(404, "No se encontró la sesión de bitácora.");
    return parseDocxQuestions(file);
  };
}

export { parseDocxQuestions as importDocxQuestions };
