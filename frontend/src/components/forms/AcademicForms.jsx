import PropTypes from "prop-types";
import { MANAGED_RESOURCES } from "../../config/editable.js";
import DataTable from "../DataTable.jsx";
import ManagementTable from "../ManagementTable.jsx";
import Section from "../Section.jsx";
import UserForm from "./UserForm.jsx";
import ProgramForm from "./ProgramForm.jsx";
import InstitutionForm from "./InstitutionForm.jsx";

// Pantalla "Gestión académica": indicadores, formularios de creación y tablas.
export default function AcademicForms({ data, isDirector, onChanged }) {
  const users = data.users || [];
  const programs = data.programs || [];
  const institutions = data.institutions || [];

  return (
    <>
      <UserForm programs={programs} onSaved={onChanged} />
      <ProgramForm onSaved={onChanged} />
      <InstitutionForm onSaved={onChanged} />

      <Section title="Usuarios registrados">
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

      <Section title="Programas académicos">
        <DataTable rows={programs} />
      </Section>

      <Section title="Instituciones">
        {isDirector ? (
          <ManagementTable
            rows={institutions}
            resource="institutions"
            idField={MANAGED_RESOURCES.institutions.idField}
            editableFields={MANAGED_RESOURCES.institutions.fields}
            onChanged={onChanged}
          />
        ) : (
          <DataTable rows={institutions} />
        )}
      </Section>
    </>
  );
}

AcademicForms.propTypes = {
  data: PropTypes.object.isRequired,
  isDirector: PropTypes.bool,
  onChanged: PropTypes.func.isRequired,
};
