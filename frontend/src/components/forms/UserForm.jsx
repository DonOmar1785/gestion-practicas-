import PropTypes from "prop-types";
import { api } from "../../services/api.js";
import { useForm } from "../../hooks/useForm.js";
import { useAction } from "../../hooks/useAction.js";
import FormStatus from "../FormStatus.jsx";
import OptionList from "../OptionList.jsx";
import Section from "../Section.jsx";

const INITIAL = { nombreCompleto: "", cedula: "", correo: "", password: "", rol: "", idPrograma: "", semestre: "" };
const SEMESTERS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function UserForm({ programs, onSaved }) {
  const { values, handleChange, reset } = useForm(INITIAL);
  const { run, pending, error } = useAction();
  const isStudent = values.rol === "estudiante";

  const handleSubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post("/users", {
        nombreCompleto: values.nombreCompleto,
        ...(isStudent ? { cedula: values.cedula } : {}),
        correo: values.correo,
        password: values.password,
        rol: values.rol,
        ...(isStudent ? { idPrograma: Number(values.idPrograma), semestre: Number(values.semestre) } : {}),
      });
      reset();
      onSaved();
    });
  };

  return (
    <Section title="Crear usuario">
      <form className="form-grid" onSubmit={handleSubmit}>
        <input name="nombreCompleto" required minLength={3} placeholder="Nombre completo" value={values.nombreCompleto} onChange={handleChange} />
        <input name="correo" type="email" required placeholder="Correo" value={values.correo} onChange={handleChange} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Contraseña inicial (mín. 8 caracteres)"
          value={values.password}
          onChange={handleChange}
        />
        <select name="rol" required value={values.rol} onChange={handleChange}>
          <option value="">Rol</option>
          <option value="estudiante">Estudiante</option>
          <option value="tutor">Tutor</option>
          <option value="asesor">Asesor</option>
        </select>
        {isStudent && (
          <>
            <input name="cedula" required inputMode="numeric" pattern="[0-9]{6,20}" placeholder="Cédula (solo números)" value={values.cedula} onChange={handleChange} />
            <select name="idPrograma" required value={values.idPrograma} onChange={handleChange}>
              <option value="">Programa del estudiante</option>
              <OptionList items={programs} valueKey="id_programa" labelKey="nombre_programa" />
            </select>
            <select name="semestre" required value={values.semestre} onChange={handleChange}>
              <option value="">Semestre del estudiante</option>
              {SEMESTERS.map((semester) => (
                <option key={semester} value={semester}>
                  Semestre {semester}
                </option>
              ))}
            </select>
          </>
        )}
        <button className="btn-form" disabled={pending}>
          Crear cuenta
        </button>
      </form>
      <FormStatus error={error} />
    </Section>
  );
}

UserForm.propTypes = {
  programs: PropTypes.array,
  onSaved: PropTypes.func.isRequired,
};
