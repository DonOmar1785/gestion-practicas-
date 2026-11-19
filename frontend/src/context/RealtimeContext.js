import { createContext } from "react";

// `version` aumenta cada vez que el servidor avisa que hubo cambios en los datos.
export const RealtimeContext = createContext({ version: 0 });
