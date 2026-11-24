import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { hoursProgress } from "../utils/dashboard.js";
import { evaluationFor } from "../utils/workflow.js";

const NEXT = {
  director: [
    ["Asignar prácticas", "Selecciona un grupo y asigna institución, tutor y asesor.", "/gestion-practicas"],
    ["Revisar entregas", "Consulta las bitácoras y documentos pendientes de decisión.", "/seguimiento"],
    ["Preparar un formulario", "Configura las preguntas que responderán los estudiantes.", "/formulario"],
  ],
  docente: [
    ["Revisar bitácoras y documentos", "Lee las entregas y registra tu decisión.", "/revision"],
    ["Evaluar bitácoras", "Asigna una calificación y deja observaciones.", "/observaciones"],
    ["Preparar un formulario", "Configura las preguntas para una visita.", "/formulario"],
  ],
  asesor: [
    ["Evaluar bitácoras", "Consulta las actividades y califica a tus estudiantes asignados.", "/seguimiento-estudiantes"],
    ["Consultar horas", "Revisa el avance de cada estudiante frente a sus horas requeridas.", "/horas-reportes"],
  ],
  estudiante: [
    ["Registrar una bitácora", "Describe lo que hiciste en tu visita y adjunta evidencias con un enlace.", "/bitacora"],
    ["Entregar un documento", "Envía tu plan de trabajo, informe u otro documento.", "/documentos"],
    ["Consultar mi práctica", "Revisa tu institución, tus responsables y las fechas.", "/mi-practica"],
  ],
};

export default function RoleHome({ data, user }) {
  const { rol: role } = user;
  const practices = data.practices || [];
  const logbooks = data.logbooks || [];
  const documents = data.documents || [];
  const hours = hoursProgress(practices);
  const pendingLogbooks = logbooks.filter((entry) => entry.estado === "Pendiente").length;
  const pendingDocuments = documents.filter((entry) => entry.estado === "Pendiente").length;
  const corrections = logbooks.filter((entry) => entry.estado === "Corrección").length + documents.filter((entry) => entry.estado === "Corrección").length;
  const metrics = {
    director: [["Prácticas activas", practices.filter((item) => item.estado_practica === "Activa").length], ["Bitácoras por revisar", pendingLogbooks], ["Documentos por revisar", pendingDocuments]],
    docente: [["Prácticas asignadas", practices.length], ["Bitácoras por revisar", pendingLogbooks], ["Documentos por revisar", pendingDocuments]],
    asesor: [["Prácticas asignadas", practices.length], ["Bitácoras por evaluar", logbooks.filter((entry) => !evaluationFor(entry, role)).length]],
    estudiante: [["Horas de práctica", practices.length ? `${hours.done} / ${hours.required}` : "Sin asignar"], ["Entregas en revisión", pendingLogbooks + pendingDocuments], ["Correcciones solicitadas", corrections]],
  }[role];

  const firstName = user.nombre?.trim().split(/\s+/)[0];
  const correctionLink = logbooks.some((entry) => entry.estado === "Corrección") ? "/bitacora?vista=history" : "/documentos?vista=history";
  return (
    <>
      <section className="home-intro">
        <h2>{firstName ? `Hola, ${firstName}` : "Bienvenido a tu espacio de práctica"}</h2>
        {role === "estudiante" && corrections > 0 ? (
          <Link to={correctionLink}>Ver la retroalimentación de tus entregas →</Link>
        ) : role === "estudiante" && practices.length === 0 ? (
          <p>Tus actividades estarán disponibles cuando te asignen una práctica.</p>
        ) : (
          <p>{{
            estudiante: "Registra tus visitas, entrega tus trabajos y revisa el avance de tu práctica.",
            director: "Organiza las asignaciones y consulta qué entregas requieren atención.",
            docente: "Revisa las entregas de tus estudiantes y registra tus evaluaciones.",
            asesor: "Acompaña el avance de tus estudiantes y registra tus observaciones.",
          }[role]}</p>
        )}
      </section>
      <div className="overview-metrics">
        {metrics.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <section className="home-actions">
        <h2>Tareas frecuentes</h2>
        <div className="task-grid">
          {NEXT[role].map(([title, text, to]) => (
            <Link key={to} to={to} className="task-card">
              <strong>{title}<span aria-hidden="true">↗</span></strong>
              <span>{text}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

RoleHome.propTypes = {
  data: PropTypes.object.isRequired,
  user: PropTypes.shape({ rol: PropTypes.string.isRequired, nombre: PropTypes.string }).isRequired,
};
