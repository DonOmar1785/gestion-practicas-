import PropTypes from "prop-types";
import { api } from "../services/api.js";
import { useAction } from "../hooks/useAction.js";
import { formatDate } from "../utils/dashboard.js";
import { evaluationFor, practiceFor, practiceName, studentName } from "../utils/workflow.js";
import FormStatus from "./FormStatus.jsx";
import { ExternalLink, Facts, RecordList } from "./WorkArea.jsx";
import { EvaluationForm, ReviewForm } from "./forms/ReviewActions.jsx";

function DocumentReview({ document, onSaved }) {
  const { run, pending, error } = useAction();
  const decide = (estado) => void run(async () => {
    await api.patch(`/documents/${document.id_documento}/state`, { estado });
    onSaved("Revisión del documento guardada.");
  });
  return (
    <>
      <div className="button-row">
        <button type="button" className="btn-form" disabled={pending} onClick={() => decide("Aprobado")}>Aprobar documento</button>
        <button type="button" className="btn-mini" disabled={pending} onClick={() => decide("Corrección")}>Solicitar corrección</button>
      </div>
      <FormStatus error={error} />
    </>
  );
}

DocumentReview.propTypes = { document: PropTypes.object.isRequired, onSaved: PropTypes.func.isRequired };

export default function DeliveryList({ entries, practices = [], templates = [], mode, role, onSaved }) {
  const isDocument = mode === "documents" || mode === "document-review";
  const personal = role === "estudiante";

  return (
    <RecordList
      empty={isDocument ? "No hay documentos en esta vista." : "No hay bitácoras en esta vista."}
      filterLabel={personal ? "Buscar por fecha, estado o contenido" : "Buscar por estudiante, institución o estado"}
      records={entries.map((entry) => {
        const practice = practiceFor(entry, practices);
        const date = entry.fecha ? formatDate(entry.fecha) : undefined;
        const type = isDocument ? entry.tipo_documento : `Bitácora del ${date ?? "día sin registrar"}`;
        const evaluation = evaluationFor(entry, role);
        const advisor = evaluationFor(entry, "asesor");
        const tutor = evaluationFor(entry, "docente");
        return {
          id: isDocument ? entry.id_documento : entry.id_bitacora,
          title: personal ? type : studentName(practice),
          subtitle: personal ? [practiceName(practice), isDocument && date].filter(Boolean).join(" · ") : [type, practiceName(practice), isDocument && date].filter(Boolean).join(" · "),
          status: mode === "evaluation" ? evaluation ? "Evaluada" : "Por evaluar" : entry.estado,
          search: [date, entry.actividad].filter(Boolean).join(" "),
          content: isDocument ? (
            <>
              <ExternalLink url={entry.url_archivo}>Abrir documento</ExternalLink>
              {mode === "document-review" && entry.estado === "Pendiente" && <DocumentReview document={entry} onSaved={onSaved} />}
            </>
          ) : (
            <>
              <p className="activity-text">{entry.actividad}</p>
              <Facts items={[
                ["Horas registradas", entry.horas_realizadas],
                ["Visita", entry.numero_visita],
                ["Ingreso", entry.hora_ingreso?.slice(0, 5)],
                ["Salida", entry.hora_salida?.slice(0, 5)],
                ["Reflexión pedagógica", entry.reflexion_pedagogica],
                ["Retroalimentación del tutor", entry.retroalimentacion_tutor],
                ...(mode === "evaluation" ? [["Estado de revisión", entry.estado]] : []),
                ...(mode !== "evaluation" || role === "asesor" ? [
                  ["Calificación del tutor", tutor?.calificacion_cuant], ["Observación del tutor", tutor?.observacion_cual],
                ] : []),
                ...(mode !== "evaluation" || role === "docente" ? [
                  ["Calificación del asesor", advisor?.calificacion_cuant], ["Observación del asesor", advisor?.observacion_cual],
                ] : []),
              ]} />
              {(entry.respuesta_bitacora?.length > 0) && (
                <Facts items={[...entry.respuesta_bitacora]
                  .sort((a, b) => (a.pregunta_bitacora?.orden ?? 0) - (b.pregunta_bitacora?.orden ?? 0))
                  .map((answer) => [answer.pregunta_bitacora?.texto || `Pregunta ${answer.id_pregunta}`, answer.valor])} />
              )}
              <ExternalLink url={entry.url_evidencias}>Abrir evidencias</ExternalLink>
              {mode === "review" && <ReviewForm logbook={entry} templates={templates} onSaved={() => onSaved("Revisión de la bitácora guardada.")} />}
              {mode === "evaluation" && <EvaluationForm logbook={entry} role={role} onSaved={() => onSaved("Evaluación guardada.")} />}
            </>
          ),
        };
      })}
    />
  );
}

DeliveryList.propTypes = {
  entries: PropTypes.array.isRequired,
  practices: PropTypes.array,
  templates: PropTypes.array,
  mode: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
};
