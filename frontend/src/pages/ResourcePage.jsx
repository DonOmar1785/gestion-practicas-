import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Layout from "../components/Layout.jsx";
import { PAGES } from "../config/pages.js";
import { useAuth } from "../hooks/useAuth.js";
import { useResources } from "../hooks/useResources.js";
import PageContent from "./PageContent.jsx";

export default function ResourcePage({ pageKey }) {
  const page = PAGES[pageKey];
  const { user } = useAuth();
  const { data, loading, error, reload } = useResources(page.resources);
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);

  useEffect(() => {
    noticeRef.current?.focus();
  }, [notice]);

  const onChanged = (message = "Cambios guardados.") => {
    setNotice((current) => ({ message, id: (current?.id ?? 0) + 1 }));
    reload();
  };

  return (
    <Layout title={page.title} description={page.description}>
      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>
          <button className="btn-mini" type="button" onClick={reload}>Reintentar</button>
        </div>
      )}
      {loading && !data && <p className="empty-state" role="status">Cargando tu espacio de trabajo…</p>}
      {notice && (
        <div key={notice.id} ref={noticeRef} tabIndex={-1} className="save-notice" role="status">
          <span>{notice.message}</span>
          <button type="button" aria-label="Cerrar confirmación" onClick={() => setNotice(null)}>×</button>
        </div>
      )}
      {data && <PageContent pageKey={pageKey} data={data} user={user} onChanged={onChanged} />}
    </Layout>
  );
}

ResourcePage.propTypes = { pageKey: PropTypes.string.isRequired };
