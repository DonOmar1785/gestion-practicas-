import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="pantalla-centrada">
      <div className="table-container">
        <h2>Página no encontrada</h2>
        <p className="ayuda">La dirección que escribiste no existe.</p>
        <Link className="btn-form" to="/">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
