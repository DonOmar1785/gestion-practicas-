import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import { isHttpUrl } from "../../utils/format.js";
import { practiceName } from "../../utils/workflow.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";

const INITIAL = { practice: "", type: "", url: "" };
const DOCUMENT_TYPES = ["Hoja de Vida", "Carta de Presentación", "Plan de Trabajo", "Informe Parcial", "Informe Final"];

export default function DocumentForm({ practices = [], onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const { run, pending, error, setError } = useAction();
  const practice = practices.length === 1 ? String(practices[0].id_practica) : values.practice;

  const handleSubmit = (event) => {
    event.preventDefault();
    const url = values.url.trim();
    if (!isHttpUrl(url)) {
      setError("Pega un enlace que empiece por https:// o http://.");
      return;
    }
    void run(async () => {
      await api.post("/documents", {
        idPractica: Number(practice),
        tipoDocumento: values.type,
        urlArchivo: url,
      });
      reset();
      onSaved("Documento enviado a revisión. Puedes consultar su estado en Entregas enviadas.");
    });
  };

  return (
    <Section title="Enviar un documento">
      {practices.length === 0 ? (
        <p className="empty-state">Cuando el director te asigne una práctica, podrás enviar tus documentos aquí.</p>
      ) : (
        <form className="form-grid narrow-form" onSubmit={handleSubmit}>
          {practices.length === 1 ? <p className="form-context">{practiceName(practices[0])}</p> : (
            <label>Práctica
              <select name="practice" required value={practice} onChange={handleChange}>
                <option value="">Selecciona tu práctica</option>
                <OptionList items={practices} valueKey="id_practica" getLabel={practiceName} />
              </select>
            </label>
          )}
          <label>Tipo de documento
            <select name="type" required value={values.type} onChange={handleChange}>
              <option value="">Selecciona el tipo</option>
              {DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Enlace al archivo
            <input name="url" type="url" required maxLength={255} placeholder="https://…" value={values.url} onChange={handleChange} aria-describedby="document-link-help" />
            <small id="document-link-help">Sube el archivo a un almacenamiento autorizado. Dale al tutor permiso de lectura y pega el enlace aquí.</small>
          </label>
          <button className="btn-form" disabled={pending}>{pending ? "Enviando…" : "Enviar a revisión"}</button>
          <FormStatus error={error} />
        </form>
      )}
    </Section>
  );
}

DocumentForm.propTypes = { practices: PropTypes.array, onSaved: PropTypes.func.isRequired };
