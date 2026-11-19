import PropTypes from "prop-types";

// Tarjetas con cifras (ej. "Bitácoras: 5").
export default function StatCards({ items }) {
  return (
    <section className="stats">
      {items.map(({ label, value }) => (
        <div className="stat-card" key={label}>
          <h3>{label}</h3>
          <p>{value}</p>
        </div>
      ))}
    </section>
  );
}

StatCards.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }),
  ).isRequired,
};
