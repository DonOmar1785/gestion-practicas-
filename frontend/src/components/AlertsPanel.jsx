import PropTypes from "prop-types";

// Panel con una lista de avisos (o un mensaje si no hay ninguno).
export default function AlertsPanel({ title, items, emptyText = "Todo en orden." }) {
  return (
    <div className="alertas-panel">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="ayuda">{emptyText}</p>
      ) : (
        items.map((text) => (
          <div className="alerta-item" key={text}>
            {text}
          </div>
        ))
      )}
    </div>
  );
}

AlertsPanel.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  emptyText: PropTypes.string,
};
