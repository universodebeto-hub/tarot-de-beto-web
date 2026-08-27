import "server-only";
import type { Booking } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getServiceById } from "@/server/services";
import { expireStaleBookings } from "@/server/availability";
import { getSetting } from "@/server/settings";
import { notifyBookingReceived } from "@/server/notifications/send";
import { hasRequiredIntakeData } from "@/lib/service-intake";
import { isReportOnlyService } from "@/lib/service-fulfillment";

async function nextBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `booking_number_${year}`;
  // Un solo upsert atómico (INSERT ... ON CONFLICT DO UPDATE) — separarlo en
  // upsert+update, como antes, deja una ventana de carrera real: dos
  // solicitudes concurrentes que crean el contador del año por primera vez
  // al mismo tiempo pueden violar la restricción única de `key` entre el
  // upsert y el update.
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `BETO-${year}-${String(counter.value).padStart(5, "0")}`;
}

export interface CreateBookingResult {
  /** Solo el id: el registro completo (con service/user incluidos para la
   * notificación) nunca debe cruzar al cliente — incluye el passwordHash
   * del usuario y un Decimal de Prisma que React no puede serializar. */
  booking?: Pick<Booking, "id">;
  error?: string;
}

const createReportRequestSchema = z.object({
  serviceId: z.string().min(1),
  guestName: z.string().trim().min(1, "Tu nombre es obligatorio").max(120).optional(),
  guestEmail: z.string().trim().toLowerCase().email("Correo inválido").optional(),
  guestPhone: z.string().trim().max(30).optional(),
  intakeData: z.record(z.string(), z.string().trim().max(200)).optional(),
});

export type CreateReportRequestInput = z.infer<typeof createReportRequestSchema>;

/**
 * Crea una solicitud de informe (Numerología, Carta Astral): no depende de
 * ningún horario, puede recibirse a cualquier hora. `startsAt`/`endsAt` se
 * guardan como el mismo instante exacto únicamente para satisfacer el
 * NOT NULL del modelo.
 */
export async function createReportRequest(input: CreateReportRequestInput): Promise<CreateBookingResult> {
  const parsed = createReportRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { serviceId, guestName, guestEmail, guestPhone, intakeData } = parsed.data;

  const service = await getServiceById(serviceId);
  if (!service || !service.available) {
    return { error: "Ese servicio ya no está disponible." };
  }
  if (!isReportOnlyService(service.slug)) {
    return { error: "Este servicio requiere elegir un tarotista disponible." };
  }
  if (!hasRequiredIntakeData(service.slug, intakeData)) {
    return { error: "Faltan datos obligatorios para este servicio." };
  }

  const currentUser = await getCurrentUser();
  let userId: string | null = null;
  if (currentUser) {
    userId = currentUser.id;
  } else if (!guestName || !guestEmail) {
    return { error: "Nombre y correo son obligatorios para solicitar como invitado." };
  }

  const now = new Date();
  const paymentWindowMinutes = await getSetting("booking_payment_window_minutes", 15);
  const paymentDeadline = new Date(Date.now() + paymentWindowMinutes * 60_000);
  const bookingNumber = await nextBookingNumber();

  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      userId,
      guestName: userId ? null : guestName,
      guestEmail: userId ? null : guestEmail,
      guestPhone: userId ? null : guestPhone,
      serviceId,
      startsAt: now,
      endsAt: now,
      paymentDeadline,
      intakeData: intakeData ?? undefined,
    },
    include: { service: true, user: true },
  });
  await notifyBookingReceived(booking).catch((err) => console.error("[notify] booking_received:", err));
  return { booking: { id: booking.id } };
}

export async function getBookingById(id: string) {
  await expireStaleBookings();
  return prisma.booking.findUnique({
    where: { id },
    include: { service: true, tarotista: true },
  });
}

export async function getUserBookings(userId: string) {
  await expireStaleBookings();
  return prisma.booking.findMany({
    where: { userId },
    include: { service: true, tarotista: true },
    orderBy: { startsAt: "desc" },
  });
}
