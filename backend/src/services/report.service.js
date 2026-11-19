// Resume conteos de tablas clave para paneles administrativos y métricas rápidas.

function throwDatabaseError(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export function createReportService(supabase) {
  return {
    async summary() {
      const tables = [
        ["estudiantes", "estudiante"],
        ["practicas", "practica"],
        ["bitacoras", "bitacora"],
        ["documentos", "documento"],
        ["instituciones", "institucion"],
      ];

      const entries = await Promise.all(
        tables.map(async ([key, table]) => {
          const { count, error } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });
          throwDatabaseError(error);
          return [key, count ?? 0];
        }),
      );
      return Object.fromEntries(entries);
    },
  };
}
