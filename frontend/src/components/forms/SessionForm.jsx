import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";
import QuestionEditor from "./QuestionEditor.jsx";
import { serializeQuestions } from "../../utils/questions.js";

const INITIAL = { nombre: "", descripcion: "", fecha_inicio: "", fecha_fin: "", id_programa: "", id_ciclo: "", semestre: "", source: "" };

export default function SessionForm({ programs = [], cycles = [], sessions = [], duplicate = false, onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const [questions, setQuestions] = useState([]);
  const { run, pending, error } = useAction();
  const openCycles = cycles.filter((cycle) => cycle.estado_ciclo === "Abierto");

  const handleSubmit = (event) => {
    event.preventDefault();
    void run(async () => {
      const group = { id_programa: Number(values.id_programa), id_ciclo: Number(values.id_ciclo), semestre: Number(values.semestre) };
      if (duplicate) {
        await api.post(`/sessions/${values.source}/duplicate`, group);
      } else {
        await api.post("/sessions", {
          ...group,
          nombre: values.nombre,
          descripcion: values.descripcion,
          fecha_inicio: values.fecha_inicio,
          fecha_fin: values.fecha_fin,
          preguntas: serializeQuestions(questions),
        });
      }
      reset();
      setQuestions([]);
      onSaved(duplicate ? "Formulario duplicado para el grupo." : "Formulario creado y disponible para el grupo.");
    });
  };

  return (
    <Section title={duplicate ? "Duplicar un formulario" : "Crear un formulario de bitácora"}>
      {duplicate && !sessions.length ? <p className="empty-state">Primero crea un formulario para poder duplicarlo.</p> : (
        <form className="form-grid" onSubmit={handleSubmit}>
          {duplicate ? (
            <label>Formulario que quieres copiar
              <select name="source" required value={values.source} onChange={handleChange}>
                <option value="">Selecciona un formulario</option>
                <OptionList items={sessions} valueKey="id_sesion" getLabel={(session) => `${session.nombre} · Semestre ${session.semestre}`} />
              </select>
              <small>Se copian las fechas y preguntas del formulario original.</small>
            </label>
          ) : (
            <>
              <label>Nombre del formulario
                <input name="nombre" required maxLength={150} value={values.nombre} onChange={handleChange} />
              </label>
              <label>Indicaciones para el estudiante (opcional)
                <textarea name="descripcion" value={values.descripcion} onChange={handleChange} />
              </label>
              <div className="field-grid">
                <label>Fecha de inicio
                  <input name="fecha_inicio" type="date" required value={values.fecha_inicio} onChange={handleChange} />
                </label>
                <label>Fecha de fin
                  <input name="fecha_fin" type="date" required min={values.fecha_inicio || undefined} value={values.fecha_fin} onChange={handleChange} />
                </label>
              </div>
            </>
          )}
          <fieldset className="assignment-group">
            <legend>Grupo destinatario</legend>
            {!openCycles.length && <p className="ayuda">Hace falta un ciclo abierto para asignar el formulario.</p>}
            <div className="field-grid">
              <label>Programa académico
                <select name="id_programa" required value={values.id_programa} onChange={handleChange}>
                  <option value="">Selecciona un programa</option>
                  <OptionList items={programs} valueKey="id_programa" labelKey="nombre_programa" />
                </select>
              </label>
              <label>Ciclo académico
                <select name="id_ciclo" required value={values.id_ciclo} onChange={handleChange}>
                  <option value="">Selecciona un ciclo abierto</option>
                  <OptionList items={openCycles} valueKey="id_ciclo" labelKey="nombre_periodo" />
                </select>
              </label>
              <label>Semestre
                <select name="semestre" required value={values.semestre} onChange={handleChange}>
                  <option value="">Selecciona un semestre</option>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => <option key={semester}>{semester}</option>)}
                </select>
              </label>
            </div>
          </fieldset>
          {!duplicate && <QuestionEditor questions={questions} onChange={setQuestions} />}
          <FormStatus error={error} />
          <button className="btn-form" disabled={pending || !openCycles.length}>{duplicate ? "Duplicar formulario" : "Crear formulario"}</button>
        </form>
      )}
    </Section>
  );
}

SessionForm.propTypes = { programs: PropTypes.array, cycles: PropTypes.array, sessions: PropTypes.array, duplicate: PropTypes.bool, onSaved: PropTypes.func.isRequired };
