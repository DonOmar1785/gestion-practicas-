import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import Section from "../Section.jsx";

const REVIEW_INITIAL = { estado: "Aprobada", retroalimentacion: "" };
const EVALUATION_INITIAL = { calificacion: "", observacion: "" };

// Director y tutor revisan la bitácora (aprobar o pedir corrección).
function ReviewForm({ logbook, onSaved }) {
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
        <select name="estado" value={values.estado} onChange={handleChange}>
          <option value="Aprobada">Aprobar</option>
          <option value="Corrección">Solicitar corrección</option>
        </select>
        <textarea
          name="retroalimentacion"
          required
          placeholder="Retroalimentación obligatoria"
          value={values.retroalimentacion}
          onChange={handleChange}
        />
        <button className="btn-form" disabled={pending}>
          Guardar revisión
        </button>
      </form>
      <FormStatus error={error} />
    </>
  );
}

ReviewForm.propTypes = {
  logbook: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// El asesor califica de 0 a 5 y deja observaciones.
function EvaluationForm({ logbook, role, onSaved }) {
  const { values, handleChange, reset } = useForm(EVALUATION_INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    const who = role === "asesor" ? "advisor" : "tutor";
    run(async () => {
      await api.post(`/logbooks/${logbook.id_bitacora}/evaluations/${who}`, {
        calificacion: Number(values.calificacion),
        observacion: values.observacion,
      });
      reset();
      onSaved();
    });
  };

  return (
    <>
      <form className="form-grid" onSubmit={handleSubmit}>
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
        <textarea name="observacion" required placeholder="Observaciones" value={values.observacion} onChange={handleChange} />
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

export default function ReviewActions({ logbooks = [], role, onSaved }) {
  const isReviewer = role === "docente" || role === "director";

  return (
    <>
      {logbooks.map((logbook) => (
        <Section key={logbook.id_bitacora} title={`Acciones para bitácora ${logbook.id_bitacora}`}>
          {isReviewer ? (
            <ReviewForm logbook={logbook} onSaved={onSaved} />
          ) : (
            <EvaluationForm logbook={logbook} role={role} onSaved={onSaved} />
          )}
        </Section>
      ))}
    </>
  );
}

ReviewActions.propTypes = {
  logbooks: PropTypes.array,
  role: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
};
