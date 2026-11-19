import { describe, expect, it } from "vitest";
import {
  arlStatus,
  buildAlerts,
  buildBadges,
  countByState,
  hoursProgress,
  levelFor,
  plural,
  studentNotifications,
  uniqueCount,
} from "./dashboard.js";

describe("hoursProgress", () => {
  it("calcula el porcentaje con las horas requeridas de la práctica", () => {
    const result = hoursProgress([{ horas_acumuladas: 50, horas_requeridas: 200 }]);
    expect(result).toEqual({ done: 50, required: 200, percent: 25 });
  });

  it("usa 200 horas si no hay dato y nunca pasa de 100 %", () => {
    expect(hoursProgress([]).required).toBe(200);
    expect(hoursProgress([{ horas_acumuladas: 500 }]).percent).toBe(100);
  });

  it("suma varias prácticas", () => {
    const result = hoursProgress([
      { horas_acumuladas: 10, horas_requeridas: 100 },
      { horas_acumuladas: 30, horas_requeridas: 100 },
    ]);
    expect(result.done).toBe(40);
    expect(result.percent).toBe(20);
  });
});

describe("levelFor", () => {
  it("ubica el nivel y las horas que faltan para el siguiente", () => {
    const level = levelFor(10, 20, 200);
    expect(level.name).toBe("Explorador/a");
    expect(level.next).toBe("Aprendiz");
    expect(level.hoursToNext).toBe(30);
  });

  it("al 100 % ya no hay siguiente nivel", () => {
    const level = levelFor(100, 200, 200);
    expect(level.next).toBeNull();
    expect(level.number).toBe(5);
  });
});

describe("buildBadges", () => {
  it("desbloquea según bitácoras, documentos y horas", () => {
    const badges = buildBadges({ percent: 30, logbooks: [{ estado: "Aprobada" }], documents: [{}] });
    const unlocked = badges.filter((badge) => badge.unlocked).map((badge) => badge.id);
    expect(unlocked).toEqual(["bitacora-1", "aprobada", "documento", "horas-25"]);
  });
});

describe("conteos", () => {
  it("countByState ignora mayúsculas", () => {
    expect(countByState([{ estado: "PENDIENTE" }, { estado: "Aprobada" }], "estado", "Pendiente")).toBe(1);
  });

  it("uniqueCount cuenta valores distintos", () => {
    expect(uniqueCount([{ id: 1 }, { id: 1 }, { id: 2 }], (item) => item.id)).toBe(2);
  });

  it("plural elige singular o plural", () => {
    expect(plural(1, "bitácora", "bitácoras")).toBe("1 bitácora");
    expect(plural(3, "bitácora", "bitácoras")).toBe("3 bitácoras");
  });
});

describe("avisos y alertas", () => {
  it("avisa al estudiante de correcciones y pendientes", () => {
    const notes = studentNotifications([{ estado: "Corrección" }, { estado: "Pendiente" }], []);
    expect(notes.length).toBe(2);
    expect(notes[0]).toBe("Tienes 1 bitácora con corrección solicitada.");
  });

  it("genera alertas del sistema", () => {
    const alerts = buildAlerts({
      logbooks: [{ estado: "Pendiente" }],
      documents: [{ estado: "Pendiente" }, { estado: "Pendiente" }],
      practices: [
        { modalidad: "Presencial", fecha_vencimiento_arl: "2000-01-01" },
        { modalidad: "Virtual", fecha_vencimiento_arl: null },
      ],
    });
    expect(alerts).toEqual([
      "1 bitácora pendiente de revisión.",
      "2 documentos pendientes de aprobación.",
      "1 práctica con ARL vencida o próxima a vencer.",
    ]);
  });

  it("sin pendientes no hay alertas", () => {
    expect(buildAlerts({})).toEqual([]);
  });
});

describe("arlStatus", () => {
  const today = new Date("2026-10-27T12:00:00");

  it("clasifica por fecha de vencimiento", () => {
    expect(arlStatus("2026-10-01", today)).toBe("Vencida");
    expect(arlStatus("2026-11-10", today)).toBe("Por vencer");
    expect(arlStatus("2027-03-30", today)).toBe("Vigente");
  });

  it("sin fecha, no hay registro", () => {
    expect(arlStatus(null, today)).toBe("Sin registro");
    expect(arlStatus("no-es-fecha", today)).toBe("Sin registro");
  });
});
