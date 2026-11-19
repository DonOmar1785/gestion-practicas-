import { useState } from "react";
import PropTypes from "prop-types";
import { api } from "../services/api.js";
import { useAction } from "../hooks/useAction.js";
import { display, getColumns, labelFor, toNumberOrNull } from "../utils/format.js";
import FormStatus from "./FormStatus.jsx";

const DELETE_WARNING =
  "Esta acción es definitiva. Si el registro tiene datos relacionados, no podrá eliminarse. ¿Deseas continuar?";

// Tabla para el Director: permite modificar y eliminar filas.
export default function ManagementTable({ rows, resource, idField, editableFields, onChanged }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const { run, pending, error } = useAction();

  if (rows.length === 0) return <p className="ayuda">No hay registros en Supabase.</p>;
  const columns = getColumns(rows);

  const startEditing = (row) => {
    const fields = editableFields.filter((field) => !field.when || field.when(row));
    setDraft(Object.fromEntries(fields.map((field) => [field.key, row[field.key] ?? ""])));
    setEditingId(row[idField]);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft({});
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const save = (row) =>
    run(async () => {
      const changes = {};
      for (const field of editableFields) {
        if (!(field.key in draft)) continue;
        const value = String(draft[field.key]).trim();
        changes[field.key] = field.type === "number" ? toNumberOrNull(value) : value === "" ? null : value;
      }
      await api.put(`/${resource}/${row[idField]}`, changes);
      cancelEditing();
      onChanged();
    });

  const remove = (row) => {
    if (!window.confirm(DELETE_WARNING)) return;
    run(async () => {
      await api.delete(`/${resource}/${row[idField]}`);
      onChanged();
    });
  };

  return (
    <>
      <FormStatus error={error} />
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{labelFor(column)}</th>
            ))}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowId = row[idField];
            const isEditing = editingId === rowId;
            return (
              <tr key={rowId}>
                {columns.map((column) => {
                  const field = isEditing && column in draft
                    ? editableFields.find((item) => item.key === column)
                    : undefined;
                  return (
                    <td key={column}>
                      {field ? (
                        field.type === "select" ? (
                          <select name={column} value={draft[column]} onChange={handleDraftChange}>
                            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input
                            name={column}
                            type={field.type || "text"}
                            value={draft[column]}
                            onChange={handleDraftChange}
                            required={field.required === true}
                            step={field.type === "number" ? "1" : undefined}
                            min={field.min}
                            max={field.max}
                          />
                        )
                      ) : (
                        display(row[column])
                      )}
                    </td>
                  );
                })}
                <td className="management-actions">
                  {isEditing ? (
                    <>
                      <button type="button" className="btn-mini" disabled={pending} onClick={() => save(row)}>
                        Guardar
                      </button>
                      <button type="button" className="btn-mini" onClick={cancelEditing}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn-mini" onClick={() => startEditing(row)}>
                        Modificar
                      </button>
                      <button type="button" className="btn-mini rojo" disabled={pending} onClick={() => remove(row)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

ManagementTable.propTypes = {
  rows: PropTypes.array.isRequired,
  resource: PropTypes.string.isRequired,
  idField: PropTypes.string.isRequired,
  editableFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      type: PropTypes.string,
      required: PropTypes.bool,
      min: PropTypes.number,
      max: PropTypes.number,
      options: PropTypes.arrayOf(PropTypes.string),
      when: PropTypes.func,
    }),
  ).isRequired,
  onChanged: PropTypes.func.isRequired,
};
