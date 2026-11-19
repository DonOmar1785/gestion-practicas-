import PropTypes from "prop-types";

// Tarjetas de acción con borde de color: "alerta" (rojo), "advertencia" o "correcto".
export default function ActionCards({ items }) {
  return (
    <div className="acciones-container">
      {items.map(({ label, value, tone }) => (
        <div className={`accion-card ${tone}`} key={label}>
          <h3>{label}</h3>
          <p>{value}</p>
        </div>
      ))}
    </div>
  );
}

ActionCards.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      tone: PropTypes.oneOf(["alerta", "advertencia", "correcto"]).isRequired,
    }),
  ).isRequired,
};
