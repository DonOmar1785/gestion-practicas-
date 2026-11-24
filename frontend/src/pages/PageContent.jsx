import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import DeliveryList from "../components/DeliveryList.jsx";
import ManagedRecords from "../components/ManagedRecords.jsx";
import LevelCard from "../components/LevelCard.jsx";
import PracticeList from "../components/PracticeList.jsx";
import RoleHome from "../components/RoleHome.jsx";
import SemesterGuide from "../components/SemesterGuide.jsx";
import { Facts, RecordList, Views } from "../components/WorkArea.jsx";
import AcademicForms from "../components/forms/AcademicForms.jsx";
import DocumentForm from "../components/forms/DocumentForm.jsx";
import LogbookForm from "../components/forms/LogbookForm.jsx";
import { CycleForm, PracticeForm } from "../components/forms/PracticeForms.jsx";
import SessionActions from "../components/forms/SessionActions.jsx";
import SessionForm from "../components/forms/SessionForm.jsx";
import TemplateForms from "../components/forms/TemplateForms.jsx";
import { display } from "../utils/format.js";
import { arlStatus, buildBadges, formatDate, hoursProgress, levelFor } from "../utils/dashboard.js";
import { evaluationFor } from "../utils/workflow.js";

const REPORT_LABELS = {
  estudiantes: "Estudiantes", practicas: "Prácticas", bitacoras: "Bitácoras", documentos: "Documentos", instituciones: "Instituciones",
};

export default function PageContent({ pageKey, data, user, onChanged }) {
  const [params] = useSearchParams();
  const role = user.rol;
  const { practices = [], logbooks = [], documents = [], templates = [], cycles = [], programs = [], sessions = [], audit = [] } = data;
  const show = (entries, mode) => <DeliveryList entries={entries} practices={practices} templates={templates} mode={mode} role={role} onSaved={onChanged} />;

  switch (pageKey) {
    case "director":
    case "estudiante":
    case "docente":
    case "asesor":
      return <RoleHome user={user} data={data} />;
    case "gestion-academica":
      return <AcademicForms data={data} onChanged={onChanged} />;
    case "gestion-practicas":
      return <Views choices={[
        { id: "assign", title: "Asignar prácticas", content: <PracticeForm data={data} onSaved={onChanged} /> },
        { id: "existing", title: "Prácticas asignadas", content: <ManagedRecords rows={practices} resource="practices" onChanged={onChanged} /> },
        { id: "cycles", title: "Ciclos académicos", content: <>
          <CycleForm actorId={Number(user.id)} onSaved={onChanged} />
          <RecordList empty="Aún no hay ciclos académicos." records={cycles.map((cycle) => ({
            id: cycle.id_ciclo, title: cycle.nombre_periodo, status: cycle.estado_ciclo,
            subtitle: [cycle.fecha_inicio, cycle.fecha_fin].filter(Boolean).map(formatDate).join(" · "),
          }))} />
        </> },
      ]} />;
    case "mi-practica":
      return <><PracticeList practices={practices} personal /><SemesterGuide semester={user.semestre} /></>;
    case "bitacora":
      return <Views initial={params.get("vista")} choices={[
        { id: "new", title: "Registrar visita", content: <LogbookForm data={data} onSaved={onChanged} /> },
        { id: "history", title: "Bitácoras enviadas", count: logbooks.length, content: show(logbooks, "logbooks") },
      ]} />;
    case "documentos":
      return <Views initial={params.get("vista")} choices={[
        { id: "new", title: "Entregar documento", content: <DocumentForm practices={practices} onSaved={onChanged} /> },
        { id: "history", title: "Entregas enviadas", count: documents.length, content: show(documents, "documents") },
      ]} />;
    case "seguimiento":
    case "revision": {
      const atRisk = practices.filter((item) => item.modalidad === "Presencial" && ["Vencida", "Por vencer"].includes(arlStatus(item.fecha_vencimiento_arl))).length;
      const pendingLogbooks = logbooks.filter((entry) => entry.estado === "Pendiente");
      const pendingDocuments = documents.filter((entry) => entry.estado === "Pendiente");
      return <Views choices={[
        { id: "logbooks", title: "Bitácoras pendientes", count: pendingLogbooks.length, content: show(pendingLogbooks, "review") },
        { id: "documents", title: "Documentos pendientes", count: pendingDocuments.length, content: show(pendingDocuments, "document-review") },
        { id: "students", title: "Prácticas y ARL", count: atRisk || undefined, content: <PracticeList practices={practices} /> },
        { id: "history", title: "Historial de revisión", content: <Views choices={[
          { id: "logbooks", title: "Bitácoras", content: show(logbooks.filter((entry) => entry.estado !== "Pendiente"), "review") },
          { id: "documents", title: "Documentos", content: show(documents.filter((entry) => entry.estado !== "Pendiente"), "documents") },
        ]} /> },
      ]} />;
    }
    case "observaciones":
    case "seguimiento-estudiantes": {
      const pending = logbooks.filter((entry) => !evaluationFor(entry, role));
      return <Views choices={[
        { id: "pending", title: "Por evaluar", count: pending.length, content: show(pending, "evaluation") },
        { id: "graded", title: "Evaluadas", count: logbooks.length - pending.length, content: show(logbooks.filter((entry) => evaluationFor(entry, role)), "evaluation") },
        ...(role === "docente"
          ? [{ id: "templates", title: "Plantillas", content: <TemplateForms templates={templates} onSaved={onChanged} /> }]
          : [{ id: "students", title: "Estudiantes asignados", content: <PracticeList practices={practices} /> }]),
      ]} />;
    }
    case "formulario":
      return <Views choices={[
        { id: "list", title: "Formularios existentes", content: <SessionActions sessions={sessions} programs={programs} cycles={cycles} onSaved={onChanged} /> },
        { id: "new", title: "Crear formulario", content: <SessionForm programs={programs} cycles={cycles} onSaved={onChanged} /> },
        { id: "copy", title: "Duplicar formulario", content: <SessionForm programs={programs} cycles={cycles} sessions={sessions} duplicate onSaved={onChanged} /> },
      ]} />;
    case "horas-reportes":
      return <PracticeList practices={practices} showHours />;
    case "reportes-estudiante": {
      const { done, required, percent } = hoursProgress(practices);
      return <>
        <PracticeList practices={practices} personal showHours />
        {practices.length > 0 && <details className="record">
          <summary>Ver mis logros de práctica</summary>
          <div className="record-body"><LevelCard level={levelFor(percent, done, required)} badges={buildBadges({ percent, logbooks, documents })} /></div>
        </details>}
      </>;
    }
    case "reportes":
      return <>
        <div className="overview-metrics">
          {Object.entries(data["reports/summary"] ?? {}).map(([key, value]) => <div key={key}><strong>{value}</strong><span>{REPORT_LABELS[key] || key}</span></div>)}
        </div>
        <h2 className="section-heading">Avance por estudiante</h2>
        <PracticeList practices={practices} showHours />
      </>;
    case "auditoria":
      return <RecordList empty="Todavía no hay eventos de auditoría." filterLabel="Buscar por acción, tipo o fecha" records={audit.map((event, index) => ({
        id: event.id_auditoria ?? event.id_evento ?? index,
        title: event.accion || "Evento del software",
        subtitle: [event.entidad, formatDate(event.creado_en)].filter(Boolean).join(" · "),
        content: <Facts items={Object.entries(event).filter(([key]) => !["id_auditoria", "id_evento", "accion", "entidad", "creado_en"].includes(key)).map(([key, value]) => [key.replaceAll("_", " "), display(value)])} />,
      }))} />;
    default:
      return null;
  }
}

PageContent.propTypes = {
  pageKey: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rol: PropTypes.string.isRequired,
    semestre: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onChanged: PropTypes.func.isRequired,
};
