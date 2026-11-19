import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";

const INITIAL = { practice: "", type: "", url: "" };
const DOCUMENT_TYPES = ["Hoja de Vida", "Carta de Presentación", "Plan de Trabajo", "Informe Parcial", "Informe Final"];

export default function DocumentForm({ practices, onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/documents", {
        idPractica: Number(values.practice),
        tipoDocumento: values.type,
        urlArchivo: values.url,
      });
      reset();
      onSaved();
    });
  };

  return (
    <Section title="Registrar documento por enlace">
      <p className="ayuda">
        Sube el archivo a un almacenamiento autorizado y pega aquí el enlace. No se envía el archivo al servidor.
      </p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <select name="practice" required value={values.practice} onChange={handleChange}>
          <option value="">Mi práctica</option>
          <OptionList items={practices} valueKey="id_practica" getLabel={(item) => `Práctica ${item.semestre} · ${item.institucion?.nombre_institucion || "Institución pendiente"}`} />
        </select>
        <select name="type" required value={values.type} onChange={handleChange}>
          <option value="">Tipo de documento</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <input name="url" type="url" required placeholder="https:// enlace al documento" value={values.url} onChange={handleChange} />
        <button className="btn-form" disabled={pending}>
          Enviar a revisión
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

DocumentForm.propTypes = {
  practices: PropTypes.array,
  onSaved: PropTypes.func.isRequired,
};
