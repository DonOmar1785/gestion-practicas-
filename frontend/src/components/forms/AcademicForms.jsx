import PropTypes from "prop-types";
import ManagedRecords from "../ManagedRecords.jsx";
import { RecordList, Views } from "../WorkArea.jsx";
import UserForm from "./UserForm.jsx";
import ProgramForm from "./ProgramForm.jsx";
import InstitutionForm from "./InstitutionForm.jsx";

export default function AcademicForms({ data, onChanged }) {
  const users = data.users || [];
  const programs = data.programs || [];
  const institutions = data.institutions || [];

  return <Views choices={[
    { id: "users", title: "Personas", content: <Views choices={[
      { id: "list", title: "Buscar usuarios", content: <ManagedRecords rows={users} resource="users" onChanged={onChanged} /> },
      { id: "create", title: "Registrar usuario", content: <UserForm programs={programs} onSaved={onChanged} /> },
    ]} /> },
    { id: "institutions", title: "Instituciones", content: <Views choices={[
      { id: "list", title: "Buscar instituciones", content: <ManagedRecords rows={institutions} resource="institutions" onChanged={onChanged} /> },
      { id: "create", title: "Registrar institución", content: <InstitutionForm onSaved={onChanged} /> },
    ]} /> },
    { id: "programs", title: "Programas", content: <Views choices={[
      { id: "list", title: "Buscar programas", content: <RecordList empty="Aún no hay programas registrados." records={programs.map((program) => ({
        id: program.id_programa,
        title: program.nombre_programa,
        subtitle: program.facultad,
      }))} /> },
      { id: "create", title: "Registrar programa", content: <ProgramForm onSaved={onChanged} /> },
    ]} /> },
  ]} />;
}

AcademicForms.propTypes = { data: PropTypes.object.isRequired, onChanged: PropTypes.func.isRequired };
