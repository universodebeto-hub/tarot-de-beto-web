import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookingAdminById } from "@/server/admin/bookings";
import { changeBookingStatusFormAction, setCreditPaidFormAction, deleteBookingAction } from "@/app/admin/reservas/[id]/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/booking-labels";
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/lib/status-tone";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrashIcon } from "@/components/ui/icons";
import { AdminNoteForm } from "@/components/admin/AdminNoteForm";
import { intakeFieldsFor } from "@/lib/service-intake";
import { isReportOnlyService, REPORT_DELIVERY_TEXT } from "@/lib/service-fulfillment";
import { effectivePrice } from "@/lib/booking-price";
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

  const isReport = isReportOnlyService(booking.service.slug);
  const isConsultation = Boolean(booking.tarotistaId) && !isReport;
  const dateLabel = fullDateLabel(businessDateString(booking.startsAt));
  const timeLabel = formatMinutes(minutesInBusinessDay(booking.startsAt));
  const isCredit = booking.paymentMethod === "CREDITO_BETO";
  const transitions = (TRANSITIONS[booking.status] ?? []).map((t) =>
    isCredit && t.status === "CONFIRMED" ? { ...t, label: "Aprobar consulta a crédito" } : t,
  );

  const intakeData =
    booking.intakeData && typeof booking.intakeData === "object" && !Array.isArray(booking.intakeData)
      ? (booking.intakeData as Record<string, string>)
      : null;
  const intakeLabels = intakeFieldsFor(booking.service.slug);

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
            <p className="mb-0 text-xs text-ash">
              {isReport ? "Informe" : `${booking.service.durationMinutes} min`} · $
              {effectivePrice(Number(booking.service.price), booking.videoRequested).toFixed(2)}
            </p>
            {booking.videoRequested ? <p className="mb-0 text-xs text-gold-soft">Con videollamada (+20%)</p> : null}
          </div>
          <div>
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
              {isReport ? "Solicitado" : isConsultation ? "Tarotista" : "Fecha"}
            </span>
            <span className="text-bone">
              {isReport ? dateLabel : isConsultation ? booking.tarotista?.name : `${dateLabel} · ${timeLabel}`}
            </span>
            {isReport ? (
              <p className="mb-0 text-xs text-gold-soft">Informe · entrega en {REPORT_DELIVERY_TEXT}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Estado</span>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge label={BOOKING_STATUS_LABEL[booking.status]} tone={BOOKING_STATUS_TONE[booking.status]} />
              <StatusBadge label={PAYMENT_STATUS_LABEL[booking.paymentStatus]} tone={PAYMENT_STATUS_TONE[booking.paymentStatus]} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          {transitions.map((t) => (
            <form key={t.status} action={changeBookingStatusFormAction.bind(null, booking.id, t.status)}>
              <button type="submit" className={t.status === "CANCELLED" ? "btn btn-ghost" : "btn btn-gold"}>
                {t.label}
              </button>
            </form>
          ))}
          <ConfirmActionButton
            label="Eliminar registro"
            icon={<TrashIcon className="h-4 w-4" />}
            pendingLabel="Eliminando…"
            tone="danger"
            confirmLabel="Sí, eliminar"
            confirmMessage={`¿Eliminar por completo la reserva #${booking.bookingNumber}? Se borra el registro entero (mensajes, llamadas, transacciones) y no se puede deshacer. Si solo querés que quede anulada, usa "Cancelar" en vez de esto.`}
            action={deleteBookingAction.bind(null, booking.id)}
            className="btn btn-ghost ml-auto flex items-center gap-2 border-ember/40 text-ember hover:border-ember hover:bg-ember/10"
          />
        </div>
      </GlassCard>

      {intakeData ? (
        <GlassCard>
          <span className="eyebrow mb-3">Datos adicionales del servicio</span>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {(intakeLabels.length > 0 ? intakeLabels : Object.keys(intakeData).map((key) => ({ key, label: key })))
              .filter((field) => intakeData[field.key])
              .map((field) => (
                <div key={field.key}>
                  <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
                    {field.label}
                  </span>
                  <span className="text-bone">{intakeData[field.key]}</span>
                </div>
              ))}
          </div>
        </GlassCard>
      ) : null}

      {isCredit ? (
        <GlassCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Créditos Beto</span>
            <span className="text-xs text-bone-dim">{booking.creditPaid ? "Ya cobrado" : "Pendiente de cobro"}</span>
          </div>
          <form action={setCreditPaidFormAction.bind(null, booking.id, !booking.creditPaid)}>
            <button type="submit" className={booking.creditPaid ? "btn btn-ghost" : "btn btn-gold"}>
              {booking.creditPaid ? "Marcar como no cobrado" : "Marcar crédito como cobrado"}
            </button>
          </form>
        </GlassCard>
      ) : null}

      {booking.manualPaymentProofUrl ? (
        <GlassCard className="flex flex-col gap-3">
          <span className="eyebrow">
            Comprobante — {booking.paymentMethod ? PAYMENT_METHOD_LABEL[booking.paymentMethod] : "Método desconocido"}
          </span>
          <p className="mb-0 text-sm text-bone-dim">
            Referencia: <span className="text-bone">{booking.manualPaymentReference}</span>
          </p>
          <a
            href={booking.manualPaymentProofUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-fit overflow-hidden rounded-lg border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica de Vercel Blob, sin dominio fijo que declarar en next.config */}
            <img src={booking.manualPaymentProofUrl} alt="Comprobante de pago" className="max-h-80 w-auto" />
          </a>
          <p className="mb-0 text-xs text-ash">
            Verifica el comprobante contra tu estado de cuenta antes de confirmar el pago arriba.
          </p>
        </GlassCard>
      ) : null}

      {isConsultation ? (
        <GlassCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Llamadas</span>
            <span className="text-xs text-ash">
              Pagado: <span className="text-bone">{booking.service.durationMinutes} min</span> · Consumido:{" "}
              <span className="text-bone">
                {Math.round(
                  booking.callLogs.reduce(
                    (sum, log) =>
                      sum + (log.endedAt ? Math.max(0, (log.endedAt.getTime() - log.startedAt.getTime()) / 60000) : 0),
                    0,
                  ),
                )}{" "}
                min
              </span>
            </span>
          </div>
          {booking.callLogs.length === 0 ? (
            <p className="mb-0 text-sm text-ash">Todavía no hubo ninguna llamada en esta consulta.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {booking.callLogs.map((log) => {
                const durationMinutes = log.endedAt
                  ? Math.round((log.endedAt.getTime() - log.startedAt.getTime()) / 60000)
                  : null;
                return (
                  <div key={log.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-bone-dim">{log.startedAt.toLocaleString("es")}</span>
                    <span className="text-bone-dim">
                      {durationMinutes !== null ? `${durationMinutes} min` : "En curso / sin cerrar"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      ) : null}

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
