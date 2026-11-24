import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useAction } from "../../hooks/useAction.js";
import { formatDate } from "../../utils/dashboard.js";
import FormStatus from "../FormStatus.jsx";
import { Facts, RecordList } from "../WorkArea.jsx";
import QuestionEditor from "./QuestionEditor.jsx";
import { initialQuestions, serializeQuestions } from "../../utils/questions.js";

function SessionConfig({ session, onSaved }) {
  const [questions, setQuestions] = useState(null);
  const { run, pending, error, clearError } = useAction();
  const isOpen = session.estado === "Abierta" && session.visible !== false;
  const savedQuestions = initialQuestions(session.pregunta_bitacora || []);

  const saveQuestions = (event) => {
    event.preventDefault();
    void run(async () => {
      await api.put(`/sessions/${session.id_sesion}/questions`, { preguntas: serializeQuestions(questions) });
      setQuestions(null);
      onSaved("Preguntas guardadas.");
    });
  };
  const toggleState = () => void run(async () => {
    await api.patch(`/sessions/${session.id_sesion}/state`, {
      estado: isOpen ? "Cerrada" : "Abierta",
      visible: !isOpen,
    });
    onSaved(isOpen ? "Formulario cerrado." : "Formulario reabierto.");
  });

  return (
    <>
      <Facts items={[["Indicaciones", session.descripcion], ["Vigencia", `${formatDate(session.fecha_inicio)} al ${formatDate(session.fecha_fin)}`]]} />
      {questions ? (
        <form className="form-grid" onSubmit={saveQuestions}>
          <QuestionEditor questions={questions} onChange={setQuestions} />
          <div className="button-row">
            <button className="btn-form" disabled={pending}>Guardar preguntas</button>
            <button type="button" className="btn-mini" disabled={pending} onClick={() => { clearError(); setQuestions(null); }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <>
          {savedQuestions.length > 0 && <ol className="question-preview">{savedQuestions.map((question) => <li key={question.key}>{question.texto}</li>)}</ol>}
          <div className="button-row">
            <button type="button" className="btn-form" disabled={pending} onClick={() => { clearError(); setQuestions(savedQuestions); }}>Editar preguntas</button>
            <button type="button" className="btn-mini" disabled={pending} onClick={toggleState}>{isOpen ? "Cerrar formulario" : "Reabrir formulario"}</button>
          </div>
        </>
      )}
      <FormStatus error={error} />
    </>
  );
}

SessionConfig.propTypes = { session: PropTypes.object.isRequired, onSaved: PropTypes.func.isRequired };

export default function SessionActions({ sessions = [], programs = [], cycles = [], onSaved }) {
  return <RecordList empty="Aún no hay formularios creados." filterLabel="Buscar por nombre, grupo o estado" records={sessions.map((session) => ({
    id: session.id_sesion,
    title: session.nombre,
    subtitle: [
      programs.find((program) => Number(program.id_programa) === Number(session.id_programa))?.nombre_programa,
      cycles.find((cycle) => Number(cycle.id_ciclo) === Number(session.id_ciclo))?.nombre_periodo,
      `Semestre ${session.semestre}`,
    ].filter(Boolean).join(" · "),
    status: session.visible === false ? "Cerrada" : session.estado,
    content: <SessionConfig session={session} onSaved={onSaved} />,
  }))} />;
}

SessionActions.propTypes = { sessions: PropTypes.array, programs: PropTypes.array, cycles: PropTypes.array, onSaved: PropTypes.func.isRequired };
