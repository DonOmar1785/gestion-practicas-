import PropTypes from "prop-types";
import Layout from "../components/Layout.jsx";
import { PAGES } from "../config/pages.js";
import { useAuth } from "../hooks/useAuth.js";
import { useResources } from "../hooks/useResources.js";
import PageContent from "./PageContent.jsx";

// Pantalla genérica: carga los recursos de la página y muestra su contenido.
export default function ResourcePage({ pageKey }) {
  const page = PAGES[pageKey];
  const { user } = useAuth();
  const { data, loading, error, reload } = useResources(page.resources);

  return (
    <Layout title={page.title}>
      <p className="ayuda">
        Datos conectados a Supabase. Las modificaciones hechas desde la API se reflejan automáticamente.
      </p>
      {error && <p className="mensaje error">{error}</p>}
      {loading && !data && <p className="ayuda">Cargando datos…</p>}
      {data && (
        <PageContent pageKey={pageKey} resources={page.resources} data={data} user={user} onChanged={reload} />
      )}
    </Layout>
  );
}

ResourcePage.propTypes = {
  pageKey: PropTypes.string.isRequired,
};
