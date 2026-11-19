import PropTypes from "prop-types";

// Bloque con título que agrupa tablas o formularios.
export default function Section({ title, children }) {
  return (
    <section className="table-container">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};
