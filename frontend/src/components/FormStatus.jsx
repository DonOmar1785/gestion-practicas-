import PropTypes from "prop-types";

// Muestra el mensaje de error (o de éxito) de un formulario.
export default function FormStatus({ error, message }) {
  if (error) {
    return (
      <p className="mensaje error" role="alert">
        {error}
      </p>
    );
  }
  if (message) return <p className="mensaje ok">{message}</p>;
  return null;
}

FormStatus.propTypes = {
  error: PropTypes.string,
  message: PropTypes.string,
};
