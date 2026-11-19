import PropTypes from "prop-types";
import { SEMESTER_GUIDES } from "../config/semesterGuides.js";
import Section from "./Section.jsx";

// Ruta de práctica del estudiante según su semestre.
export default function SemesterGuide({ semester }) {
  const number = Number(semester);
  const guide = SEMESTER_GUIDES[number];

  if (!guide) {
    return (
      <Section title="Tu ruta de práctica">
        <p className="ayuda">
          Tu perfil todavía no tiene un semestre válido asignado. Solicita al Director que actualice tu semestre
          para mostrar la ruta de práctica correspondiente.
        </p>
      </Section>
    );
  }

  return (
    <Section title={`Tu ruta del semestre ${number}: ${guide.title}`}>
      <p>{guide.description}</p>
      <ul className="semester-focus-list">
        {guide.focus.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="ayuda">
        Las preguntas y entregas de tus bitácoras son configuradas por el Director o tutor académico según tu
        práctica.
      </p>
    </Section>
  );
}

SemesterGuide.propTypes = {
  semester: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
