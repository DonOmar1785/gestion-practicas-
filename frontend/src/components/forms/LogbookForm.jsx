import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";

const INITIAL = {
  practice: "",
  session: "",
  fecha: "",
  horaIngreso: "",
  horaSalida: "",
  numeroVisita: "",
  urlEvidencias: "",
  actividad: "",
  reflexionPedagogica: "",
};

// Una pregunta configurable de la sesión (texto, número u opción).
function QuestionField({ question, value, onChange }) {
  const name = `question-${question.id_pregunta}`;
  const handleChange = (event) => onChange(question.id_pregunta, event.target.value);

  return (
    <label>
      {question.texto}
      {question.tipo === "opcion" ? (
        <select name={name} required={question.obligatoria === true} value={value} onChange={handleChange}>
          <option value="">Selecciona</option>
          {(question.opciones || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={question.tipo === "numero" ? "number" : "text"}
          required={question.obligatoria === true}
          value={value}
          onChange={handleChange}
        />
      )}
    </label>
  );
}

QuestionField.propTypes = {
  question: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function LogbookForm({ data, semester, onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const [answers, setAnswers] = useState({});
  const { run, pending, error } = useAction();

  // Solo se muestran las prácticas individuales del estudiante.
  const practices = useMemo(
    () =>
      (data.practices || []).filter(
        (practice) => !practice.semestre || Number(practice.semestre) === Number(semester),
      ),
    [data.practices, semester],
  );
  const sessions = useMemo(() => {
    const groups = new Set(practices.map((practice) =>
      `${practice.id_ciclo}:${practice.estudiante?.id_programa}:${practice.semestre}`,
    ));
    return (data.sessions || []).filter((session) =>
      groups.has(`${session.id_ciclo}:${session.id_programa}:${session.semestre}`),
    );
  }, [data.sessions, practices]);

  const selectedSession = sessions.find((session) => String(session.id_sesion) === values.session);
  const questions = (selectedSession?.pregunta_bitacora || []).filter((question) => question.activa !== false);

  const handleSessionChange = (event) => {
    handleChange(event);
    setAnswers({}); // cada sesión tiene preguntas distintas
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/logbooks", {
        idPractica: Number(values.practice),
        ...(values.session ? { idSesion: Number(values.session) } : {}),
        fecha: values.fecha,
        horaIngreso: values.horaIngreso,
        horaSalida: values.horaSalida,
        numeroVisita: values.numeroVisita || null,
        urlEvidencias: values.urlEvidencias || null,
        actividad: values.actividad,
        reflexionPedagogica: values.reflexionPedagogica || null,
        respuestas: questions.map((question) => ({
          idPregunta: Number(question.id_pregunta),
          valor: answers[question.id_pregunta] ?? "",
        })),
      });
      reset();
      setAnswers({});
      onSaved();
    });
  };

  return (
    <Section title="Registrar bitácora">
      <form className="form-grid" onSubmit={handleSubmit}>
        <select name="practice" required value={values.practice} onChange={handleChange}>
          <option value="">Mi práctica</option>
          <OptionList items={practices} valueKey="id_practica" getLabel={(item) => `Práctica ${item.semestre} · ${item.institucion?.nombre_institucion || "Institución"}`} />
        </select>
        <select name="session" value={values.session} onChange={handleSessionChange}>
          <option value="">Sin sesión dinámica</option>
          <OptionList items={sessions} valueKey="id_sesion" labelKey="nombre" />
        </select>
        <input name="fecha" type="date" required aria-label="Fecha" value={values.fecha} onChange={handleChange} />
        <input name="horaIngreso" type="time" required aria-label="Hora de ingreso" value={values.horaIngreso} onChange={handleChange} />
        <input name="horaSalida" type="time" required aria-label="Hora de salida" value={values.horaSalida} onChange={handleChange} />
        <input name="numeroVisita" type="number" min={1} placeholder="Número de visita" value={values.numeroVisita} onChange={handleChange} />
        <input name="urlEvidencias" type="url" placeholder="https:// enlace de evidencias" value={values.urlEvidencias} onChange={handleChange} />
        <textarea
          name="actividad"
          required
          minLength={10}
          maxLength={600}
          placeholder="Actividades realizadas"
          value={values.actividad}
          onChange={handleChange}
        />
        <textarea
          name="reflexionPedagogica"
          placeholder="Reflexión pedagógica (opcional)"
          value={values.reflexionPedagogica}
          onChange={handleChange}
        />
        <div className="span-todo">
          {questions.map((question) => (
            <QuestionField
              key={question.id_pregunta}
              question={question}
              value={answers[question.id_pregunta] ?? ""}
              onChange={handleAnswerChange}
            />
          ))}
        </div>
        <button className="btn-form" disabled={pending}>
          Enviar bitácora
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

LogbookForm.propTypes = {
  data: PropTypes.object.isRequired,
  semester: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onSaved: PropTypes.func.isRequired,
};
