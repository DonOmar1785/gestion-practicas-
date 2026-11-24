import { useId, useState } from "react";
import PropTypes from "prop-types";
import { isHttpUrl } from "../utils/format.js";

export function Views({ choices, initial }) {
  const id = useId();
  const [active, setActive] = useState(initial ?? choices[0].id);
  const current = choices.find((choice) => choice.id === active) ?? choices[0];
  return (
    <>
      <nav className="view-switch" aria-label="Vistas de esta página">
        {choices.map((choice, index) => (
          <button key={choice.id} type="button" aria-controls={`${id}-${index}`} aria-pressed={current.id === choice.id} onClick={() => setActive(choice.id)}>
            {choice.title}{choice.count === undefined ? "" : ` (${choice.count})`}
          </button>
        ))}
      </nav>
      {choices.map((choice, index) => (
        <div key={choice.id} id={`${id}-${index}`} hidden={current.id !== choice.id}>{choice.content}</div>
      ))}
    </>
  );
}

Views.propTypes = {
  choices: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    count: PropTypes.number,
    content: PropTypes.node,
  })).isRequired,
  initial: PropTypes.string,
};

function normalize(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function RecordList({ records, empty, filterLabel = "Buscar registros", expandSingle = false }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const filter = normalize(query.trim());
  const visible = new Set(records.filter((record) => normalize([record.title, record.subtitle, record.status, record.search].join(" ")).includes(filter)));
  return (
    <div className="record-list">
      {records.length > 0 && (
        <label className="search-field">
          {filterLabel}
          <input type="search" value={query} placeholder="Escribe para filtrar" onChange={(event) => setQuery(event.target.value)} />
        </label>
      )}
      {visible.size === 0 && <p className="empty-state">{records.length ? "No hay coincidencias con tu búsqueda." : empty}</p>}
      {records.map((record) => {
        const caption = (
          <>
            <span className="record-caption">
              <strong>{record.title}</strong>
              {record.subtitle && <small>{record.subtitle}</small>}
            </span>
            {record.status && <span className="status-pill" data-state={record.status}>{record.status}</span>}
          </>
        );
        const hidden = !visible.has(record);
        if (!record.content) return <div key={record.id} className="record record-static" hidden={hidden}>{caption}</div>;
        return (
          <details key={record.id} name={id} className="record" hidden={hidden} open={expandSingle && records.length === 1 ? true : undefined}>
            <summary>{caption}</summary>
            <div className="record-body">{record.content}</div>
          </details>
        );
      })}
    </div>
  );
}

RecordList.propTypes = {
  records: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    status: PropTypes.string,
    search: PropTypes.string,
    content: PropTypes.node,
  })).isRequired,
  empty: PropTypes.string.isRequired,
  filterLabel: PropTypes.string,
  expandSingle: PropTypes.bool,
};

export function Facts({ items }) {
  const filled = items.filter(([, value]) => value !== undefined && value !== null && value !== "");
  return filled.length > 0 && (
    <dl className="facts">
      {filled.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

Facts.propTypes = { items: PropTypes.arrayOf(PropTypes.array).isRequired };

export function ExternalLink({ url, children }) {
  return isHttpUrl(url) ? <a className="text-link" href={url} target="_blank" rel="noreferrer">{children}</a> : null;
}

ExternalLink.propTypes = { url: PropTypes.string, children: PropTypes.node.isRequired };
