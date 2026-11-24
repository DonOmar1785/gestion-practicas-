import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import Section from "../Section.jsx";

const INITIAL = { nombre_programa: "", facultad: "" };

export default function ProgramForm({ onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/programs", values);
      reset();
      onSaved();
    });
  };

  return (
    <Section title="Crear programa">
      <form className="form-grid narrow-form" onSubmit={handleSubmit}>
        <label>
          Nombre del programa
          <input name="nombre_programa" required minLength={5} placeholder="Nombre del programa" value={values.nombre_programa} onChange={handleChange} />
        </label>
        <label>
          Facultad (opcional)
          <input name="facultad" placeholder="Facultad" value={values.facultad} onChange={handleChange} />
        </label>
        <button className="btn-form" disabled={pending}>
          Guardar programa
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

ProgramForm.propTypes = {
  onSaved: PropTypes.func.isRequired,
};
