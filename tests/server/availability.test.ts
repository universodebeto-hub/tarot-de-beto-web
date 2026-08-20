import { describe, it, expect, beforeEach, vi } from "vitest";

// getAvailableSlots no depende de sesión, pero server/bookings.ts (importado
// indirectamente por algunos módulos de este árbol) sí llama a
// `getCurrentUser()` → `cookies()`. Se mockea sin sesión (invitado) para
// todo este archivo.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/server/availability";
import { nextBusinessDates, businessLocalToUtc } from "@/lib/timezone";
import { resetDb, createTestService, createFullWeekAvailability } from "../helpers/db";

// Un día calendario 3 días en el futuro — lejos de "ahora" para no toparse
// con slots ya pasados del día de hoy, y estable frente a cuándo corra el test.
function futureDate(): string {
  return nextBusinessDates(5)[4];
}

describe("getAvailableSlots", () => {
  beforeEach(async () => {
    await resetDb();
    await createFullWeekAvailability();
  });

  it("devuelve slots dentro del horario laboral cuando no hay reservas ni bloqueos", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const slots = await getAvailableSlots({ serviceId: service.id, date: futureDate() });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].label).toBe("09:00");
  });

  it("no devuelve slots para un servicio desactivado", async () => {
    const service = await createTestService({ available: false });
    const slots = await getAvailableSlots({ serviceId: service.id, date: futureDate() });
    expect(slots).toEqual([]);
  });

  it("excluye el rango cubierto por un BlockedTime de día completo", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const date = futureDate();
    await prisma.blockedTime.create({
      data: {
        startsAt: businessLocalToUtc(date, 0),
        endsAt: businessLocalToUtc(date, 24 * 60),
        reason: "Día bloqueado por test",
      },
    });
    const slots = await getAvailableSlots({ serviceId: service.id, date });
    expect(slots).toEqual([]);
  });

  it("excluye el horario ya ocupado por una reserva activa (previene doble reserva)", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const date = futureDate();

    const before = await getAvailableSlots({ serviceId: service.id, date });
    expect(before.length).toBeGreaterThan(0);
    const target = before[0];

    await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente de prueba",
        guestEmail: "cliente@example.com",
        serviceId: service.id,
        startsAt: new Date(target.startUtc),
        endsAt: new Date(target.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
      },
    });

    const after = await getAvailableSlots({ serviceId: service.id, date });
    expect(after.some((s) => s.startUtc === target.startUtc)).toBe(false);
  });

  it("una reserva EXPIRED no bloquea el horario", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const date = futureDate();
    const before = await getAvailableSlots({ serviceId: service.id, date });
    const target = before[0];

    await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente expirado",
        guestEmail: "expirado@example.com",
        serviceId: service.id,
        startsAt: new Date(target.startUtc),
        endsAt: new Date(target.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
        status: "EXPIRED",
      },
    });

    const after = await getAvailableSlots({ serviceId: service.id, date });
    expect(after.some((s) => s.startUtc === target.startUtc)).toBe(true);
  });
});
