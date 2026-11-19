import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";

// Hook para leer la sesión desde cualquier componente.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return context;
}
