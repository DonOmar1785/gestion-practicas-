import PropTypes from "prop-types";
import {
  arlStatus,
  buildAlerts,
  buildBadges,
  countByState,
  formatDate,
  hoursProgress,
  levelFor,
  studentNotifications,
  uniqueCount,
} from "../utils/dashboard.js";
import { display } from "../utils/format.js";
import ActionCards from "./ActionCards.jsx";
import AlertsPanel from "./AlertsPanel.jsx";
import DataTable from "./DataTable.jsx";
import LevelCard from "./LevelCard.jsx";
import ProgressCard from "./ProgressCard.jsx";
import QuickLinks from "./QuickLinks.jsx";
import Section from "./Section.jsx";
import StatCards from "./StatCards.jsx";

const list = (value) => (Array.isArray(value) ? value : []);
const countRole = (users, role) => list(users).filter((user) => String(user.rol).toLowerCase() === role).length;
const personName = (person) => person?.usuario?.nombre_completo ?? "—";

function StudentWidgets({ data }) {
  const practices = list(data.practices);
  const logbooks = list(data.logbooks);
  const documents = list(data.documents);
  const practice = practices[0];
  const progress = hoursProgress(practices);
  const level = levelFor(progress.percent, progress.done, progress.required);

  return (
    <>
      <StatCards
        items={[
          { label: "Mi práctica", value: practice ? `Semestre ${practice.semestre}` : "Sin práctica" },
          { label: "Institución", value: practice?.institucion?.nombre_institucion ?? "—" },
          { label: "Bitácoras", value: logbooks.length },
          { label: "Documentos", value: documents.length },
        ]}
      />
      <AlertsPanel
        title="Mis notificaciones"
        items={studentNotifications(logbooks, documents)}
        emptyText="No tienes notificaciones nuevas."
      />
      <ProgressCard {...progress} />
      <LevelCard level={level} badges={buildBadges({ percent: progress.percent, logbooks, documents })} />
      <QuickLinks
        links={[
          ["Consultar mi práctica", "/mi-practica"],
          ["Registrar bitácora", "/bitacora"],
          ["Gestionar documentos", "/documentos"],
          ["Mis reportes", "/reportes-estudiante"],
        ]}
      />
    </>
  );
}

function MyPracticeWidgets({ data }) {
  const practice = list(data.practices)[0];
  return (
    <StatCards
      items={[
        { label: "Institución", value: practice?.institucion?.nombre_institucion ?? "—" },
        { label: "Tutor", value: personName(practice?.tutor) },
        { label: "Asesor", value: personName(practice?.asesor) },
        { label: "Estado de la práctica", value: display(practice?.estado_practica) },
      ]}
    />
  );
}

function DirectorWidgets({ data }) {
  const alerts = buildAlerts({
    logbooks: data.logbooks,
    documents: data.documents,
    practices: data.practices,
  });
  return (
    <>
      <AlertsPanel title="Alertas del Sistema" items={alerts} emptyText="No hay alertas pendientes." />
      <StatCards
        items={[
          { label: "Estudiantes", value: countRole(data.users, "estudiante") },
          { label: "Docentes", value: countRole(data.users, "tutor") },
          { label: "Asesores", value: countRole(data.users, "asesor") },
          { label: "Prácticas Activas", value: countByState(data.practices, "estado_practica", "Activa") },
        ]}
      />
      <QuickLinks
        links={[
          ["Gestión académica", "/gestion-academica"],
          ["Gestión de prácticas", "/gestion-practicas"],
          ["Seguimiento", "/seguimiento"],
          ["Reportes", "/reportes"],
          ["Auditoría", "/auditoria"],
        ]}
      />
    </>
  );
}

function TutorWidgets({ data }) {
  const practices = list(data.practices);
  const logbooks = list(data.logbooks);
  const documents = list(data.documents);
  const pending = countByState(logbooks, "estado", "Pendiente");
  const approved = countByState(logbooks, "estado", "Aprobada");
  const pendingDocuments = countByState(documents, "estado", "Pendiente");

  // Estudiantes asignados que aún no tienen ninguna retroalimentación del tutor.
  const withFeedback = new Set(
    logbooks.filter((item) => item.retroalimentacion_tutor).map((item) => item.id_practica),
  );
  const withoutFeedback = practices.filter((item) => !withFeedback.has(item.id_practica)).length;

  const tasks = [];
  if (pending) tasks.push(`Revisar ${pending} ${pending === 1 ? "bitácora pendiente" : "bitácoras pendientes"}.`);
  if (pendingDocuments) tasks.push(`Aprobar ${pendingDocuments} ${pendingDocuments === 1 ? "documento" : "documentos"}.`);

  const arlRows = practices.map((item) => ({
    Estudiante: personName(item.estudiante),
    "Horas ejecutadas": item.horas_acumuladas ?? 0,
    "ARL vence": formatDate(item.fecha_vencimiento_arl),
    "Estado ARL": arlStatus(item.fecha_vencimiento_arl),
    Práctica: `Práctica ${item.semestre}`,
  }));

  return (
    <>
      <ActionCards
        items={[
          { label: "Bitácoras Pendientes", value: pending, tone: "alerta" },
          { label: "Estudiantes sin observación", value: withoutFeedback, tone: "advertencia" },
          { label: "Bitácoras Aprobadas", value: approved, tone: "correcto" },
        ]}
      />
      <StatCards
        items={[
          { label: "Estudiantes", value: uniqueCount(practices, (item) => item.id_estudiante) },
          { label: "Prácticas Activas", value: practices.filter((item) => /activa/i.test(item.estado_practica ?? "")).length },
          { label: "Bitácoras Revisadas", value: logbooks.filter((item) => item.estado !== "Pendiente").length },
          { label: "Observaciones", value: logbooks.filter((item) => item.retroalimentacion_tutor).length },
        ]}
      />
      <div className="dos-columnas">
        <AlertsPanel
          title="🔔 Notificaciones"
          items={buildAlerts({ logbooks, documents })}
          emptyText="No tienes notificaciones nuevas."
        />
        <AlertsPanel title="✅ Mis tareas pendientes" items={tasks} emptyText="No tienes tareas pendientes." />
      </div>
      <Section title="Monitoreo de horas y seguro ARL">
        <DataTable rows={arlRows} />
      </Section>
    </>
  );
}

function AdvisorWidgets({ data }) {
  const logbooks = list(data.logbooks);
  const pendingHours = logbooks
    .filter((item) => item.estado === "Pendiente")
    .reduce((total, item) => total + (Number(item.horas_realizadas) || 0), 0);
  const evaluated = logbooks.filter((item) => item.calificacion_asesor !== null && item.calificacion_asesor !== undefined).length;

  return (
    <StatCards
      items={[
        { label: "Practicantes en mi aula", value: uniqueCount(data.practices, (item) => item.id_estudiante) },
        { label: "Horas por validar", value: Math.round(pendingHours * 10) / 10 },
        { label: "Sin evaluar", value: logbooks.length - evaluated },
        { label: "Evaluaciones hechas", value: evaluated },
      ]}
    />
  );
}

function AcademicWidgets({ data }) {
  return (
    <StatCards
      items={[
        { label: "Usuarios", value: list(data.users).length },
        { label: "Programas", value: list(data.programs).length },
        { label: "Instituciones", value: list(data.institutions).length },
        { label: "Docentes", value: countRole(data.users, "tutor") },
      ]}
    />
  );
}

function PracticeWidgets({ data }) {
  return (
    <StatCards
      items={[
        { label: "Prácticas Activas", value: countByState(data.practices, "estado_practica", "Activa") },
        { label: "Instituciones", value: list(data.institutions).length },
        { label: "Docentes Tutores", value: countRole(data.users, "tutor") },
        { label: "Estudiantes con práctica", value: uniqueCount(data.practices, (item) => item.id_estudiante) },
      ]}
    />
  );
}

function TrackingWidgets({ data }) {
  const logbooks = list(data.logbooks);
  const alerts = buildAlerts({ logbooks, documents: data.documents });
  const withoutAdvisorGrade = logbooks.filter(
    (item) => item.calificacion_asesor === null || item.calificacion_asesor === undefined,
  ).length;
  return (
    <>
      <StatCards
        items={[
          { label: "Alertas", value: alerts.length },
          { label: "Bitácoras Pendientes", value: countByState(logbooks, "estado", "Pendiente") },
          { label: "Evaluaciones Pendientes", value: withoutAdvisorGrade },
          { label: "Prácticas Activas", value: list(data.practices).length },
        ]}
      />
      <AlertsPanel title="Alertas del Sistema" items={alerts} emptyText="No hay alertas pendientes." />
    </>
  );
}

function ReportWidgets({ data }) {
  const summary = data["reports/summary"] ?? {};
  return (
    <StatCards
      items={[
        { label: "Estudiantes", value: summary.estudiantes ?? 0 },
        { label: "Prácticas", value: summary.practicas ?? 0 },
        { label: "Bitácoras", value: summary.bitacoras ?? 0 },
        { label: "Instituciones", value: summary.instituciones ?? 0 },
      ]}
    />
  );
}

function AuditWidgets({ data }) {
  const events = list(data.audit);
  return (
    <StatCards
      items={[
        { label: "Registros", value: events.length },
        { label: "Entidades distintas", value: uniqueCount(events, (item) => item.entidad) },
        { label: "Último registro", value: formatDate(events[0]?.creado_en) },
      ]}
    />
  );
}

const WIDGETS = {
  estudiante: StudentWidgets,
  "mi-practica": MyPracticeWidgets,
  director: DirectorWidgets,
  docente: TutorWidgets,
  asesor: AdvisorWidgets,
  "gestion-academica": AcademicWidgets,
  "gestion-practicas": PracticeWidgets,
  seguimiento: TrackingWidgets,
  reportes: ReportWidgets,
  auditoria: AuditWidgets,
};

// Tarjetas, barras y paneles que van arriba de cada pantalla.
export default function PageWidgets({ pageKey, data }) {
  const Widgets = WIDGETS[pageKey];
  return Widgets ? <Widgets data={data} /> : null;
}

PageWidgets.propTypes = {
  pageKey: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
};

const widgetProps = { data: PropTypes.object.isRequired };
for (const Component of [
  StudentWidgets, MyPracticeWidgets, DirectorWidgets, TutorWidgets, AdvisorWidgets,
  AcademicWidgets, PracticeWidgets, TrackingWidgets, ReportWidgets, AuditWidgets,
]) {
  Component.propTypes = widgetProps;
}
