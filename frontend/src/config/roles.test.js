import { describe, expect, it } from "vitest";
import { getMenu } from "./menus.js";
import { homeForRole, normalizeRole, toUiRole } from "./roles.js";
import { PAGES } from "./pages.js";
import { ROLE_HOME } from "./roles.js";
import { MENU_BY_ROLE } from "./menus.js";

describe("normalizeRole", () => {
  it("quita tildes y pasa a minúsculas", () => {
    expect(normalizeRole("Asesor Pedagógico")).toBe("asesor pedagogico");
  });
});

describe("toUiRole", () => {
  it("convierte tutor en docente", () => {
    expect(toUiRole("tutor")).toBe("docente");
    expect(toUiRole("Tutor Académico")).toBe("docente");
  });

  it("reconoce el director de programa", () => {
    expect(toUiRole("Director de Programa")).toBe("director");
  });
});

describe("homeForRole", () => {
  it("devuelve la página inicial de cada rol", () => {
    expect(homeForRole("estudiante")).toBe("/estudiante");
    expect(homeForRole("tutor")).toBe("/docente");
  });

  it("devuelve null para roles desconocidos", () => {
    expect(homeForRole("invitado")).toBeNull();
  });
});

describe("getMenu", () => {
  it("muestra el semestre al estudiante", () => {
    expect(getMenu("estudiante", 3)[0][0]).toBe("Inicio · Semestre 3");
  });

  it("devuelve lista vacía para un rol desconocido", () => {
    expect(getMenu("nada")).toEqual([]);
  });
});

describe("configuración de páginas", () => {
  it("cada opción del menú apunta a una página que existe", () => {
    for (const entries of Object.values(MENU_BY_ROLE)) {
      for (const [, path] of entries) {
        expect(PAGES[path.slice(1)], path).toBeDefined();
      }
    }
  });

  it("cada rol tiene un panel de inicio definido", () => {
    for (const home of Object.values(ROLE_HOME)) {
      expect(PAGES[home.slice(1)], home).toBeDefined();
    }
  });
});
