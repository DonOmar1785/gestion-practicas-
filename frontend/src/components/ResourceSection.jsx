import PropTypes from "prop-types";
import { MANAGED_RESOURCES } from "../config/editable.js";
import { RESOURCE_NAMES } from "../config/pages.js";
import { summaryToRows } from "../utils/format.js";
import DataTable from "./DataTable.jsx";
import ManagementTable from "./ManagementTable.jsx";
import Section from "./Section.jsx";

// Muestra un recurso de la API como tabla. Si el usuario es Director y el
// recurso es administrable, la tabla permite modificar y eliminar.
export default function ResourceSection({ resource, value, isDirector, onChanged }) {
  const title = RESOURCE_NAMES[resource] || resource;
  const managed = MANAGED_RESOURCES[resource];

  if (resource === "reports/summary" && value && typeof value === "object") {
    return (
      <Section title={title}>
        <DataTable rows={summaryToRows(value)} />
      </Section>
    );
  }

  return (
    <Section title={title}>
      {isDirector && managed ? (
        <ManagementTable
          rows={Array.isArray(value) ? value : []}
          resource={resource}
          idField={managed.idField}
          editableFields={managed.fields}
          onChanged={onChanged}
        />
      ) : (
        <DataTable rows={Array.isArray(value) ? value : []} />
      )}
    </Section>
  );
}

ResourceSection.propTypes = {
  resource: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isDirector: PropTypes.bool,
  onChanged: PropTypes.func.isRequired,
};
