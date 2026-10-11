import { Router } from "express";
import { authorize } from "../middleware/authorize.js";
import { auditMutations } from "../middleware/audit-mutations.js";
import { asyncHandler } from "../utils/async-handler.js";
import { MANAGER_ROLES } from "../utils/roles.js";
import { createApiController } from "../controllers/api.controller.js";
import { uploadDocx } from "../middleware/upload-docx.js";

const CATALOGS = ["programs", "cycles", "institutions", "practices"];

export function createApiRouter({ authenticate, services, realtime }) {
  const router = Router();
  const controller = createApiController(services);
  router.get("/config/firebase", asyncHandler(controller.firebaseConfig));
  router.use(authenticate);
  router.use(auditMutations(services.audit, realtime));

  router.get("/events", (req, res) => {
    res.status(200).set({
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("event: connected\ndata: {}\n\n");

    const unsubscribe = realtime.subscribe((change) => {
      res.write(`event: data-change\ndata: ${JSON.stringify(change)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 15000);

    res.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  router.get("/me", asyncHandler(controller.me));
  router.get("/users", authorize(...MANAGER_ROLES), asyncHandler(controller.listUsers));
  router.post("/users", authorize(...MANAGER_ROLES), asyncHandler(controller.createUser));

  for (const resource of CATALOGS) {
    router.get(
      `/${resource}`,
      authorize(...MANAGER_ROLES),
      asyncHandler((req, res) => controller.listResource(resource, req, res)),
    );
    router.post(
      `/${resource}`,
      authorize(...MANAGER_ROLES),
      asyncHandler((req, res) => controller.createResource(resource, req, res)),
    );
    router.put(
      `/${resource}/:id`,
      authorize(...MANAGER_ROLES),
      asyncHandler((req, res) => controller.updateResource(resource, req, res)),
    );
  }

  router.get("/assignments", asyncHandler(controller.listAssignments));
  router.post(
    "/assignments",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.createAssignment),
  );

  router.get("/sessions", asyncHandler(controller.listSessions));
  router.post(
    "/sessions",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.createSession),
  );
  router.patch(
    "/sessions/:id/state",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.updateSessionState),
  );
  router.put(
    "/sessions/:id/questions",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.saveQuestions),
  );
  router.post(
    "/sessions/:id/questions/import",
    authorize(...MANAGER_ROLES),
    uploadDocx.single("archivo"),
    asyncHandler(controller.importQuestions),
  );

  router.get("/logbooks", asyncHandler(controller.listLogbooks));
  router.post(
    "/logbooks",
    authorize("estudiante"),
    asyncHandler(controller.createLogbook),
  );
  router.post(
    "/logbooks/:id/evaluations/advisor",
    authorize("asesor", ...MANAGER_ROLES),
    asyncHandler((req, res) => controller.evaluateLogbook(req, res, "asesor")),
  );
  router.post(
    "/logbooks/:id/evaluations/tutor",
    authorize(...MANAGER_ROLES),
    asyncHandler((req, res) => controller.evaluateLogbook(req, res, "tutor")),
  );
  router.patch(
    "/logbooks/:id/review",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.reviewLogbook),
  );

  router.get("/documents", asyncHandler(controller.listDocuments));
  router.post(
    "/documents",
    authorize("estudiante", ...MANAGER_ROLES),
    asyncHandler(controller.createDocument),
  );
  router.patch(
    "/documents/:id/state",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.updateDocumentState),
  );
  router.get(
    "/templates",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.listTemplates),
  );
  router.post(
    "/templates",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.createTemplate),
  );
  router.put(
    "/templates/:id",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.updateTemplate),
  );
  router.get(
    "/reports/summary",
    authorize(...MANAGER_ROLES),
    asyncHandler(controller.reportSummary),
  );
  router.get("/audit", authorize(...MANAGER_ROLES), asyncHandler(controller.listAudit));

  return router;
}
