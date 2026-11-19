import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import Section from "../Section.jsx";

// Acciones rápidas del director/tutor: aprobar documentos y cerrar sesiones.
export default function WorkflowActions({ data, role, onSaved }) {
  const { run, pending, error } = useAction();
  if (role !== "director" && role !== "docente") return null;

  const pendingDocuments = (data.documents || []).filter((document) => document.estado === "Pendiente");
  const openSessions = (data.sessions || []).filter(
    (session) => session.estado === "Abierta" && session.visible !== false,
  );

  const approve = (document) =>
    run(async () => {
      await api.patch(`/documents/${document.id_documento}/state`, { estado: "Aprobado" });
      onSaved();
    });

  const closeSession = (session) =>
    run(async () => {
      await api.patch(`/sessions/${session.id_sesion}/state`, { estado: "Cerrada", visible: false });
      onSaved();
    });

  return (
    <>
      <FormStatus error={error} />
      {pendingDocuments.length > 0 && (
        <Section title="Revisar documentos pendientes">
          {pendingDocuments.map((document) => (
            <div className="fila-simple" key={document.id_documento}>
              <span>
                Documento {document.id_documento}: {document.tipo_documento}
              </span>
              <button type="button" className="btn-mini" disabled={pending} onClick={() => approve(document)}>
                Marcar aprobado
              </button>
            </div>
          ))}
        </Section>
      )}
      {openSessions.length > 0 && (
        <Section title="Cerrar o esconder sesiones">
          {openSessions.map((session) => (
            <button
              key={session.id_sesion}
              type="button"
              className="btn-mini"
              disabled={pending}
              onClick={() => closeSession(session)}
            >
              Cerrar sesión {session.nombre}
            </button>
          ))}
        </Section>
      )}
    </>
  );
}

WorkflowActions.propTypes = {
  data: PropTypes.object.isRequired,
  role: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
};
