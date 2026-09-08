import "server-only";
import { prisma } from "@/lib/prisma";

/** Número correlativo de reserva (BETO-<año>-00001), atómico por año -- compartido por todo lo que crea una Booking (server/bookings.ts, server/consultations.ts, regalos de consulta desde el panel admin). */
export async function nextBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `booking_number_${year}`;
  // Un solo upsert atómico (INSERT ... ON CONFLICT DO UPDATE) — separarlo en
  // upsert+update deja una ventana de carrera real: dos solicitudes
  // concurrentes que crean el contador del año por primera vez al mismo
  // tiempo pueden violar la restricción única de `key` entre el upsert y el
  // update.
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `BETO-${year}-${String(counter.value).padStart(5, "0")}`;
}
