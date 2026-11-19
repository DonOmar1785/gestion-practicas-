import { describe, expect, it } from "vitest";
import { display, getColumns, isHttpUrl, parseQuestions, summaryToRows, toNumberOrNull } from "./format.js";

describe("display", () => {
  it("muestra un guion cuando no hay valor", () => {
    expect(display(null)).toBe("—");
    expect(display(undefined)).toBe("—");
    expect(display("")).toBe("—");
  });

  it("convierte números y textos", () => {
    expect(display(0)).toBe("0");
    expect(display("Hola")).toBe("Hola");
  });

  it("une las listas con comas", () => {
    expect(display(["a", "b"])).toBe("a, b");
  });

  it("prefiere el nombre de un objeto relacionado", () => {
    expect(display({ nombre_completo: "Ana Pérez", id: 3 })).toBe("Ana Pérez");
  });

  it("describe objetos sin nombre usando las etiquetas", () => {
    expect(display({ semestre: 3 })).toBe("Semestre: 3");
  });
});

describe("isHttpUrl", () => {
  it("reconoce enlaces http y https", () => {
    expect(isHttpUrl("https://ejemplo.com")).toBe(true);
    expect(isHttpUrl("http://ejemplo.com")).toBe(true);
  });

  it("rechaza lo que no es un enlace", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl(12)).toBe(false);
  });
});

describe("getColumns", () => {
  it("une las claves de todas las filas sin repetir", () => {
    expect(getColumns([{ a: 1 }, { a: 2, b: 3 }])).toEqual(["a", "b"]);
  });

  it("usa la columna 'valor' para filas que no son objetos", () => {
    expect(getColumns(["x", "y"])).toEqual(["valor"]);
  });
});

describe("summaryToRows", () => {
  it("convierte un resumen en filas", () => {
    expect(summaryToRows({ estudiantes: 4 })).toEqual([{ indicador: "estudiantes", total: 4 }]);
  });

  it("tolera valores vacíos", () => {
    expect(summaryToRows(undefined)).toEqual([]);
  });
});

describe("toNumberOrNull", () => {
  it("devuelve null con texto vacío", () => {
    expect(toNumberOrNull("")).toBeNull();
  });

  it("convierte texto en número", () => {
    expect(toNumberOrNull("7")).toBe(7);
  });
});

describe("parseQuestions", () => {
  it("devuelve una lista vacía si no hay texto", () => {
    expect(parseQuestions("   ")).toEqual([]);
  });

  it("interpreta una lista JSON válida", () => {
    expect(parseQuestions('[{"texto":"Hola"}]')).toEqual([{ texto: "Hola" }]);
  });

  it("falla con JSON inválido", () => {
    expect(() => parseQuestions("{no")).toThrow("El JSON de preguntas no es válido.");
  });

  it("falla si no es una lista", () => {
    expect(() => parseQuestions('{"a":1}')).toThrow("Las preguntas deben ser una lista JSON.");
  });
});
