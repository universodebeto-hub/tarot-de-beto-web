import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getServiceById } from "@/server/services";
import { getSetting } from "@/server/settings";
import { hasRequiredIntakeData } from "@/lib/service-intake";
import { isReportOnlyService } from "@/lib/service-fulfillment";
import { notifyBookingReceived } from "@/server/notifications/send";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { Booking } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

async function nextBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `booking_number_${year}`;
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `BETO-${year}-${String(counter.value).padStart(5, "0")}`;
}

const createConsultationSchema = z.object({
  tarotistaId: z.string().min(1),
  serviceId: z.string().min(1),
  guestName: z.string().trim().min(1, "Tu nombre es obligatorio").max(120).optional(),
  guestEmail: z.string().trim().toLowerCase().email("Correo inválido").optional(),
  guestPhone: z.string().trim().max(30).optional(),
  intakeData: z.record(z.string(), z.string().trim().max(200)).optional(),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

export interface CreateConsultationResult {
  booking?: Pick<Booking, "id">;
  error?: string;
}

/**
 * Fases 6-7 ("conectar disponibilidad + pago + consulta"): crea la reserva
 * de una consulta con un tarotista DISPONIBLE ahora mismo — sin elegir
 * fecha/hora, el "horario" es "ya, en cuanto se confirme el pago". Mismo
 * truco de rango vacío que ya usa createReportRequest() (startsAt=endsAt=
 * now, nunca ocupa la agenda ni choca con el EXCLUDE constraint), y
 * reutiliza el motor de pago existente sin ningún cambio: el booking
 * resultante pasa por /reservas/[id] con PayPal/Pago Móvil/Zelle/Binance
 * exactamente igual que cualquier otra reserva.
 *
 * Los servicios "solo informe" (Numerología/Carta Astral) quedan afuera a
 * propósito — ya tienen su propio flujo sin agenda (createReportRequest),
 * no dependen de que un tarotista esté disponible en vivo.
 */
export async function createInstantConsultation(
  input: CreateConsultationInput,
  loggedInUser?: CurrentUser | null,
): Promise<CreateConsultationResult> {
  const parsed = createConsultationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { tarotistaId, serviceId, guestName, guestEmail, guestPhone, intakeData } = parsed.data;

  const tarotista = await prisma.tarotista.findUnique({ where: { id: tarotistaId } });
  if (!tarotista || !tarotista.active) {
    return { error: "Ese tarotista ya no está disponible." };
  }
  if (tarotista.status !== "DISPONIBLE") {
    return { error: `${tarotista.name} ya no está disponible en este momento. Puedes dejar una solicitud.` };
  }

  const service = await getServiceById(serviceId);
  if (!service || !service.available) {
    return { error: "Ese servicio ya no está disponible." };
  }
  if (isReportOnlyService(service.slug)) {
    return { error: "Este servicio se solicita como informe, sin elegir tarotista." };
  }
  if (!hasRequiredIntakeData(service.slug, intakeData)) {
    return { error: "Faltan datos obligatorios para este servicio." };
  }

  const currentUser = loggedInUser === undefined ? await getCurrentUser() : loggedInUser;
  let userId: string | null = null;
  if (currentUser) {
    userId = currentUser.id;
  } else if (!guestName || !guestEmail) {
    return { error: "Nombre y correo son obligatorios para continuar como invitado." };
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
      tarotistaId,
      startsAt: now,
      endsAt: now,
      paymentDeadline,
      intakeData: intakeData ?? undefined,
    },
    include: { service: true, user: true },
  });
  await notifyBookingReceived(booking).catch((err) => console.error("[notify] booking_received:", err));

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      sendExpoPushToUser(admin.id, {
        title: "Nueva reserva",
        body: `${booking.user?.firstName ?? booking.guestName ?? "Un cliente"} — ${service.name} (#${booking.bookingNumber}).`,
        data: { type: "new_booking", bookingId: booking.id },
      }).catch((err) => console.error("[expo-push] new_booking:", err)),
    ),
  );

  return { booking: { id: booking.id } };
}
