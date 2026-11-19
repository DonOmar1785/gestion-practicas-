import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useAction } from "../../hooks/useAction.js";
import { parseQuestions } from "../../utils/format.js";
import FormStatus from "../FormStatus.jsx";
import Section from "../Section.jsx";

// Convierte las preguntas guardadas en el JSON editable del textarea.
function questionsToJson(session) {
  return JSON.stringify(
    (session.pregunta_bitacora || []).map((question) => ({
      texto: question.texto,
      tipo: question.tipo,
      obligatoria: question.obligatoria,
      opciones: question.opciones || [],
      orden: question.orden,
      activa: question.activa,
    })),
    null,
    2,
  );
}

// Configuración de una sesión: editar sus preguntas y abrirla/cerrarla.
function SessionConfig({ session, onSaved }) {
  const [questions, setQuestions] = useState(() => questionsToJson(session));
  const { run, pending, error } = useAction();
  const isOpen = session.estado === "Abierta";

  const saveQuestions = (event) => {
    event.preventDefault();
    run(async () => {
      const preguntas = parseQuestions(questions);
      await api.put(`/sessions/${session.id_sesion}/questions`, { preguntas });
      onSaved();
    });
  };

  const toggleState = () =>
    run(async () => {
      await api.patch(`/sessions/${session.id_sesion}/state`, {
        estado: isOpen ? "Cerrada" : "Abierta",
        visible: !isOpen,
      });
      onSaved();
    });

  return (
    <Section title={`Configurar sesión: ${session.nombre}`}>
      <form className="form-grid" onSubmit={saveQuestions}>
        <textarea
          className="span-todo"
          required
          aria-label={`Preguntas de ${session.nombre} en JSON`}
          value={questions}
          onChange={(event) => setQuestions(event.target.value)}
        />
        <button className="btn-form" disabled={pending}>
          Guardar preguntas
        </button>
      </form>
      <button type="button" className="btn-mini" disabled={pending} onClick={toggleState}>
        {isOpen ? "Cerrar sesión" : "Reabrir sesión"}
      </button>
      <FormStatus error={error} />
    </Section>
  );
}

SessionConfig.propTypes = {
  session: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default function SessionActions({ sessions = [], onSaved }) {
  return (
    <>
      {sessions.map((session) => (
        <SessionConfig key={session.id_sesion} session={session} onSaved={onSaved} />
      ))}
    </>
  );
}

SessionActions.propTypes = {
  sessions: PropTypes.array,
  onSaved: PropTypes.func.isRequired,
};
