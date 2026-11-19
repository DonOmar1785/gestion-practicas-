// Punto de entrada del backend: inicializa clientes y levanta el servidor HTTP.

import "dotenv/config";
import { createApp } from "./app.js";
import { createFirebaseAdminServices } from "./config/firebase-admin.js";
import { createSupabaseClient } from "./config/supabase.js";

const supabase = createSupabaseClient();
const firebaseServices = createFirebaseAdminServices();
const app = createApp({ supabase, ...firebaseServices });
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Servidor de Gestión de Prácticas disponible en http://localhost:${port}`);
});
