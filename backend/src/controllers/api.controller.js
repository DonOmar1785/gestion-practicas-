import { AppError } from "../utils/app-error.js";

export function createApiController(services) {
  return {
    async me(req, res) {
      res.json({
        id: req.actor.id_usuario,
        name: req.actor.nombre_completo,
        email: req.actor.correo,
        role: req.actor.role,
        semester: req.actor.semestre,
      });
    },

    async listUsers(_req, res) {
      res.json({ data: await services.users.list() });
    },

    async createUser(req, res) {
      res.status(201).json({ data: await services.users.create(req.body) });
    },

    async updateUser(req, res) {
      res.json({ data: await services.users.update(req.params.id, req.body) });
    },

    async deleteUser(req, res) {
      res.json({ data: await services.users.remove(req.params.id, req.actor) });
    },

    async listResource(resource, _req, res) {
      res.json({ data: await services.catalog.list(resource) });
    },

    async createResource(resource, req, res) {
      res.status(201).json({ data: await services.catalog.create(resource, req.body) });
    },

    async updateResource(resource, req, res) {
      res.json({
        data: await services.catalog.update(resource, req.params.id, req.body),
      });
    },

    async deleteResource(resource, req, res) {
      res.json({
        data: await services.catalog.remove(resource, req.params.id),
      });
    },

    async listAssignments(req, res) {
      res.json({ data: await services.assignments.listFor(req.actor) });
    },

    async createAssignment(req, res) {
      res.status(201).json({ data: await services.assignments.create(req.body) });
    },

    async listSessions(req, res) {
      res.json({ data: await services.sessions.list(req.actor) });
    },

    async createSession(req, res) {
      res.status(201).json({ data: await services.sessions.create(req.body, req.actor) });
    },

    async updateSessionState(req, res) {
      res.json({
        data: await services.sessions.setState(req.params.id, req.body),
      });
    },

    async saveQuestions(req, res) {
      res.json({
        data: await services.sessions.saveQuestions(req.params.id, req.body),
      });
    },

    async importQuestions(req, res) {
      res.json({
        data: await services.questionImport(req.file, req.params.id),
      });
    },

    async listLogbooks(req, res) {
      res.json({ data: await services.logbooks.list(req.actor) });
    },

    async createLogbook(req, res) {
      res.status(201).json({ data: await services.logbooks.create(req.body, req.actor) });
    },

    async evaluateLogbook(req, res, role) {
      res.json({
        data: await services.logbooks.evaluate(
          req.params.id,
          req.body,
          req.actor,
          role,
        ),
      });
    },

    async reviewLogbook(req, res) {
      res.json({
        data: await services.logbooks.review(req.params.id, req.body, req.actor),
      });
    },

    async listDocuments(req, res) {
      res.json({ data: await services.documents.list(req.actor) });
    },

    async createDocument(req, res) {
      res.status(201).json({ data: await services.documents.create(req.body, req.actor) });
    },

    async updateDocumentState(req, res) {
      res.json({
        data: await services.documents.setState(req.params.id, req.body, req.actor),
      });
    },

    async listTemplates(req, res) {
      res.json({ data: await services.templates.list(req.actor) });
    },

    async createTemplate(req, res) {
      res.status(201).json({ data: await services.templates.create(req.body, req.actor) });
    },

    async updateTemplate(req, res) {
      res.json({
        data: await services.templates.update(req.params.id, req.body, req.actor),
      });
    },

    async reportSummary(_req, res) {
      res.json({ data: await services.reports.summary() });
    },

    async listAudit(_req, res) {
      res.json({ data: await services.audit.list() });
    },

    async firebaseConfig(_req, res) {
      const config = {
        apiKey: process.env.FIREBASE_WEB_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      };
      if (
        !config.apiKey ||
        !config.authDomain ||
        !config.projectId ||
        !config.storageBucket ||
        !config.messagingSenderId ||
        !config.appId
      ) {
        throw new AppError(503, "La configuración web de Firebase no está completa.");
      }
      res.set("Cache-Control", "public, max-age=300").json(config);
    },
  };
}
