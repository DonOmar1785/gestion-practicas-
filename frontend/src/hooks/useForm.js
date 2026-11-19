import { useCallback, useState } from "react";

// Maneja los valores de un formulario controlado.
//   const { values, handleChange, reset } = useForm({ nombre: "" });
export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }, []);

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, setValues, handleChange, reset };
}
