// Construye la API Express con autenticación, servicios y archivos estáticos del frontend.

import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createAuthenticate } from "./middleware/authenticate.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createApiRouter } from "./routes/api.routes.js";
import { createAuditService } from "./services/audit.service.js";
import { createCatalogService } from "./services/catalog.service.js";
import { createDocumentService } from "./services/document.service.js";
import { createLogbookService } from "./services/logbook.service.js";
import { createNotificationService } from "./services/notification.service.js";
import { createPracticeService } from "./services/practice.service.js";
import { createReportService } from "./services/report.service.js";
import { createQuestionImportService } from "./services/question-import.service.js";
import { createSessionService } from "./services/session.service.js";
import { createTemplateService } from "./services/template.service.js";
import { createUserService } from "./services/user.service.js";
import { AppError } from "./utils/app-error.js";
import { createRealtimeHub } from "./utils/realtime.js";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const staticRoot = path.join(projectRoot, "frontend", "dist");

// Construye la aplicación con rutas, seguridad y servicios compartidos.
export function createApp({
  supabase,
  firebaseAuth,
  firebaseFirestore,
  firebaseMessaging,
  realtime = createRealtimeHub(),
}) {
  const app = express();
  const users = createUserService({ supabase, firebaseAuth });
  const practices = createPracticeService(supabase);
  const notifications = firebaseFirestore && firebaseMessaging
    ? createNotificationService({ supabase, firestore: firebaseFirestore, messaging: firebaseMessaging })
    : null;
  const services = {
    users,
    audit: createAuditService(supabase),
    catalog: createCatalogService(supabase),
    practices,
    sessions: createSessionService({ supabase, practiceService: practices }),
    logbooks: createLogbookService({ supabase, practiceService: practices, notifications }),
    documents: createDocumentService({ supabase, practiceService: practices, notifications }),
    notifications,
    reports: createReportService(supabase),
    questionImport: createQuestionImportService(supabase),
    templates: createTemplateService(supabase),
  };

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginOpenerPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://www.gstatic.com"],
          connectSrc: [
            "'self'",
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
            "https://www.googleapis.com",
            "https://firebaseinstallations.googleapis.com",
            "https://fcmregistrations.googleapis.com",
            "https://fcm.googleapis.com",
          ],
          frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.web.app"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get(
    "/api/health",
    async (req, res, next) => {
      try {
        const { error } = await supabase.from("usuario").select("id_usuario").limit(1);
        if (error) throw error;
        res.json({ status: "ok", services: { supabase: "connected" } });
      } catch (error) {
        next(new AppError(503, "No se pudo verificar la conexión con Supabase."));
      }
    },
  );

  app.use(
    "/api",
    createApiRouter({
      authenticate: createAuthenticate({ firebaseAuth, userService: users }),
      services,
      realtime,
    }),
  );
  app.use("/api", (_req, _res, next) => next(new AppError(404, "Ruta de API no encontrada.")));
  app.use(express.static(staticRoot));
  app.get(/.*/, (_req, res, next) => {
    res.sendFile(path.join(staticRoot, "index.html"), (error) => {
      if (error) next(new AppError(503, "El frontend no está compilado. Ejecuta npm run build en frontend."));
    });
  });
  app.use(errorHandler);

  return app;
}
