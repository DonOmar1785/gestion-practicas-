import PropTypes from "prop-types";

// Nivel del estudiante e insignias (desbloqueadas o bloqueadas).
export default function LevelCard({ level, badges }) {
  const unlocked = badges.filter((badge) => badge.unlocked).length;

  return (
    <div className="progreso-card">
      <h2>
        Nivel {level.number}: {level.name}
      </h2>
      <p className="ayuda">
        {level.next
          ? `Te faltan ${level.hoursToNext} horas para alcanzar el nivel «${level.next}».`
          : "¡Alcanzaste el nivel máximo!"}
      </p>
      <h3 className="subtitulo">
        Mis insignias{" "}
        <small>
          ({unlocked} de {badges.length})
        </small>
      </h3>
      <div className="insignias">
        {badges.map((badge) => (
          <div className={`insignia${badge.unlocked ? "" : " bloqueada"}`} key={badge.id}>
            <span className="insignia-icono">{badge.icon}</span>
            <b>{badge.title}</b>
            <small>{badge.description}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

LevelCard.propTypes = {
  level: PropTypes.shape({
    number: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    next: PropTypes.string,
    hoursToNext: PropTypes.number.isRequired,
  }).isRequired,
  badges: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      unlocked: PropTypes.bool.isRequired,
    }),
  ).isRequired,
};
