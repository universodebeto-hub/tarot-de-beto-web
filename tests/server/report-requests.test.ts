import { describe, it, expect, beforeEach, vi } from "vitest";

// Camino de invitado: sin sesión.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { prisma } from "@/lib/prisma";
import { createReportRequest } from "@/server/bookings";
import { resetDb, createTestService } from "../helpers/db";

const guest = { guestName: "Cliente de prueba", guestEmail: "cliente@example.com" };

describe("createReportRequest — Informe Numerológico / Carta Astral", () => {
  beforeEach(async () => {
    await resetDb();
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

  it("createReportRequest rechaza un servicio que no es de informe", async () => {
    const service = await createTestService({ durationMinutes: 30 });
    const result = await createReportRequest({ serviceId: service.id, ...guest });
    expect(result.error).toMatch(/tarotista/i);
  });

  it("varias solicitudes de informe simultáneas nunca chocan entre sí (rango vacío, sin conflicto)", async () => {
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
