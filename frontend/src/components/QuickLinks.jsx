import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Section from "./Section.jsx";

// Botones de acceso rápido a otras pantallas. Cada par es [texto, ruta].
export default function QuickLinks({ links }) {
  return (
    <Section title="Accesos rápidos">
      <div className="quick-links">
        {links.map(([label, path]) => (
          <Link className="btn-form" to={path} key={path}>
            {label}
          </Link>
        ))}
      </div>
    </Section>
  );
}

QuickLinks.propTypes = {
  links: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
};
