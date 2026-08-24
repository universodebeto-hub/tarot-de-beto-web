import { describe, it, expect, beforeEach, vi } from "vitest";

// Camino de invitado: sin sesión.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { prisma } from "@/lib/prisma";
import { createPendingBooking, createReportRequest } from "@/server/bookings";
import { getAvailableSlots, getDayAgenda } from "@/server/availability";
import { nextBusinessDates } from "@/lib/timezone";
import { resetDb, createTestService, createFullWeekAvailability } from "../helpers/db";

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

const guest = { guestName: "Cliente de prueba", guestEmail: "cliente@example.com" };

describe("createReportRequest — Informe Numerológico / Carta Astral (sin agenda)", () => {
  beforeEach(async () => {
    await resetDb();
    await createFullWeekAvailability();
  });

  it("crea la solicitud sin elegir horario, con los datos de nacimiento requeridos", async () => {
    const service = await createTestService({ slug: "informe-numerologico" });

    const result = await createReportRequest({
      serviceId: service.id,
      intakeData: { nombreCompletoNacimiento: "Ana Pérez", fechaNacimiento: "1990-05-10" },
      ...guest,
    });

    expect(result.error).toBeUndefined();
    expect(result.booking?.id).toBeTruthy();
    const booking = await prisma.booking.findUnique({ where: { id: result.booking!.id } });
    expect(booking?.status).toBe("PENDING_PAYMENT");
    // startsAt === endsAt: rango vacío a propósito, nunca ocupa la agenda.
    expect(booking?.startsAt.getTime()).toBe(booking?.endsAt.getTime());
  });

  it("rechaza la solicitud si faltan los datos de nacimiento obligatorios", async () => {
    const service = await createTestService({ slug: "carta-astral" });
    const result = await createReportRequest({
      serviceId: service.id,
      intakeData: { fechaNacimiento: "1990-05-10" }, // faltan hora/ciudad/país
      ...guest,
    });
    expect(result.error).toMatch(/obligatorios/);
  });

  it("createPendingBooking (flujo de agenda) rechaza un servicio de informe", async () => {
    const service = await createTestService({ slug: "informe-numerologico" });
    const [slot] = await getAvailableSlots({ serviceId: service.id, date: futureDate() });
    const result = await createPendingBooking({ serviceId: service.id, startUtc: slot.startUtc, ...guest });
    expect(result.error).toMatch(/informe/i);
  });

  it("createReportRequest rechaza un servicio normal de agenda", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const result = await createReportRequest({ serviceId: service.id, ...guest });
    expect(result.error).toMatch(/horario/i);
  });

  it("una solicitud de informe no ocupa ningún bloque de la agenda ni cuenta para el tope diario", async () => {
    await setSetting("max_bookings_per_day", 1);
    const reportService = await createTestService({ slug: "carta-astral" });
    const callService = await createTestService({ durationMinutes: 30 });
    const date = futureDate();

    const slotsBefore = await getAvailableSlots({ serviceId: callService.id, date });

    await createReportRequest({
      serviceId: reportService.id,
      intakeData: {
        fechaNacimiento: "1990-05-10",
        horaNacimiento: "08:15",
        ciudadNacimiento: "Bogotá",
        paisNacimiento: "Colombia",
      },
      ...guest,
    });

    const slotsAfter = await getAvailableSlots({ serviceId: callService.id, date });
    expect(slotsAfter.length).toBe(slotsBefore.length);

    const agenda = await getDayAgenda(date);
    expect(agenda.dailyCapReached).toBe(false);
  });

  it("varias solicitudes de informe simultáneas nunca chocan entre sí (rango vacío, sin conflicto de agenda)", async () => {
    const service = await createTestService({ slug: "informe-numerologico" });
    const intakeData = { nombreCompletoNacimiento: "Ana Pérez", fechaNacimiento: "1990-05-10" };

    const results = await Promise.all([
      createReportRequest({ serviceId: service.id, intakeData, ...guest }),
      createReportRequest({ serviceId: service.id, intakeData, ...guest }),
      createReportRequest({ serviceId: service.id, intakeData, ...guest }),
    ]);

    expect(results.every((r) => r.booking && !r.error)).toBe(true);
    const count = await prisma.booking.count({ where: { serviceId: service.id } });
    expect(count).toBe(3);
  });
});
