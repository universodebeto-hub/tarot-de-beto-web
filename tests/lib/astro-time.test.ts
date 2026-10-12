import { describe, it, expect } from "vitest";
import { diaSiguiente, horaLocalAUtc } from "@/lib/astro/time";

/**
 * Las expectativas de offset salen de la base de husos horarios IANA (la que
 * trae Node). Dos hechos históricos documentados que estos tests protegen:
 * Colombia tuvo horario de verano entre 1992 y 1993, y Venezuela estuvo en
 * UTC−4:30 entre diciembre de 2007 y mayo de 2016.
 */
describe("horaLocalAUtc — husos horarios históricos", () => {
  it("Bogotá en horario normal (UTC−5)", () => {
    const { utc, advertencias } = horaLocalAUtc("1992-03-01", "10:00", "America/Bogota");
    expect(utc.toISOString()).toBe("1992-03-01T15:00:00.000Z");
    expect(advertencias).toEqual([]);
  });

  it("Bogotá con horario de verano de 1992 (UTC−4)", () => {
    expect(horaLocalAUtc("1992-09-20", "14:45", "America/Bogota").utc.toISOString()).toBe("1992-09-20T18:45:00.000Z");
  });

  it("Bogotá vuelve a UTC−5 en 1993", () => {
    expect(horaLocalAUtc("1993-06-01", "12:00", "America/Bogota").utc.toISOString()).toBe("1993-06-01T17:00:00.000Z");
  });

  it("Caracas: UTC−4 en 1995, UTC−4:30 en 2012 y UTC−4 desde 2016", () => {
    expect(horaLocalAUtc("1995-06-01", "12:00", "America/Caracas").utc.toISOString()).toBe("1995-06-01T16:00:00.000Z");
    expect(horaLocalAUtc("2012-06-01", "23:10", "America/Caracas").utc.toISOString()).toBe("2012-06-02T03:40:00.000Z");
    expect(horaLocalAUtc("2018-06-01", "12:00", "America/Caracas").utc.toISOString()).toBe("2018-06-01T16:00:00.000Z");
  });
});

describe("horaLocalAUtc — avisos", () => {
  it("avisa cuando la hora no existió (adelanto de reloj)", () => {
    const { advertencias } = horaLocalAUtc("2023-03-12", "02:30", "America/New_York");
    expect(advertencias.some((a) => a.includes("no existió"))).toBe(true);
  });

  it("avisa cuando la hora ocurrió dos veces (fin del horario de verano)", () => {
    const { advertencias } = horaLocalAUtc("2023-11-05", "01:30", "America/New_York");
    expect(advertencias.some((a) => a.includes("dos veces"))).toBe(true);
  });

  it("avisa que los husos anteriores a 1930 son poco confiables", () => {
    const { advertencias } = horaLocalAUtc("1925-01-10", "12:00", "America/Bogota");
    expect(advertencias.some((a) => a.includes("poco confiables"))).toBe(true);
  });

  it("rechaza formatos inválidos", () => {
    expect(() => horaLocalAUtc("10/05/1990", "12:00", "America/Bogota")).toThrow(/Fecha inválida/);
    expect(() => horaLocalAUtc("1990-05-10", "3pm", "America/Bogota")).toThrow(/Hora inválida/);
  });
});

describe("diaSiguiente", () => {
  it("pasa de día, de mes y de año", () => {
    expect(diaSiguiente("1990-05-10")).toBe("1990-05-11");
    expect(diaSiguiente("1990-05-31")).toBe("1990-06-01");
    expect(diaSiguiente("1990-12-31")).toBe("1991-01-01");
    expect(diaSiguiente("2024-02-28")).toBe("2024-02-29");
  });
});
