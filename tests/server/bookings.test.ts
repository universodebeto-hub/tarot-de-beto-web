import { describe, it, expect, beforeEach, vi } from "vitest";

// Camino de invitado: sin sesión.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { prisma } from "@/lib/prisma";
import { createPendingBooking } from "@/server/bookings";
import { getAvailableSlots } from "@/server/availability";
import { nextBusinessDates } from "@/lib/timezone";
import { resetDb, createTestService, createFullWeekAvailability } from "../helpers/db";

function futureDate(): string {
  return nextBusinessDates(5)[4];
}

const guest = { guestName: "Cliente de prueba", guestEmail: "cliente@example.com" };

describe("createPendingBooking", () => {
  beforeEach(async () => {
    await resetDb();
    await createFullWeekAvailability();
  });

  it("crea una reserva PENDING_PAYMENT en un horario disponible", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const [slot] = await getAvailableSlots({ serviceId: service.id, date: futureDate() });

    const result = await createPendingBooking({ serviceId: service.id, startUtc: slot.startUtc, ...guest });

    expect(result.error).toBeUndefined();
    expect(result.booking?.id).toBeTruthy();
    const booking = await prisma.booking.findUnique({ where: { id: result.booking!.id } });
    expect(booking?.status).toBe("PENDING_PAYMENT");
  });

  it("rechaza reservar sin nombre/correo si no hay sesión iniciada", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const [slot] = await getAvailableSlots({ serviceId: service.id, date: futureDate() });
    const result = await createPendingBooking({ serviceId: service.id, startUtc: slot.startUtc });
    expect(result.error).toMatch(/invitado/);
  });

  it("previene doble reserva: dos solicitudes concurrentes por el mismo horario, solo una gana", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const [slot] = await getAvailableSlots({ serviceId: service.id, date: futureDate() });

    const [a, b] = await Promise.all([
      createPendingBooking({ serviceId: service.id, startUtc: slot.startUtc, ...guest }),
      createPendingBooking({ serviceId: service.id, startUtc: slot.startUtc, ...guest }),
    ]);

    const successes = [a, b].filter((r) => r.booking);
    const failures = [a, b].filter((r) => r.error);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const count = await prisma.booking.count({ where: { serviceId: service.id, startsAt: new Date(slot.startUtc) } });
    expect(count).toBe(1);
  });

  it("previene reservas superpuestas entre SERVICIOS DISTINTOS (Alberto es un solo proveedor)", async () => {
    const hourService = await createTestService({ durationMinutes: 60 });
    const quickService = await createTestService({ durationMinutes: 15 });
    const date = futureDate();

    // Antes de que exista cualquier reserva, ambos servicios ofrecen 09:00
    // como primer horario — exactamente la condición de carrera real: dos
    // clientes distintos, viendo la agenda vacía al mismo tiempo, eligen
    // servicios distintos que terminan solapándose.
    const [slotHour] = await getAvailableSlots({ serviceId: hourService.id, date });
    const [slotQuick] = await getAvailableSlots({ serviceId: quickService.id, date });
    expect(slotHour.startUtc).toBe(slotQuick.startUtc);

    const [a, b] = await Promise.all([
      createPendingBooking({ serviceId: hourService.id, startUtc: slotHour.startUtc, ...guest }),
      createPendingBooking({ serviceId: quickService.id, startUtc: slotQuick.startUtc, ...guest }),
    ]);

    const successes = [a, b].filter((r) => r.booking);
    const failures = [a, b].filter((r) => r.error);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const count = await prisma.booking.count({
      where: { status: { in: ["PENDING_PAYMENT", "CONFIRMED"] }, startsAt: new Date(slotHour.startUtc) },
    });
    expect(count).toBe(1);
  });

  it("una reserva vencida se expira sola en la siguiente lectura y libera el horario", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const date = futureDate();
    const [slot] = await getAvailableSlots({ serviceId: service.id, date });

    const created = await createPendingBooking({ serviceId: service.id, startUtc: slot.startUtc, ...guest });
    expect(created.booking).toBeTruthy();

    // Antes de vencer, el horario sigue ocupado.
    const stillBusy = await getAvailableSlots({ serviceId: service.id, date });
    expect(stillBusy.some((s) => s.startUtc === slot.startUtc)).toBe(false);

    // Simula que el plazo de pago ya venció (en la app real esto pasa solo
    // con el tiempo — acá se retrocede el reloj manualmente para no esperar).
    await prisma.booking.update({
      where: { id: created.booking!.id },
      data: { paymentDeadline: new Date(Date.now() - 1000) },
    });

    // getAvailableSlots (y createPendingBooking, y getBookingById/getUserBookings)
    // llaman a expireStaleBookings() antes de leer — la expiración es
    // perezosa, no depende de un cron. Ninguna lectura nueva debería ver la
    // reserva vencida como "activa".
    const afterExpiry = await getAvailableSlots({ serviceId: service.id, date });
    expect(afterExpiry.some((s) => s.startUtc === slot.startUtc)).toBe(true);

    const expired = await prisma.booking.findUnique({ where: { id: created.booking!.id } });
    expect(expired?.status).toBe("EXPIRED");
  });
});
