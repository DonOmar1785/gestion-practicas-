import { useId, useRef } from "react";
import PropTypes from "prop-types";

export default function QuestionEditor({ questions, onChange }) {
  const id = useId();
  const next = useRef(0);
  const change = (key, changes) => onChange(questions.map((question) => question.key === key ? { ...question, ...changes } : question));

  return (
    <fieldset className="assignment-group question-editor">
      <legend>Preguntas de la bitácora</legend>
      {questions.length === 0 && <p className="ayuda">Agrega preguntas si necesitas información adicional sobre la visita.</p>}
      {questions.map((question, index) => (
        <fieldset className="question-card" key={question.key}>
          <legend>Pregunta {index + 1}</legend>
          <label>Enunciado
            <input required value={question.texto} onChange={(event) => change(question.key, { texto: event.target.value })} />
          </label>
          <div className="field-grid">
            <label>Tipo de respuesta
              <select value={question.tipo} onChange={(event) => change(question.key, { tipo: event.target.value })}>
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="opcion">Elegir una opción</option>
              </select>
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={question.obligatoria === true} onChange={(event) => change(question.key, { obligatoria: event.target.checked })} />
              Respuesta obligatoria
            </label>
          </div>
          {question.tipo === "opcion" && (
            <label>Opciones (una por línea)
              <textarea required value={question.optionsText} onChange={(event) => change(question.key, { optionsText: event.target.value })} />
            </label>
          )}
          <button type="button" className="btn-mini" aria-label={`Quitar pregunta ${index + 1}`} onClick={() => onChange(questions.filter((item) => item.key !== question.key))}>Quitar</button>
        </fieldset>
      ))}
      <button type="button" className="btn-mini" onClick={() => {
        const key = `${id}-${next.current++}`;
        onChange([...questions, { key, texto: "", tipo: "texto", obligatoria: false, optionsText: "" }]);
      }}>Agregar pregunta</button>
    </fieldset>
  );
}

QuestionEditor.propTypes = { questions: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };
