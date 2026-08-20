import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookingAdminById } from "@/server/admin/bookings";
import { changeBookingStatusFormAction } from "@/app/admin/reservas/[id]/actions";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/booking-labels";
import { GlassCard } from "@/components/ui/GlassCard";
import { AdminNoteForm } from "@/components/admin/AdminNoteForm";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Panel — Detalle de reserva", robots: { index: false } };

const TRANSITIONS: Record<string, { label: string; status: BookingStatus }[]> = {
  PENDING_PAYMENT: [
    { label: "Confirmar (pago recibido)", status: "CONFIRMED" },
    { label: "Cancelar", status: "CANCELLED" },
  ],
  CONFIRMED: [
    { label: "Marcar como completada", status: "COMPLETED" },
    { label: "Cancelar", status: "CANCELLED" },
    { label: "Solicitar reprogramación", status: "RESCHEDULE_REQUESTED" },
  ],
  RESCHEDULE_REQUESTED: [
    { label: "Confirmar de nuevo", status: "CONFIRMED" },
    { label: "Cancelar", status: "CANCELLED" },
  ],
};

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBookingAdminById(id);
  if (!booking) notFound();

  const dateLabel = fullDateLabel(businessDateString(booking.startsAt));
  const timeLabel = formatMinutes(minutesInBusinessDay(booking.startsAt));
  const transitions = TRANSITIONS[booking.status] ?? [];

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="flex flex-col gap-4">
        <span className="eyebrow">#{booking.bookingNumber}</span>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Cliente</span>
            <span className="text-bone">
              {booking.user ? `${booking.user.firstName} ${booking.user.lastName ?? ""}` : booking.guestName}
            </span>
            <p className="mb-0 text-xs text-ash">{booking.user?.email ?? booking.guestEmail}</p>
            <p className="mb-0 text-xs text-ash">{booking.user?.phone ?? booking.guestPhone ?? "Sin WhatsApp"}</p>
          </div>
          <div>
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Servicio</span>
            <span className="text-bone">{booking.service.name}</span>
            <p className="mb-0 text-xs text-ash">{booking.service.durationMinutes} min · ${Number(booking.service.price).toFixed(2)}</p>
          </div>
          <div>
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Fecha</span>
            <span className="text-bone">
              {dateLabel} · {timeLabel}
            </span>
          </div>
          <div>
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Estado</span>
            <span className="text-bone">{BOOKING_STATUS_LABEL[booking.status]}</span>
            <p className="mb-0 text-xs text-ash">{PAYMENT_STATUS_LABEL[booking.paymentStatus]}</p>
          </div>
        </div>

        {transitions.length > 0 ? (
          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
            {transitions.map((t) => (
              <form key={t.status} action={changeBookingStatusFormAction.bind(null, booking.id, t.status)}>
                <button type="submit" className={t.status === "CANCELLED" ? "btn btn-ghost" : "btn btn-gold"}>
                  {t.label}
                </button>
              </form>
            ))}
          </div>
        ) : null}
      </GlassCard>

      {booking.transactions.length > 0 ? (
        <GlassCard>
          <span className="eyebrow mb-3">Transacciones PayPal</span>
          <div className="flex flex-col gap-2 text-sm">
            {booking.transactions.map((t) => (
              <div key={t.id} className="border-b border-white/5 pb-2">
                <p className="mb-0 text-bone">
                  {t.paypalOrderId} — {t.status}
                </p>
                <p className="mb-0 text-xs text-ash">
                  {Number(t.amount).toFixed(2)} {t.currency}
                  {t.paypalCaptureId ? ` · captura ${t.paypalCaptureId}` : ""}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="flex flex-col gap-3">
        <span className="eyebrow">Notas internas</span>
        {booking.notes ? (
          <pre className="mb-0 whitespace-pre-wrap font-body text-sm text-bone-dim">{booking.notes}</pre>
        ) : (
          <p className="mb-0 text-sm text-ash">Sin notas todavía.</p>
        )}
        <AdminNoteForm bookingId={booking.id} />
      </GlassCard>
    </div>
  );
}
