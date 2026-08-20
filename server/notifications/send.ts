import "server-only";
import { sendEmail } from "@/lib/email";
import {
  bookingReceivedEmail,
  paymentConfirmedEmail,
  reminderEmail,
  cancelledEmail,
  expiredEmail,
  passwordResetEmail,
} from "@/server/notifications/templates";
import type { BookingEmailContext } from "@/server/notifications/templates";

/** Reserva mínima con lo que hace falta para armar una notificación (incluye `service` y opcionalmente `user`). */
export interface NotifiableBooking {
  bookingNumber: string;
  startsAt: Date;
  guestName: string | null;
  guestEmail: string | null;
  service: { name: string; durationMinutes: number };
  user: { firstName: string; email: string } | null;
}

function toContext(booking: NotifiableBooking): { ctx: BookingEmailContext; email: string } | null {
  const email = booking.user?.email ?? booking.guestEmail;
  if (!email) return null;

  return {
    email,
    ctx: {
      recipientName: booking.user?.firstName ?? booking.guestName ?? "",
      bookingNumber: booking.bookingNumber,
      serviceName: booking.service.name,
      durationMinutes: booking.service.durationMinutes,
      startsAt: booking.startsAt,
    },
  };
}

export async function notifyBookingReceived(booking: NotifiableBooking): Promise<void> {
  const resolved = toContext(booking);
  if (!resolved) return;
  const { subject, html, text } = bookingReceivedEmail(resolved.ctx);
  await sendEmail({ to: resolved.email, subject, html, text });
}

export async function notifyPaymentConfirmed(booking: NotifiableBooking): Promise<void> {
  const resolved = toContext(booking);
  if (!resolved) return;
  const { subject, html, text } = paymentConfirmedEmail(resolved.ctx);
  await sendEmail({ to: resolved.email, subject, html, text });
}

export async function notifyReminder(booking: NotifiableBooking, hoursBefore: number): Promise<void> {
  const resolved = toContext(booking);
  if (!resolved) return;
  const { subject, html, text } = reminderEmail(resolved.ctx, hoursBefore);
  await sendEmail({ to: resolved.email, subject, html, text });
}

export async function notifyCancelled(booking: NotifiableBooking): Promise<void> {
  const resolved = toContext(booking);
  if (!resolved) return;
  const { subject, html, text } = cancelledEmail(resolved.ctx);
  await sendEmail({ to: resolved.email, subject, html, text });
}

export async function notifyExpired(booking: NotifiableBooking): Promise<void> {
  const resolved = toContext(booking);
  if (!resolved) return;
  const { subject, html, text } = expiredEmail(resolved.ctx);
  await sendEmail({ to: resolved.email, subject, html, text });
}

export async function notifyPasswordReset(to: string, firstName: string, resetLink: string): Promise<void> {
  const { subject, html, text } = passwordResetEmail(firstName, resetLink);
  await sendEmail({ to, subject, html, text });
}
