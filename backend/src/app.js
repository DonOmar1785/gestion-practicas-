import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createAuthenticate } from "./middleware/authenticate.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createApiRouter } from "./routes/api.routes.js";
import { createAssignmentService } from "./services/assignment.service.js";
import { createAuditService } from "./services/audit.service.js";
import { createCatalogService } from "./services/catalog.service.js";
import { createDocumentService } from "./services/document.service.js";
import { createLogbookService } from "./services/logbook.service.js";
import { createReportService } from "./services/report.service.js";
import { createQuestionImportService } from "./services/question-import.service.js";
import { createSessionService } from "./services/session.service.js";
import { createTemplateService } from "./services/template.service.js";
import { createUserService } from "./services/user.service.js";
import { AppError } from "./utils/app-error.js";
import { createRealtimeHub } from "./utils/realtime.js";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const staticRoot = path.join(projectRoot, "frontend", "public");

export function createApp({ supabase, firebaseAuth, realtime = createRealtimeHub() }) {
  const app = express();
  const users = createUserService({ supabase, firebaseAuth });
  const assignments = createAssignmentService(supabase);
  const services = {
    users,
    audit: createAuditService(supabase),
    catalog: createCatalogService(supabase),
    assignments,
    sessions: createSessionService({ supabase, assignmentService: assignments }),
    logbooks: createLogbookService({ supabase, assignmentService: assignments }),
    documents: createDocumentService({ supabase, assignmentService: assignments }),
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
      methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
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
  app.use("/assets", express.static(path.join(staticRoot, "assets")));
  app.use(express.static(staticRoot, { extensions: ["html"] }));
  app.get("/", (_req, res) => res.sendFile(path.join(staticRoot, "01-login.html")));
  app.use("/api", (_req, _res, next) => next(new AppError(404, "Ruta de API no encontrada.")));
  app.use(errorHandler);

  return app;
}
