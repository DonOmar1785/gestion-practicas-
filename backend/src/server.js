import "dotenv/config";
import { createApp } from "./app.js";
import { createFirebaseAuth } from "./config/firebase-admin.js";
import { createSupabaseClient } from "./config/supabase.js";

const supabase = createSupabaseClient();
const firebaseAuth = createFirebaseAuth();
const app = createApp({ supabase, firebaseAuth });
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Servidor de Gestión de Prácticas disponible en http://localhost:${port}`);
});
