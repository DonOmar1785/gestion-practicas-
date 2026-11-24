import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";

const CYCLE_INITIAL = { nombre_periodo: "", estado_ciclo: "Abierto" };
const PRACTICE_INITIAL = {
  id_ciclo: "",
  id_programa: "",
  semestre: "",
  tipo_practica: "",
  fecha_inicio: "",
  fecha_fin: "",
  horas_requeridas: "200",
};

export function CycleForm({ actorId, onSaved }) {
  const { values, handleChange, reset } = useForm(CYCLE_INITIAL);
  const { run, pending, error } = useAction();

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/cycles", {
        nombre_periodo: values.nombre_periodo,
        estado_ciclo: values.estado_ciclo,
        id_director: actorId,
      });
      reset();
      onSaved("Ciclo creado.");
    });
  };

  return (
    <Section title="Ciclos académicos">
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>Nombre del ciclo
        <input
          name="nombre_periodo"
          required
          maxLength={20}
          placeholder="Nombre del ciclo (ej. 2027-1)"
          value={values.nombre_periodo}
          onChange={handleChange}
        />
        </label>
        <label>Estado
        <select name="estado_ciclo" value={values.estado_ciclo} onChange={handleChange}>
          <option value="Abierto">Abierto</option>
          <option value="Cerrado">Cerrado</option>
        </select>
        </label>
        <button className="btn-form" disabled={pending}>Crear ciclo</button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

CycleForm.propTypes = {
  actorId: PropTypes.number.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export function PracticeForm({ data, onSaved }) {
  const { values, handleChange, reset } = useForm(PRACTICE_INITIAL);
  const [selectedIds, setSelectedIds] = useState([]);
  const [placements, setPlacements] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const { run, pending, error, setError, clearError } = useAction();
  const [step, setStep] = useState(1);
  const [shared, setShared] = useState({});
  const heading = useRef(null);

  useEffect(() => {
    if (step > 1) heading.current?.focus();
  }, [step]);

  const students = useMemo(() => {
    const alreadyPracticing = new Set(
      (data.practices || [])
        .filter((practice) =>
          Number(practice.id_ciclo) === Number(values.id_ciclo) &&
          Number(practice.semestre) === Number(values.semestre),
        )
        .map((practice) => Number(practice.id_estudiante)),
    );
    const search = studentSearch.trim().toLocaleLowerCase();
    return (data.users || []).filter((user) =>
      String(user.rol).toLowerCase() === "estudiante" &&
      user.estado === "Activo" &&
      Number(user.id_programa) === Number(values.id_programa) &&
      Number(user.semestre) === Number(values.semestre) &&
      !alreadyPracticing.has(Number(user.id_usuario)) &&
      (!search || `${user.nombre_completo} ${user.cedula || ""}`.toLocaleLowerCase().includes(search)),
    );
  }, [data.practices, data.users, studentSearch, values.id_ciclo, values.id_programa, values.semestre]);

  const tutors = (data.users || []).filter((user) =>
    String(user.rol).toLowerCase() === "tutor" && user.estado === "Activo",
  );
  const advisors = (data.users || []).filter((user) =>
    String(user.rol).toLowerCase() === "asesor" && user.estado === "Activo",
  );
  const institutions = (data.institutions || []).filter((institution) =>
    institution.estado_institucion === "Activo",
  );
  const openCycles = (data.cycles || []).filter((cycle) => cycle.estado_ciclo === "Abierto");
  const selectedStudents = selectedIds
    .map((id) => (data.users || []).find((user) => Number(user.id_usuario) === id))
    .filter(Boolean);

  const resetSelection = (event) => {
    handleChange(event);
    if (["id_ciclo", "id_programa", "semestre"].includes(event.target.name)) {
      setSelectedIds([]);
      setPlacements({});
      setStudentSearch("");
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  };

  const setPlacement = (studentId, field, value) => {
    setPlacements((current) => ({
      ...current,
      [studentId]: updatePlacement(current[studentId], field, value),
    }));
  };

  const selectVisibleStudents = () => {
    const visibleIds = students.map((student) => Number(student.id_usuario));
    const allSelected = visibleIds.length && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const applyShared = () => {
    clearError();
    if (!placementComplete(shared)) {
      setError("Elige institución, tutor, asesor, modalidad y, si corresponde, la fecha de ARL.");
      return;
    }
    setPlacements(Object.fromEntries(selectedStudents.map((student) => [student.id_usuario, { ...shared }])));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    clearError();
    if (step < 3) {
      if (step === 2 && !selectedStudents.length) {
        setError("Selecciona al menos un estudiante de la lista.");
        return;
      }
      setStep(step + 1);
      return;
    }
    const incomplete = selectedStudents.find((student) => !placementComplete(placements[student.id_usuario]));
    if (!selectedStudents.length || incomplete) {
      setError(incomplete ? `Completa la asignación de ${incomplete.nombre_completo}.` : "Selecciona al menos un estudiante.");
      return;
    }
    run(async () => {
      await api.post("/practices/batch", {
        id_ciclo: Number(values.id_ciclo),
        id_programa: Number(values.id_programa),
        semestre: Number(values.semestre),
        tipo_practica: values.tipo_practica,
        fecha_inicio: values.fecha_inicio,
        fecha_fin: values.fecha_fin,
        horas_requeridas: Number(values.horas_requeridas),
        estudiantes: selectedStudents.map((student) => {
          const placement = placements[student.id_usuario] || {};
          return {
            id_estudiante: Number(student.id_usuario),
            id_institucion: Number(placement.id_institucion),
            id_tutor: Number(placement.id_tutor),
            id_asesor: Number(placement.id_asesor),
            modalidad: placement.modalidad,
            fecha_vencimiento_arl: placement.fecha_vencimiento_arl || null,
          };
        }),
      });
      reset();
      setSelectedIds([]);
      setPlacements({});
      setStudentSearch("");
      setShared({});
      setStep(1);
      onSaved(`Asignaciones guardadas: ${selectedStudents.length}.`);
    });
  };

  return (
    <Section title="Asignar prácticas a un grupo">
      <form className="form-grid" onSubmit={handleSubmit}>
        <ol className="steps">
          {["Datos del grupo", "Estudiantes", "Asignación"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}>{label}</li>)}
        </ol>
        <h3 ref={heading} tabIndex={-1}>{["Define los datos de la práctica", "Elige los estudiantes del grupo", "Asigna institución y responsables"][step - 1]}</h3>
        {step === 1 && <div className="field-grid">
          <label>
            Ciclo
            <select name="id_ciclo" required value={values.id_ciclo} onChange={resetSelection}>
              <option value="">Selecciona un ciclo abierto</option>
              <OptionList items={openCycles} valueKey="id_ciclo" labelKey="nombre_periodo" />
            </select>
          </label>
          <label>
            Programa
            <select name="id_programa" required value={values.id_programa} onChange={resetSelection}>
              <option value="">Selecciona un programa</option>
              <OptionList items={data.programs} valueKey="id_programa" labelKey="nombre_programa" />
            </select>
          </label>
          <label>
            Semestre
            <select name="semestre" required value={values.semestre} onChange={resetSelection}>
              <option value="">Selecciona un semestre</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo de práctica
            <select name="tipo_practica" required value={values.tipo_practica} onChange={handleChange}>
              <option value="">Selecciona el tipo</option>
              <option value="Pedagógica">Pedagógica</option>
              <option value="Pedagógica investigativa">Pedagógica investigativa</option>
            </select>
          </label>
          <label>
            Fecha de inicio
            <input name="fecha_inicio" type="date" required value={values.fecha_inicio} onChange={handleChange} />
          </label>
          <label>
            Fecha de fin
            <input name="fecha_fin" type="date" required min={values.fecha_inicio || undefined} value={values.fecha_fin} onChange={handleChange} />
          </label>
          <label>
            Horas requeridas
            <input name="horas_requeridas" type="number" min="0.01" step="0.01" required value={values.horas_requeridas} onChange={handleChange} />
          </label>
        </div>}

        {step === 2 && <div className="student-selection">
          <div className="student-selection-header">
            <div>
              <p>{students.length} disponibles · {selectedIds.length} seleccionados</p>
            </div>
            <button type="button" className="btn-mini" onClick={selectVisibleStudents} disabled={!students.length}>
              {students.length && students.every((student) => selectedIds.includes(Number(student.id_usuario)))
                ? "Quitar selección"
                : "Seleccionar resultados"}
            </button>
          </div>
          <input
            type="search"
            aria-label="Buscar estudiante"
            placeholder="Buscar por nombre o cédula"
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            disabled={!values.id_programa || !values.semestre || !values.id_ciclo}
          />
          {!values.id_programa || !values.semestre || !values.id_ciclo
            ? <p className="ayuda">Primero selecciona ciclo, programa y semestre.</p>
            : students.length
              ? (
                <div className="student-options">
                  {students.map((student) => (
                    <label className="student-option" key={student.id_usuario}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(Number(student.id_usuario))}
                        onChange={() => toggleStudent(Number(student.id_usuario))}
                      />
                      <span>
                        <strong>{student.nombre_completo}</strong>
                        <small>Cédula: {student.cedula || "sin registrar"}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )
              : <p className="ayuda">No hay estudiantes disponibles para este grupo.</p>}
        </div>}

        {step === 3 && (
          <>
            <p className="form-context">{selectedStudents.length} estudiantes · Semestre {values.semestre} · {values.horas_requeridas} horas</p>
            {selectedStudents.length > 1 && (
              <fieldset className="assignment-group">
                <legend>Asignación común</legend>
                <p className="ayuda">Aplica los mismos datos a todos. Después puedes ajustar los casos individuales.</p>
                <PlacementFields placement={shared} institutions={institutions} tutors={tutors} advisors={advisors} onChange={(field, value) => setShared((current) => updatePlacement(current, field, value))} />
                <button type="button" className="btn-mini" disabled={pending} onClick={applyShared}>Aplicar a todo el grupo</button>
              </fieldset>
            )}
            <div className="record-list">
              {selectedStudents.map((student) => {
                const placement = placements[student.id_usuario] || {};
                const complete = placementComplete(placement);
                return (
                  <details className="record" key={student.id_usuario} open={selectedStudents.length === 1 ? true : undefined}>
                    <summary>
                      <span className="record-caption">
                        <strong>{student.nombre_completo}</strong>
                        {complete && <small>{institutions.find((institution) => String(institution.id_institucion) === placement.id_institucion)?.nombre_institucion} · {placement.modalidad}</small>}
                      </span>
                      <span className="status-pill" data-state={complete ? "Aprobada" : "Pendiente"}>{complete ? "Lista" : "Por completar"}</span>
                    </summary>
                    <div className="record-body">
                      <PlacementFields placement={placement} institutions={institutions} tutors={tutors} advisors={advisors} onChange={(field, value) => setPlacement(student.id_usuario, field, value)} />
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}

        <FormStatus error={error} />
        <div className="button-row">
          {step > 1 && <button type="button" className="btn-mini" disabled={pending} onClick={() => { clearError(); setStep(step - 1); }}>Volver</button>}
          <button className="btn-form" disabled={pending}>{step < 3 ? "Continuar" : pending ? "Asignando…" : `Confirmar ${selectedStudents.length} asignaciones`}</button>
        </div>
      </form>
    </Section>
  );
}

function placementComplete(placement = {}) {
  return placement.id_institucion && placement.id_tutor && placement.id_asesor &&
    (placement.modalidad === "Virtual" || (placement.modalidad === "Presencial" && placement.fecha_vencimiento_arl));
}

function updatePlacement(current, field, value) {
  return {
    ...current,
    [field]: value,
    ...(field === "modalidad" && value === "Virtual" ? { fecha_vencimiento_arl: "" } : {}),
  };
}

function PlacementFields({ placement, institutions, tutors, advisors, onChange }) {
  return (
    <div className="field-grid">
      {[
        ["id_institucion", "Institución", institutions, "id_institucion", "nombre_institucion"],
        ["id_tutor", "Tutor", tutors, "id_usuario", "nombre_completo"],
        ["id_asesor", "Asesor", advisors, "id_usuario", "nombre_completo"],
      ].map(([field, label, items, valueKey, labelKey]) => (
        <label key={field}>{label}
          <select value={placement[field] || ""} onChange={(event) => onChange(field, event.target.value)}>
            <option value="">Selecciona</option>
            <OptionList items={items} valueKey={valueKey} labelKey={labelKey} />
          </select>
        </label>
      ))}
      <label>Modalidad
        <select value={placement.modalidad || ""} onChange={(event) => onChange("modalidad", event.target.value)}>
          <option value="">Selecciona</option>
          <option value="Presencial">Presencial</option>
          <option value="Virtual">Virtual</option>
        </select>
      </label>
      {placement.modalidad === "Presencial" && (
        <label>Vencimiento de ARL
          <input type="date" value={placement.fecha_vencimiento_arl || ""} onChange={(event) => onChange("fecha_vencimiento_arl", event.target.value)} />
        </label>
      )}
    </div>
  );
}

PlacementFields.propTypes = {
  placement: PropTypes.object.isRequired,
  institutions: PropTypes.array.isRequired,
  tutors: PropTypes.array.isRequired,
  advisors: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};

PracticeForm.propTypes = {
  data: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

