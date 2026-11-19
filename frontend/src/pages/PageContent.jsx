import PropTypes from "prop-types";
import PageWidgets from "../components/PageWidgets.jsx";
import ResourceSection from "../components/ResourceSection.jsx";
import SemesterGuide from "../components/SemesterGuide.jsx";
import AcademicForms from "../components/forms/AcademicForms.jsx";
import DirectorSummary from "../components/forms/DirectorSummary.jsx";
import DocumentForm from "../components/forms/DocumentForm.jsx";
import LogbookForm from "../components/forms/LogbookForm.jsx";
import PracticeForms from "../components/forms/PracticeForms.jsx";
import ReviewActions from "../components/forms/ReviewActions.jsx";
import SessionActions from "../components/forms/SessionActions.jsx";
import SessionForm from "../components/forms/SessionForm.jsx";
import TemplateForms from "../components/forms/TemplateForms.jsx";
import WorkflowActions from "../components/forms/WorkflowActions.jsx";

// Páginas que arman su propio contenido en lugar de mostrar una tabla por recurso.
const CUSTOM_LAYOUT = ["director", "gestion-academica"];

// Decide qué tablas y formularios se muestran en cada pantalla.
export default function PageContent({ pageKey, resources, data, user, onChanged }) {
  const isDirector = user.rol === "director";

  return (
    <>
      <PageWidgets pageKey={pageKey} data={data} />

      {!CUSTOM_LAYOUT.includes(pageKey) &&
        resources.map((resource) => (
          <ResourceSection
            key={resource}
            resource={resource}
            value={data[resource]}
            isDirector={isDirector}
            onChanged={onChanged}
          />
        ))}

      {user.rol === "estudiante" && <SemesterGuide semester={user.semestre} />}

      {pageKey === "director" && <DirectorSummary data={data} isDirector={isDirector} onChanged={onChanged} />}
      {pageKey === "gestion-academica" && <AcademicForms data={data} isDirector={isDirector} onChanged={onChanged} />}
      {pageKey === "documentos" && <DocumentForm practices={data.practices} onSaved={onChanged} />}
      {pageKey === "formulario" && (
        <SessionForm programs={data.programs} cycles={data.cycles} sessions={data.sessions} onSaved={onChanged} />
      )}
      {pageKey === "docente" && <TemplateForms templates={data.templates} onSaved={onChanged} />}
      {pageKey === "gestion-practicas" && (
        <PracticeForms data={data} actorId={Number(user.id)} onSaved={onChanged} />
      )}
      {pageKey === "bitacora" && <LogbookForm data={data} semester={user.semestre} onSaved={onChanged} />}

      {["documentos", "seguimiento", "docente"].includes(pageKey) && (
        <WorkflowActions data={data} role={user.rol} onSaved={onChanged} />
      )}
      {pageKey === "formulario" && <SessionActions sessions={data.sessions} onSaved={onChanged} />}
      {["revision", "observaciones", "asesor"].includes(pageKey) && (
        <ReviewActions logbooks={data.logbooks} role={user.rol} onSaved={onChanged} />
      )}
    </>
  );
}

PageContent.propTypes = {
  pageKey: PropTypes.string.isRequired,
  resources: PropTypes.arrayOf(PropTypes.string).isRequired,
  data: PropTypes.object.isRequired,
  user: PropTypes.shape({
    id: PropTypes.string,
    rol: PropTypes.string.isRequired,
    semestre: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onChanged: PropTypes.func.isRequired,
};
