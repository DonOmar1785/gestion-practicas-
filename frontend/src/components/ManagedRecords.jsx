import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../services/api.js";
import { useAction } from "../hooks/useAction.js";
import { MANAGED_RESOURCES } from "../config/editable.js";
import { display, labelFor, toNumberOrNull } from "../utils/format.js";
import { practiceName, studentName } from "../utils/workflow.js";
import FormStatus from "./FormStatus.jsx";
import { Facts, RecordList } from "./WorkArea.jsx";

function RecordEditor({ row, resource, onChanged }) {
  const { idField, fields } = MANAGED_RESOURCES[resource];
  const editable = fields.filter((field) => !field.when || field.when(row));
  const [draft, setDraft] = useState(null);
  const { run, pending, error, clearError } = useAction();

  const save = (event) => {
    event.preventDefault();
    void run(async () => {
      const changes = Object.fromEntries(editable.map((field) => {
        const value = String(draft[field.key]).trim();
        return [field.key, field.type === "number" ? toNumberOrNull(value) : value || null];
      }));
      await api.put(`/${resource}/${row[idField]}`, changes);
      setDraft(null);
      onChanged();
    });
  };

  const remove = () => {
    if (!window.confirm("¿Eliminar este registro? Si tiene datos relacionados, el software impedirá eliminarlo.")) return;
    void run(async () => {
      await api.delete(`/${resource}/${row[idField]}`);
      onChanged();
    });
  };

  if (!draft) {
    const extra = resource === "practices" ? [
      ["institucion", "Institución"], ["tutor", "Tutor"], ["asesor", "Asesor"],
      ["fecha_inicio"], ["modalidad"], ["horas_requeridas"], ["horas_acumuladas"], ["estado_arl"], ["fecha_vencimiento_arl"],
    ] : [];
    const details = [...editable.filter((field) => !["nombre_completo", "nombre_institucion"].includes(field.key)).map((field) => [field.key]), ...extra];
    return (
      <>
        <Facts items={details.map(([key, label]) => [label ?? labelFor(key), row[key] === null || row[key] === undefined ? null : display(row[key])])} />
        <div className="button-row">
          <button type="button" className="btn-mini" disabled={pending} onClick={() => {
            clearError();
            setDraft(Object.fromEntries(editable.map((field) => [field.key, row[field.key] ?? ""])));
          }}>Editar</button>
          <button type="button" className="btn-mini rojo" disabled={pending} onClick={remove}>Eliminar</button>
        </div>
        <FormStatus error={error} />
      </>
    );
  }

  function change(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  return (
    <form className="form-grid" onSubmit={save}>
      <div className="field-grid">
        {editable.map((field) => (
          <label key={field.key}>
            {labelFor(field.key)}
            {field.type === "select" ? (
              <select name={field.key} value={draft[field.key]} onChange={change}>
                {field.options.map((value) => <option key={value}>{value}</option>)}
                {!field.options.includes(draft[field.key]) && <option value={draft[field.key]}>{draft[field.key] || "Selecciona"}</option>}
              </select>
            ) : (
              <input name={field.key} type={field.type || "text"} required={field.required} min={field.min} max={field.max} value={draft[field.key]} onChange={change} />
            )}
          </label>
        ))}
      </div>
      <div className="button-row">
        <button className="btn-form" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button>
        <button type="button" className="btn-mini" disabled={pending} onClick={() => { clearError(); setDraft(null); }}>Cancelar</button>
      </div>
      <FormStatus error={error} />
    </form>
  );
}

RecordEditor.propTypes = { row: PropTypes.object.isRequired, resource: PropTypes.string.isRequired, onChanged: PropTypes.func.isRequired };

export default function ManagedRecords({ rows, resource, onChanged }) {
  const { idField } = MANAGED_RESOURCES[resource];

  return (
    <RecordList empty="Todavía no hay registros." records={rows.map((row) => ({
      id: row[idField],
      title: row.nombre_completo ?? row.nombre_institucion ?? studentName(row),
      subtitle: resource === "users" ? labelForRole(row.rol) : resource === "practices" ? practiceName(row) : row.ciudad,
      status: row.estado ?? row.estado_practica ?? row.estado_institucion,
      search: [row.correo, row.cedula, row.semestre].filter(Boolean).join(" "),
      content: <RecordEditor row={row} resource={resource} onChanged={onChanged} />,
    }))} />
  );
}

function labelForRole(role) {
  return { estudiante: "Estudiante", director: "Director", tutor: "Tutor", asesor: "Asesor" }[role] ?? role;
}

ManagedRecords.propTypes = {
  rows: PropTypes.array.isRequired,
  resource: PropTypes.string.isRequired,
  onChanged: PropTypes.func.isRequired,
};
