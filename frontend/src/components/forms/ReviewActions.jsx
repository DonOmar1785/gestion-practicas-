import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import { evaluationFor } from "../../utils/workflow.js";

const REVIEW_INITIAL = { estado: "Aprobada", retroalimentacion: "" };
const EVALUATION_INITIAL = { calificacion: "", observacion: "" };

// Director y tutor revisan la bitácora (aprobar o pedir corrección).
export function ReviewForm({ logbook, templates = [], onSaved }) {
  const { values, handleChange, reset } = useForm(REVIEW_INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.patch(`/logbooks/${logbook.id_bitacora}/review`, values);
      reset();
      onSaved();
    });
  };

  return (
    <>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Decisión
          <select name="estado" value={values.estado} onChange={handleChange}>
          <option value="Aprobada">Aprobar</option>
          <option value="Corrección">Solicitar corrección</option>
          </select>
        </label>
        {templates.length > 0 && (
          <label>
            Usar una plantilla (opcional)
            <select value="" onChange={(event) => {
              const template = templates.find((item) => String(item.id_plantilla) === event.target.value);
              if (template) handleChange({ target: { name: "retroalimentacion", value: template.contenido } });
            }}>
              <option value="">Selecciona una plantilla</option>
              <OptionList items={templates} valueKey="id_plantilla" getLabel={(template) => (template.contenido ?? "").slice(0, 100) || "Plantilla"} />
            </select>
          </label>
        )}
        <label>
          Retroalimentación para el estudiante
          <textarea
          name="retroalimentacion"
          required
          placeholder="Retroalimentación obligatoria"
          value={values.retroalimentacion}
          onChange={handleChange}
          />
        </label>
        <button className="btn-form" disabled={pending}>
          Guardar revisión
        </button>
      </form>
      <FormStatus error={error} />
    </>
  );
}

ReviewForm.propTypes = {
  templates: PropTypes.array,
  logbook: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// El asesor califica de 0 a 5 y deja observaciones.
export function EvaluationForm({ logbook, role, onSaved }) {
  const saved = evaluationFor(logbook, role);
  const { values, handleChange } = useForm(saved ? {
    calificacion: String(saved.calificacion_cuant ?? ""),
    observacion: saved.observacion_cual ?? "",
  } : EVALUATION_INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    const who = role === "asesor" ? "advisor" : "tutor";
    run(async () => {
      await api.post(`/logbooks/${logbook.id_bitacora}/evaluations/${who}`, {
        calificacion: Number(values.calificacion),
        observacion: values.observacion,
      });
      onSaved();
    });
  };

  return (
    <>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Calificación de 0 a 5
          <input
          name="calificacion"
          type="number"
          min={0}
          max={5}
          step={0.1}
          required
          placeholder="Calificación 0 a 5"
          value={values.calificacion}
          onChange={handleChange}
          />
        </label>
        <label>
          Observaciones para el estudiante
          <textarea name="observacion" required value={values.observacion} onChange={handleChange} />
        </label>
        <button className="btn-form" disabled={pending}>
          Guardar evaluación
        </button>
      </form>
      <FormStatus error={error} />
    </>
  );
}

EvaluationForm.propTypes = {
  logbook: PropTypes.object.isRequired,
  role: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
};

