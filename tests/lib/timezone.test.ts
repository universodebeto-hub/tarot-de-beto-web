import { describe, it, expect } from "vitest";
import { businessLocalToUtc, minutesInBusinessDay, businessDateString } from "@/lib/timezone";

describe("businessLocalToUtc", () => {
  it("convierte una hora normal del día correctamente", () => {
    const utc = businessLocalToUtc("2026-03-10", 9 * 60); // 09:00 América/Bogotá = 14:00 UTC (UTC-5)
    expect(utc.toISOString()).toBe("2026-03-10T14:00:00.000Z");
  });

  it("regresión Fase 5: minutesFromMidnight = 1440 ('medianoche del día siguiente') no colapsa al mismo instante que 0", () => {
    // Bug real: antes de arreglarse, minutesFromMidnight=1440 construía la
    // hora inválida "24:00:00", que `fromZonedTime` colapsaba silenciosamente
    // al mismo instante que minutesFromMidnight=0 del mismo día — rompiendo
    // cualquier rango [inicio del día, fin del día) que dependiera de esto.
    const dayStart = businessLocalToUtc("2026-03-10", 0);
    const dayEnd = businessLocalToUtc("2026-03-10", 24 * 60);

    expect(dayEnd.getTime()).not.toBe(dayStart.getTime());
    expect(dayEnd.getTime() - dayStart.getTime()).toBe(24 * 60 * 60 * 1000);
    // El "fin del día" calculado como 1440 debe coincidir con la medianoche
    // del día calendario siguiente calculada directamente.
    const nextDayStart = businessLocalToUtc("2026-03-11", 0);
    expect(dayEnd.getTime()).toBe(nextDayStart.getTime());
  });

  it("es la inversa de minutesInBusinessDay/businessDateString", () => {
    const utc = businessLocalToUtc("2026-06-01", 17 * 60 + 15); // 17:15
    expect(businessDateString(utc)).toBe("2026-06-01");
    expect(minutesInBusinessDay(utc)).toBe(17 * 60 + 15);
  });
});
