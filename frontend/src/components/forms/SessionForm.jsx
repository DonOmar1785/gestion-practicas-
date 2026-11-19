import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import { parseQuestions } from "../../utils/format.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";

const INITIAL = {
  nombre: "",
  descripcion: "",
  fecha_inicio: "",
  fecha_fin: "",
  program: "",
  cycle: "",
  semestre: "",
  preguntas: "",
};

const QUESTIONS_PLACEHOLDER =
  'Preguntas en JSON (opcional): [{"texto":"Describe tu actividad","tipo":"texto","obligatoria":true}]';

export default function SessionForm({ programs, cycles, sessions = [], onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const { run, pending, error } = useAction();
  const [sourceSession, setSourceSession] = useState("");
  const [destination, setDestination] = useState({ id_ciclo: "", id_programa: "", semestre: "" });
  const [duplicateAction, setDuplicateAction] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setDuplicateAction(false);
    run(async () => {
      const questions = parseQuestions(values.preguntas);
      await api.post("/sessions", {
        nombre: values.nombre,
        descripcion: values.descripcion,
        fecha_inicio: values.fecha_inicio,
        fecha_fin: values.fecha_fin,
        id_programa: Number(values.program),
        id_ciclo: Number(values.cycle),
        semestre: Number(values.semestre),
        preguntas: questions,
      });
      reset();
      onSaved();
    });
  };

  const handleDuplicate = (event) => {
    event.preventDefault();
    if (!sourceSession) return;
    setDuplicateAction(true);
    run(async () => {
      await api.post(`/sessions/${sourceSession}/duplicate`, {
        ...destination,
        id_ciclo: Number(destination.id_ciclo),
        id_programa: Number(destination.id_programa),
        semestre: Number(destination.semestre),
      });
      setSourceSession("");
      setDestination({ id_ciclo: "", id_programa: "", semestre: "" });
      onSaved();
    });
  };

  return (
    <>
      <Section title="Crear sesión de bitácora">
        <form className="form-grid" onSubmit={handleSubmit}>
        <input name="nombre" required maxLength={150} placeholder="Nombre" value={values.nombre} onChange={handleChange} />
        <textarea name="descripcion" placeholder="Descripción" value={values.descripcion} onChange={handleChange} />
        <input name="fecha_inicio" type="date" required aria-label="Fecha de inicio" value={values.fecha_inicio} onChange={handleChange} />
        <input name="fecha_fin" type="date" required aria-label="Fecha de fin" value={values.fecha_fin} onChange={handleChange} />
        <select name="program" required value={values.program} onChange={handleChange}>
          <option value="">Programa académico</option>
          <OptionList items={programs} valueKey="id_programa" labelKey="nombre_programa" />
        </select>
        <select name="cycle" required value={values.cycle} onChange={handleChange}>
          <option value="">Ciclo académico</option>
          <OptionList items={cycles.filter((cycle) => cycle.estado_ciclo === "Abierto")} valueKey="id_ciclo" labelKey="nombre_periodo" />
        </select>
        <select name="semestre" required value={values.semestre} onChange={handleChange}>
          <option value="">Semestre</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => (
            <option key={semester} value={semester}>{semester}</option>
          ))}
        </select>
        <textarea name="preguntas" placeholder={QUESTIONS_PLACEHOLDER} value={values.preguntas} onChange={handleChange} />
        <button className="btn-form" disabled={pending}>
          Crear sesión en Supabase
        </button>
        </form>
        {!duplicateAction && <FormStatus error={error} />}
      </Section>
      <Section title="Duplicar sesión a otro grupo">
        <p className="ayuda">Copia las preguntas y fechas de una sesión y asígnala a otro ciclo, programa o semestre.</p>
        <form className="form-grid" onSubmit={handleDuplicate}>
          <label>
            Sesión a duplicar
            <select required value={sourceSession} onChange={(event) => setSourceSession(event.target.value)}>
              <option value="">Selecciona una sesión</option>
              <OptionList
                items={sessions}
                valueKey="id_sesion"
                getLabel={(session) => `${session.nombre} · Semestre ${session.semestre}`}
              />
            </select>
          </label>
          <label>
            Nuevo ciclo
            <select required value={destination.id_ciclo} onChange={(event) => setDestination((current) => ({ ...current, id_ciclo: event.target.value }))}>
              <option value="">Selecciona un ciclo</option>
              <OptionList items={cycles.filter((cycle) => cycle.estado_ciclo === "Abierto")} valueKey="id_ciclo" labelKey="nombre_periodo" />
            </select>
          </label>
          <label>
            Programa
            <select required value={destination.id_programa} onChange={(event) => setDestination((current) => ({ ...current, id_programa: event.target.value }))}>
              <option value="">Selecciona un programa</option>
              <OptionList items={programs} valueKey="id_programa" labelKey="nombre_programa" />
            </select>
          </label>
          <label>
            Semestre
            <select required value={destination.semestre} onChange={(event) => setDestination((current) => ({ ...current, semestre: event.target.value }))}>
              <option value="">Selecciona un semestre</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </label>
          <button className="btn-form" disabled={pending || !sessions.length}>Duplicar sesión</button>
        </form>
        {duplicateAction && <FormStatus error={error} />}
      </Section>
    </>
  );
}

SessionForm.propTypes = {
  programs: PropTypes.array,
  cycles: PropTypes.array,
  sessions: PropTypes.array,
  onSaved: PropTypes.func.isRequired,
};
