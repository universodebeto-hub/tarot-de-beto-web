import "server-only";
import { Prisma } from "@prisma/client";
import type { Booking } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getServiceById } from "@/server/services";
import { getAvailableSlots, expireStaleBookings } from "@/server/availability";
import { getSetting } from "@/server/settings";
import { businessDateString } from "@/lib/timezone";
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

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  startUtc: z.string().min(1),
  guestName: z.string().trim().min(1, "Tu nombre es obligatorio").max(120).optional(),
  guestEmail: z.string().trim().toLowerCase().email("Correo inválido").optional(),
  guestPhone: z.string().trim().max(30).optional(),
  /** Datos adicionales exigidos por algunos servicios — ver lib/service-intake.ts. */
  intakeData: z.record(z.string(), z.string().trim().max(200)).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export interface CreateBookingResult {
  /** Solo el id: el registro completo (con service/user incluidos para la
   * notificación) nunca debe cruzar al cliente — incluye el passwordHash
   * del usuario y un Decimal de Prisma que React no puede serializar. */
  booking?: Pick<Booking, "id">;
  error?: string;
}

/**
 * Crea una reserva temporal (PENDING_PAYMENT). Verifica disponibilidad real
 * justo antes de insertar (no solo confía en lo que el cliente mandó) y
 * además depende del EXCLUDE constraint de la base de datos (ver migración
 * `add_booking_overlap_exclude`) como última defensa contra reservas
 * superpuestas en carreras concurrentes — cubre tanto el mismo horario
 * exacto como cualquier solapamiento parcial entre servicios distintos,
 * porque Alberto es un solo proveedor.
 */
export async function createPendingBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { serviceId, startUtc, guestName, guestEmail, guestPhone, intakeData } = parsed.data;

  const service = await getServiceById(serviceId);
  if (!service || !service.available) {
    return { error: "Ese servicio ya no está disponible." };
  }

  if (isReportOnlyService(service.slug)) {
    return { error: "Este servicio se solicita como informe, sin elegir horario." };
  }

  if (!hasRequiredIntakeData(service.slug, intakeData)) {
    return { error: "Faltan datos obligatorios para este servicio." };
  }

  const startsAt = new Date(startUtc);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return { error: "Ese horario ya no está disponible. Elige otro." };
  }
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  const currentUser = await getCurrentUser();
  let userId: string | null = null;
  if (currentUser) {
    userId = currentUser.id;
  } else if (!guestName || !guestEmail) {
    return { error: "Nombre y correo son obligatorios para reservar como invitado." };
  }

  await expireStaleBookings();

  const daySlots = await getAvailableSlots({ serviceId, date: businessDateString(startsAt) });
  const stillAvailable = daySlots.some((slot) => slot.startUtc === startsAt.toISOString());
  if (!stillAvailable) {
    return { error: "Ese horario ya no está disponible. Elige otro, por favor." };
  }

  const paymentWindowMinutes = await getSetting("booking_payment_window_minutes", 15);
  const paymentDeadline = new Date(Date.now() + paymentWindowMinutes * 60_000);
  const bookingNumber = await nextBookingNumber();

  try {
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        userId,
        guestName: userId ? null : guestName,
        guestEmail: userId ? null : guestEmail,
        guestPhone: userId ? null : guestPhone,
        serviceId,
        startsAt,
        endsAt,
        paymentDeadline,
        intakeData: intakeData ?? undefined,
      },
      include: { service: true, user: true },
    });
    await notifyBookingReceived(booking).catch((err) => console.error("[notify] booking_received:", err));
    return { booking: { id: booking.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Justo se acaba de reservar ese horario. Elige otro, por favor." };
    }
    // El EXCLUDE constraint (ver migración add_booking_overlap_exclude) no
    // es un tipo de restricción que Prisma reconozca con un código P propio
    // (a diferencia de un índice único, que sí mapea a P2002) — el error de
    // Postgres (SQLSTATE 23P01, "exclusion_violation") llega envuelto en un
    // PrismaClientUnknownRequestError con el mensaje crudo de la base de
    // datos. Se detecta por contenido en vez de por código.
    if (
      err instanceof Prisma.PrismaClientUnknownRequestError &&
      /23P01|exclusion_violation|Booking_no_overlap_active/i.test(err.message)
    ) {
      return { error: "Justo se acaba de reservar ese horario. Elige otro, por favor." };
    }
    throw err;
  }
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
 * Crea una solicitud de informe (Numerología, Carta Astral): NO usa la
 * agenda, no valida disponibilidad ni tope diario, y puede recibirse a
 * cualquier hora. `startsAt`/`endsAt` se guardan como el mismo instante
 * exacto (rango vacío para Postgres) únicamente para satisfacer el NOT NULL
 * del modelo — nunca ocupan un bloque de la agenda (excluidos en
 * `server/availability.ts`) y, al ser un rango vacío, tampoco pueden chocar
 * contra el EXCLUDE constraint de solapamiento (verificado empíricamente:
 * `tsrange(t, t, '[)') && cualquier_rango` siempre es `false`).
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
    return { error: "Este servicio requiere elegir fecha y horario." };
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
