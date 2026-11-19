import { useMemo, useState } from "react";
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

function CycleForm({ actorId, onSaved }) {
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
      onSaved();
    });
  };

  return (
    <Section title="Ciclos académicos">
      <form className="form-grid" onSubmit={handleSubmit}>
        <input
          name="nombre_periodo"
          required
          maxLength={20}
          placeholder="Nombre del ciclo (ej. 2027-1)"
          value={values.nombre_periodo}
          onChange={handleChange}
        />
        <select name="estado_ciclo" value={values.estado_ciclo} onChange={handleChange}>
          <option value="Abierto">Abierto</option>
          <option value="Cerrado">Cerrado</option>
        </select>
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

function PracticeForm({ data, onSaved }) {
  const { values, handleChange, reset } = useForm(PRACTICE_INITIAL);
  const [selectedIds, setSelectedIds] = useState([]);
  const [placements, setPlacements] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const { run, pending, error, setError } = useAction();

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
      [studentId]: {
        ...current[studentId],
        [field]: value,
        ...(field === "modalidad" && value === "Virtual" ? { fecha_vencimiento_arl: "" } : {}),
      },
    }));
  };

  const selectVisibleStudents = () => {
    const visibleIds = students.map((student) => Number(student.id_usuario));
    const allSelected = visibleIds.length && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedStudents.length) {
      setError("Selecciona al menos un estudiante de la lista.");
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
      onSaved();
    });
  };

  return (
    <Section title="Crear prácticas para un grupo">
      <p className="ayuda">
        Elige el ciclo, programa y semestre. El sistema muestra los estudiantes disponibles; no tienes que escribir sus cédulas.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
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
        </div>

        <div className="student-selection">
          <div className="student-selection-header">
            <div>
              <h3>Estudiantes disponibles</h3>
              <p>{students.length} disponibles · {selectedIds.length} seleccionados</p>
            </div>
            <button type="button" className="btn-mini" onClick={selectVisibleStudents} disabled={!students.length}>
              {students.length && students.every((student) => selectedIds.includes(Number(student.id_usuario)))
                ? "Quitar selección"
                : "Seleccionar todos"}
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
        </div>

        {selectedStudents.length > 0 && (
          <div className="student-placement-list">
            <h3>Completa los datos de cada práctica</h3>
            <p className="ayuda">La institución, los responsables y la modalidad pueden variar por estudiante.</p>
            {selectedStudents.map((student) => {
              const placement = placements[student.id_usuario] || {};
              return (
                <fieldset className="student-placement" key={student.id_usuario}>
                  <legend>{student.nombre_completo} · {student.cedula || "Cédula sin registrar"}</legend>
                  <div className="form-grid">
                    <label>
                      Institución
                      <select required value={placement.id_institucion || ""} onChange={(event) => setPlacement(student.id_usuario, "id_institucion", event.target.value)}>
                        <option value="">Selecciona una institución</option>
                        <OptionList items={institutions} valueKey="id_institucion" labelKey="nombre_institucion" />
                      </select>
                    </label>
                    <label>
                      Tutor
                      <select required value={placement.id_tutor || ""} onChange={(event) => setPlacement(student.id_usuario, "id_tutor", event.target.value)}>
                        <option value="">Selecciona un tutor</option>
                        <OptionList items={tutors} valueKey="id_usuario" labelKey="nombre_completo" />
                      </select>
                    </label>
                    <label>
                      Asesor
                      <select required value={placement.id_asesor || ""} onChange={(event) => setPlacement(student.id_usuario, "id_asesor", event.target.value)}>
                        <option value="">Selecciona un asesor</option>
                        <OptionList items={advisors} valueKey="id_usuario" labelKey="nombre_completo" />
                      </select>
                    </label>
                    <label>
                      Modalidad
                      <select required value={placement.modalidad || ""} onChange={(event) => setPlacement(student.id_usuario, "modalidad", event.target.value)}>
                        <option value="">Selecciona modalidad</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Virtual">Virtual</option>
                      </select>
                    </label>
                    {placement.modalidad === "Presencial" && (
                      <label>
                        Vencimiento ARL
                        <input
                          required
                          type="date"
                          value={placement.fecha_vencimiento_arl || ""}
                          onChange={(event) => setPlacement(student.id_usuario, "fecha_vencimiento_arl", event.target.value)}
                        />
                      </label>
                    )}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}

        <button className="btn-form" disabled={pending || !selectedStudents.length}>
          Crear {selectedStudents.length || ""} práctica{selectedStudents.length === 1 ? "" : "s"}
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

PracticeForm.propTypes = {
  data: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default function PracticeForms({ data, actorId, onSaved }) {
  return (
    <>
      <CycleForm actorId={actorId} onSaved={onSaved} />
      <PracticeForm data={data} onSaved={onSaved} />
    </>
  );
}

PracticeForms.propTypes = {
  data: PropTypes.object.isRequired,
  actorId: PropTypes.number.isRequired,
  onSaved: PropTypes.func.isRequired,
};
