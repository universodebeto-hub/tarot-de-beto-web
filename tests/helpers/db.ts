import { prisma } from "@/lib/prisma";

/**
 * Vacía todas las tablas de negocio entre tests, en orden que respeta las
 * foreign keys. No toca `_prisma_migrations`. Pensado para una base de
 * datos de pruebas dedicada (`tarot_de_beto_test`) — nunca correr contra
 * la base de desarrollo.
 */
export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.paypalWebhookEvent.deleteMany(),
    prisma.paypalTransaction.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.blockedTime.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.service.deleteMany(),
    prisma.user.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.counter.deleteMany(),
  ]);
}

let serviceCounter = 0;

export async function createTestService(overrides: Partial<{
  slug: string;
  name: string;
  durationMinutes: number;
  price: number;
  available: boolean;
}> = {}) {
  serviceCounter += 1;
  return prisma.service.create({
    data: {
      slug: overrides.slug ?? `test-service-${serviceCounter}-${Date.now()}`,
      name: overrides.name ?? "Servicio de prueba",
      description: "Servicio creado por los tests.",
      durationMinutes: overrides.durationMinutes ?? 30,
      price: overrides.price ?? 20,
      currency: "USD",
      available: overrides.available ?? true,
      category: "test",
    },
  });
}

/** Abre disponibilidad de 09:00 a 18:00 todos los días de la semana. */
export async function createFullWeekAvailability(): Promise<void> {
  const data = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startMinute: 9 * 60,
    endMinute: 18 * 60,
    active: true,
  }));
  await prisma.availability.createMany({ data });
}

let userCounter = 0;

export async function createTestUser(overrides: Partial<{ role: "ADMIN" | "CLIENT" }> = {}) {
  userCounter += 1;
  return prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      email: `test-user-${userCounter}-${Date.now()}@example.com`,
      passwordHash: "not-a-real-hash",
      role: overrides.role ?? "CLIENT",
    },
  });
}
