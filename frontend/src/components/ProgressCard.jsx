import PropTypes from "prop-types";

// Barra de progreso de horas con porcentaje e hitos al 25, 50 y 75 %.
export default function ProgressCard({ done, required, percent }) {
  return (
    <div className="progreso-card">
      <h2>Progreso de Horas de Práctica</h2>
      <div className="horas-info">
        <span>
          <b>{done}</b> Horas Completadas
        </span>
        <span>
          <b>{required}</b> Horas Requeridas
        </span>
      </div>
      <div
        className="barra-progreso"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progreso de horas de práctica"
      >
        <div className="barra-llenada" style={{ width: `${percent}%` }} />
        {[25, 50, 75].map((milestone) => (
          <i className="hito" style={{ left: `${milestone}%` }} key={milestone} />
        ))}
      </div>
      <p className="porcentaje">{percent}% completado</p>
    </div>
  );
}

ProgressCard.propTypes = {
  done: PropTypes.number.isRequired,
  required: PropTypes.number.isRequired,
  percent: PropTypes.number.isRequired,
};
