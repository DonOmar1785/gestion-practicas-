import PropTypes from "prop-types";
import { MANAGED_RESOURCES } from "../../config/editable.js";
import { summaryToRows } from "../../utils/format.js";
import DataTable from "../DataTable.jsx";
import ManagementTable from "../ManagementTable.jsx";
import Section from "../Section.jsx";

const RECENT_ACTIVITY_LIMIT = 30;

// Panel del director: resumen, usuarios, prácticas y actividad reciente.
export default function DirectorSummary({ data, isDirector, onChanged }) {
  const users = data.users || [];
  const practices = data.practices || [];

  return (
    <>
      <Section title="Resumen actual">
        <DataTable rows={summaryToRows(data["reports/summary"])} />
      </Section>

      <Section title="Usuarios">
        {isDirector ? (
          <ManagementTable
            rows={users}
            resource="users"
            idField={MANAGED_RESOURCES.users.idField}
            editableFields={MANAGED_RESOURCES.users.fields}
            onChanged={onChanged}
          />
        ) : (
          <DataTable rows={users} />
        )}
      </Section>

      <Section title="Prácticas">
        {isDirector ? (
          <ManagementTable
            rows={practices}
            resource="practices"
            idField={MANAGED_RESOURCES.practices.idField}
            editableFields={MANAGED_RESOURCES.practices.fields}
            onChanged={onChanged}
          />
        ) : (
          <DataTable rows={practices} />
        )}
      </Section>

      <Section title="Actividad reciente">
        <DataTable rows={(data.audit || []).slice(0, RECENT_ACTIVITY_LIMIT)} />
      </Section>
    </>
  );
}

DirectorSummary.propTypes = {
  data: PropTypes.object.isRequired,
  isDirector: PropTypes.bool,
  onChanged: PropTypes.func.isRequired,
};
