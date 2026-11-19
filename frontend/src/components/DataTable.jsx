import PropTypes from "prop-types";
import { display, getColumns, isHttpUrl, labelFor } from "../utils/format.js";

// Tabla de solo lectura: las columnas salen automáticamente de los datos.
export default function DataTable({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p className="ayuda">No hay registros en Supabase.</p>;
  }
  const columns = getColumns(rows);

  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{labelFor(column)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => {
              const value = row?.[column];
              return (
                <td key={column}>
                  {isHttpUrl(value) ? (
                    <a href={value} target="_blank" rel="noopener noreferrer">
                      Abrir enlace
                    </a>
                  ) : (
                    display(value)
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

DataTable.propTypes = {
  rows: PropTypes.array,
};
