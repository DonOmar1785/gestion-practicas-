import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import Section from "../Section.jsx";

const INITIAL = { nombre_institucion: "", ciudad: "", direccion: "", telefono: "", estado_institucion: "Activo" };

export default function InstitutionForm({ onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/institutions", values);
      reset();
      onSaved();
    });
  };

  return (
    <Section title="Crear institución">
      <form className="form-grid narrow-form" onSubmit={handleSubmit}>
        <label>
          Nombre de la institución
          <input name="nombre_institucion" required placeholder="Nombre" value={values.nombre_institucion} onChange={handleChange} />
        </label>
        <label>
          Ciudad (opcional)
          <input name="ciudad" placeholder="Ciudad" value={values.ciudad} onChange={handleChange} />
        </label>
        <label>
          Dirección (opcional)
          <input name="direccion" placeholder="Dirección" value={values.direccion} onChange={handleChange} />
        </label>
        <label>
          Teléfono (opcional)
          <input name="telefono" placeholder="Teléfono" value={values.telefono} onChange={handleChange} />
        </label>
        <label>
          Estado
          <select name="estado_institucion" value={values.estado_institucion} onChange={handleChange}>
            <option value="Activo">Activa</option>
            <option value="Inactivo">Inactiva</option>
          </select>
        </label>
        <button className="btn-form" disabled={pending}>
          Guardar institución
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

InstitutionForm.propTypes = {
  onSaved: PropTypes.func.isRequired,
};
