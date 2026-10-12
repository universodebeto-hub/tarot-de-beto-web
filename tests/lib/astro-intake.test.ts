import { describe, it, expect } from "vitest";
import { intakeADatosNacimiento } from "@/lib/astro/intake";
import { hasRequiredIntakeData } from "@/lib/service-intake";

const base = { fechaNacimiento: "1992-09-20", horaNacimiento: "14:45", ciudadNacimiento: "Bogotá", paisNacimiento: "Colombia" };

describe("intakeADatosNacimiento", () => {
  it("usa el nombre del cliente si no hay nombre para el informe", () => {
    const r = intakeADatosNacimiento(base, "Ana Pérez");
    expect(r).toEqual({ datos: { nombre: "Ana Pérez", fecha: "1992-09-20", hora: "14:45", precision: "exacta", ciudad: "Bogotá", pais: "Colombia" } });
  });

  it("prefiere el nombre del informe y pasa la región y la precisión", () => {
    const r = intakeADatosNacimiento({ ...base, nombreInforme: "Luz", precisionHora: "aproximada", regionNacimiento: "Cundinamarca" }, "Ana");
    expect(r).toMatchObject({ datos: { nombre: "Luz", precision: "aproximada", region: "Cundinamarca" } });
  });

  it("sin hora conocida usa mediodía y no exige la hora", () => {
    const sinHora = { ...base, precisionHora: "desconocida", horaNacimiento: "" };
    expect(intakeADatosNacimiento(sinHora, "Ana")).toMatchObject({ datos: { hora: "12:00", precision: "desconocida" } });
    expect(hasRequiredIntakeData("carta-astral", sinHora)).toBe(true);
  });

  it("las reservas viejas (sin precisión) siguen valiendo y exigen la hora", () => {
    expect(hasRequiredIntakeData("carta-astral", base)).toBe(true);
    expect(hasRequiredIntakeData("carta-astral", { ...base, horaNacimiento: "" })).toBe(false);
  });

  it.each([
    ["fecha inválida", { ...base, fechaNacimiento: "20/09/1992" }],
    ["fecha imposible", { ...base, fechaNacimiento: "1992-13-45" }],
    ["año absurdo", { ...base, fechaNacimiento: "1650-01-01" }],
    ["hora inválida", { ...base, horaNacimiento: "25:99" }],
    ["sin ciudad", { ...base, ciudadNacimiento: "" }],
  ])("devuelve un error claro: %s", (_n, intake) => {
    expect(intakeADatosNacimiento(intake, "Ana")).toHaveProperty("error");
  });

  it("sin ningún nombre da error", () => {
    expect(intakeADatosNacimiento(base, "  ")).toHaveProperty("error");
  });
});
