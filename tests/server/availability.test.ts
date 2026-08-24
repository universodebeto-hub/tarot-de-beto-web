import { describe, it, expect, beforeEach, vi } from "vitest";

// getAvailableSlots no depende de sesión, pero server/bookings.ts (importado
// indirectamente por algunos módulos de este árbol) sí llama a
// `getCurrentUser()` → `cookies()`. Se mockea sin sesión (invitado) para
// todo este archivo.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { prisma } from "@/lib/prisma";
import { getAvailableSlots, getDayAgenda } from "@/server/availability";
import { nextBusinessDates, businessLocalToUtc } from "@/lib/timezone";
import { resetDb, createTestService, createFullWeekAvailability } from "../helpers/db";

// Un día calendario 3 días en el futuro — lejos de "ahora" para no toparse
// con slots ya pasados del día de hoy, y estable frente a cuándo corra el test.
function futureDate(): string {
  return nextBusinessDates(5)[4];
}

async function setSetting(key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
}

describe("getAvailableSlots", () => {
  beforeEach(async () => {
    await resetDb();
    await createFullWeekAvailability();
  });

  it("devuelve slots dentro del horario laboral, alineados a la grilla de 15 min", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const slots = await getAvailableSlots({ serviceId: service.id, date: futureDate() });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].label).toBe("09:00");
    expect(slots[1].label).toBe("09:15");
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

  it("una reserva de 1 hora ocupa 4 bloques consecutivos de 15 min y bloquea a OTRO servicio que se solape", async () => {
    await setSetting("booking_buffer_minutes", 0);
    const hourService = await createTestService({ durationMinutes: 60 });
    const quickService = await createTestService({ durationMinutes: 15 });
    const date = futureDate();

    const before = await getAvailableSlots({ serviceId: hourService.id, date });
    const target = before[0]; // 09:00–10:00

    await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente hora",
        guestEmail: "hora@example.com",
        serviceId: hourService.id,
        startsAt: new Date(target.startUtc),
        endsAt: new Date(target.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
      },
    });

    // Servicio DISTINTO — Alberto es un solo proveedor, así que los 4
    // bloques de 15 min que ocupó la reserva de 1 hora (09:00, 09:15, 09:30,
    // 09:45) no deben ofrecerse como inicio para ningún otro servicio.
    const quickSlots = await getAvailableSlots({ serviceId: quickService.id, date });
    const occupiedLabels = ["09:00", "09:15", "09:30", "09:45"];
    for (const label of occupiedLabels) {
      expect(quickSlots.some((s) => s.label === label)).toBe(false);
    }
    // 10:00 ya no se solapa con la reserva de 1 hora — debe seguir libre.
    expect(quickSlots.some((s) => s.label === "10:00")).toBe(true);
  });

  it("respeta el buffer configurado como separación después de una reserva existente", async () => {
    await setSetting("booking_buffer_minutes", 30);
    const service = await createTestService({ durationMinutes: 15 });
    const date = futureDate();

    const before = await getAvailableSlots({ serviceId: service.id, date });
    const target = before[0]; // 09:00–09:15

    await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente buffer",
        guestEmail: "buffer@example.com",
        serviceId: service.id,
        startsAt: new Date(target.startUtc),
        endsAt: new Date(target.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
      },
    });

    const after = await getAvailableSlots({ serviceId: service.id, date });
    // Con 30 min de buffer tras una reserva de 09:00-09:15, el próximo
    // inicio válido es 09:45 (09:15 + 30 min) — 09:15/09:30 deben quedar ocupados.
    expect(after.some((s) => s.label === "09:15")).toBe(false);
    expect(after.some((s) => s.label === "09:30")).toBe(false);
    expect(after.some((s) => s.label === "09:45")).toBe(true);
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

  it("respeta el tope de máximo de consultas por día, incluso con horario libre", async () => {
    await setSetting("max_bookings_per_day", 1);
    const service = await createTestService({ durationMinutes: 15 });
    const otherService = await createTestService({ durationMinutes: 15 });
    const date = futureDate();

    const before = await getAvailableSlots({ serviceId: service.id, date });
    const target = before[0];

    await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente tope",
        guestEmail: "tope@example.com",
        serviceId: service.id,
        startsAt: new Date(target.startUtc),
        endsAt: new Date(target.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
      },
    });

    // Ya se alcanzó el tope de 1 consulta/día — no debe ofrecerse ningún
    // horario más ese día, para NINGÚN servicio, aunque quede toda la
    // ventana horaria libre.
    const afterSameService = await getAvailableSlots({ serviceId: service.id, date });
    const afterOtherService = await getAvailableSlots({ serviceId: otherService.id, date });
    expect(afterSameService).toEqual([]);
    expect(afterOtherService).toEqual([]);
  });
});

describe("getDayAgenda", () => {
  beforeEach(async () => {
    await resetDb();
    await createFullWeekAvailability();
  });

  it("marca como outside-hours los bloques fuera de la disponibilidad configurada", async () => {
    const date = futureDate();
    const agenda = await getDayAgenda(date);
    expect(agenda.blocks).toHaveLength(96); // 24h * 4 bloques de 15 min
    const midnightBlock = agenda.blocks.find((b) => b.startMinute === 0);
    expect(midnightBlock?.status).toBe("outside-hours");
    const nineAmBlock = agenda.blocks.find((b) => b.startMinute === 9 * 60);
    expect(nineAmBlock?.status).toBe("available");
  });

  it("marca como booked el bloque de una reserva activa, con su bookingId", async () => {
    await setSetting("booking_buffer_minutes", 0);
    const service = await createTestService({ durationMinutes: 15 });
    const date = futureDate();
    const [slot] = await getAvailableSlots({ serviceId: service.id, date });

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente agenda",
        guestEmail: "agenda@example.com",
        serviceId: service.id,
        startsAt: new Date(slot.startUtc),
        endsAt: new Date(slot.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
      },
    });

    const agenda = await getDayAgenda(date);
    const bookedBlock = agenda.blocks.find((b) => b.startUtc === slot.startUtc);
    expect(bookedBlock?.status).toBe("booked");
    expect(bookedBlock?.bookingId).toBe(booking.id);
  });

  it("dailyCapReached es true cuando ya se alcanzó el tope diario", async () => {
    await setSetting("max_bookings_per_day", 1);
    const service = await createTestService({ durationMinutes: 15 });
    const date = futureDate();
    const [slot] = await getAvailableSlots({ serviceId: service.id, date });

    await prisma.booking.create({
      data: {
        bookingNumber: `TEST-${Date.now()}`,
        guestName: "Cliente tope",
        guestEmail: "tope-agenda@example.com",
        serviceId: service.id,
        startsAt: new Date(slot.startUtc),
        endsAt: new Date(slot.endUtc),
        paymentDeadline: new Date(Date.now() + 15 * 60_000),
      },
    });

    const agenda = await getDayAgenda(date);
    expect(agenda.dailyCapReached).toBe(true);
  });
});
