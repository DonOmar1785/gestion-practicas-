import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import Section from "../Section.jsx";

// Editor de una plantilla existente.
function TemplateEditor({ template, onSaved }) {
  const [content, setContent] = useState(template.contenido || "");
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.put(`/templates/${template.id_plantilla}`, { contenido: content });
      onSaved();
    });
  };

  return (
    <Section title={`Editar plantilla ${template.id_plantilla}`}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <textarea
          required
          aria-label={`Contenido de plantilla ${template.id_plantilla}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <button className="btn-form" disabled={pending}>
          Guardar cambios
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

TemplateEditor.propTypes = {
  template: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// Crear plantillas nuevas y editar las existentes.
export default function TemplateForms({ templates = [], onSaved }) {
  const [content, setContent] = useState("");
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/templates", { contenido: content });
      setContent("");
      onSaved();
    });
  };

  return (
    <>
      <Section title="Guardar plantilla de retroalimentación">
        <form className="form-grid" onSubmit={handleSubmit}>
          <textarea
            required
            placeholder="Contenido de la plantilla"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <button className="btn-form" disabled={pending}>
            Guardar plantilla
          </button>
        </form>
        <FormStatus error={error} />
      </Section>
      {templates.map((template) => (
        <TemplateEditor key={template.id_plantilla} template={template} onSaved={onSaved} />
      ))}
    </>
  );
}

TemplateForms.propTypes = {
  templates: PropTypes.array,
  onSaved: PropTypes.func.isRequired,
};
