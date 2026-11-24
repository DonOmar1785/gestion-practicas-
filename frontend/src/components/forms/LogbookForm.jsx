import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";
import { isHttpUrl } from "../../utils/format.js";
import { practiceName } from "../../utils/workflow.js";

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
          step={question.tipo === "numero" ? "any" : undefined}
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

export default function LogbookForm({ data, onSaved }) {
  const { values, handleChange, setValues, reset } = useForm(INITIAL);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(1);
  const heading = useRef(null);
  const { run, pending, error, setError, clearError } = useAction();

  useEffect(() => {
    if (step === 2) heading.current?.focus();
  }, [step]);

  const practices = data.practices || [];
  const practice = practices.length === 1 ? practices[0] : practices.find((item) => String(item.id_practica) === values.practice);
  const sessions = (data.sessions || []).filter((session) =>
    practice && session.estado === "Abierta" && session.visible !== false &&
    Number(session.id_ciclo) === Number(practice.id_ciclo) &&
    Number(session.id_programa) === Number(practice.estudiante?.id_programa ?? practice.id_programa) &&
    Number(session.semestre) === Number(practice.semestre) &&
    (!values.fecha || (values.fecha >= session.fecha_inicio && values.fecha <= session.fecha_fin)),
  );
  const selectedSession = sessions.find((session) => String(session.id_sesion) === values.session);
  const questions = (selectedSession?.pregunta_bitacora || []).filter((question) => question.activa !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const changeContext = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value, session: "" }));
    setAnswers({});
    clearError();
  };

  const handleSessionChange = (event) => {
    handleChange(event);
    setAnswers({});
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    clearError();
    if (!practice || (values.session && !selectedSession)) {
      setError("Verifica la práctica y la sesión antes de continuar.");
      return;
    }
    if (values.horaSalida <= values.horaIngreso) {
      setError("La hora de salida debe ser posterior a la de ingreso.");
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    const url = values.urlEvidencias.trim();
    if (url && !isHttpUrl(url)) {
      setError("El enlace de evidencias debe empezar por https:// o http://.");
      return;
    }
    void run(async () => {
      await api.post("/logbooks", {
        idPractica: Number(practice.id_practica),
        ...(values.session ? { idSesion: Number(values.session) } : {}),
        fecha: values.fecha,
        horaIngreso: values.horaIngreso,
        horaSalida: values.horaSalida,
        numeroVisita: values.numeroVisita || null,
        urlEvidencias: url || null,
        actividad: values.actividad,
        reflexionPedagogica: values.reflexionPedagogica || null,
        respuestas: questions.map((question) => ({
          idPregunta: Number(question.id_pregunta),
          valor: answers[question.id_pregunta] ?? "",
        })),
      });
      reset();
      setAnswers({});
      setStep(1);
      onSaved("Bitácora enviada. Puedes consultar el estado en Bitácoras enviadas.");
    });
  };

  return (
    <Section title="Registrar una bitácora">
      {practices.length === 0 ? <p className="empty-state">Cuando te asignen una práctica, podrás registrar tu primera visita.</p> : (
        <form className="form-grid narrow-form" onSubmit={handleSubmit}>
          <ol className="steps">
            {["Visita", "Actividad y evidencias"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}>{label}</li>)}
          </ol>
          {step === 1 ? (
            <>
              {practices.length === 1 ? <p className="form-context">{practiceName(practice)}</p> : (
                <label>Práctica
                  <select name="practice" required value={values.practice} onChange={changeContext}>
                    <option value="">Selecciona tu práctica</option>
                    <OptionList items={practices} valueKey="id_practica" getLabel={practiceName} />
                  </select>
                </label>
              )}
              <div className="field-grid">
                <label>Fecha de la visita
                  <input name="fecha" type="date" required value={values.fecha} onChange={changeContext} />
                </label>
                <label>Hora de ingreso
                  <input name="horaIngreso" type="time" required value={values.horaIngreso} onChange={handleChange} />
                </label>
                <label>Hora de salida
                  <input name="horaSalida" type="time" required value={values.horaSalida} onChange={handleChange} />
                </label>
                <label>Número de visita (opcional)
                  <input name="numeroVisita" type="number" min={1} value={values.numeroVisita} onChange={handleChange} />
                </label>
              </div>
              {practice && values.fecha && (sessions.length > 0 ? (
                <label>Formulario asignado (si aplica)
                  <select name="session" value={values.session} onChange={handleSessionChange}>
                    <option value="">Registro general de visita</option>
                    <OptionList items={sessions} valueKey="id_sesion" labelKey="nombre" />
                  </select>
                  {selectedSession?.descripcion && <small>{selectedSession.descripcion}</small>}
                </label>
              ) : <p className="ayuda">Para esta fecha puedes hacer un registro general de visita.</p>)}
            </>
          ) : (
            <>
              <h3 ref={heading} tabIndex={-1}>Cuenta qué hiciste en la visita</h3>
              <p className="form-context">{practiceName(practice)} · {values.fecha} · {values.horaIngreso} a {values.horaSalida}</p>
              <label>Actividad realizada
                <textarea name="actividad" required minLength={10} maxLength={600} value={values.actividad} onChange={handleChange} placeholder="Describe qué hiciste y con quién." />
              </label>
              <label>Reflexión pedagógica (opcional)
                <textarea name="reflexionPedagogica" value={values.reflexionPedagogica} onChange={handleChange} placeholder="¿Qué aprendiste o qué harías diferente?" />
              </label>
              {questions.map((question) => (
                <QuestionField key={question.id_pregunta} question={question} value={answers[question.id_pregunta] ?? ""} onChange={handleAnswerChange} />
              ))}
              <label>Enlace de evidencias (opcional)
                <input name="urlEvidencias" type="url" maxLength={255} placeholder="https://…" value={values.urlEvidencias} onChange={handleChange} />
                <small>Comprueba que tu tutor puede abrir el enlace.</small>
              </label>
            </>
          )}
          <FormStatus error={error} />
          <div className="button-row">
            {step === 2 && <button type="button" className="btn-mini" disabled={pending} onClick={() => { clearError(); setStep(1); }}>Volver a la visita</button>}
            <button className="btn-form" disabled={pending}>{step === 1 ? "Continuar" : pending ? "Enviando…" : "Enviar bitácora"}</button>
          </div>
        </form>
      )}
    </Section>
  );
}

LogbookForm.propTypes = {
  data: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};
