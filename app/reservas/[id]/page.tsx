import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBookingById } from "@/server/bookings";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/booking-labels";
import { siteConfig } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { PendingPaymentPanel } from "@/components/booking/PendingPaymentPanel";
import { PayPalButton } from "@/components/booking/PayPalButton";
import { ManualPaymentPanel } from "@/components/booking/ManualPaymentPanel";
import { isReportOnlyService, REPORT_DELIVERY_TEXT } from "@/lib/service-fulfillment";
import { getManualPaymentInstructions } from "@/server/settings";

export const metadata: Metadata = {
  title: "Tu reserva",
  robots: { index: false },
};

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: BookingPageProps) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) notFound();

  const isReport = isReportOnlyService(booking.service.slug);
  const dateLabel = fullDateLabel(businessDateString(booking.startsAt));
  const timeLabel = formatMinutes(minutesInBusinessDay(booking.startsAt));
  const isPending = booking.status === "PENDING_PAYMENT";
  const isExpired = booking.status === "EXPIRED";
  const manualPaymentInstructions = isPending ? await getManualPaymentInstructions() : null;

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <span className="eyebrow justify-center">Reserva</span>
            <h1 className="mt-3">
              {isPending ? (
                <>
                  Tu {isReport ? "solicitud" : "consulta"} está <em>casi lista</em>
                </>
              ) : isExpired ? (
                <>
                  Esta {isReport ? "solicitud" : "reserva"} <em>expiró</em>
                </>
              ) : isReport ? (
                <>
                  ¡Tu solicitud ha sido <em>confirmada!</em>
                </>
              ) : (
                <>
                  ¡Tu consulta ha sido <em>reservada!</em>
                </>
              )}
            </h1>
            <p className="mb-0 font-mono text-sm text-gold">#{booking.bookingNumber}</p>
          </div>

          <GlassCard className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
                  Servicio
                </span>
                <span className="text-bone">{booking.service.name}</span>
              </div>
              {isReport ? (
                <div>
                  <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
                    Modalidad
                  </span>
                  <span className="text-bone">Informe personalizado</span>
                </div>
              ) : (
                <div>
                  <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
                    Duración
                  </span>
                  <span className="text-bone">{booking.service.durationMinutes} min</span>
                </div>
              )}
              {isReport ? (
                <div>
                  <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
                    Entrega
                  </span>
                  <span className="text-bone">{REPORT_DELIVERY_TEXT} tras confirmar el pago</span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Fecha</span>
                    <span className="text-bone">{dateLabel}</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Hora</span>
                    <span className="text-bone">{timeLabel} (Colombia)</span>
                  </div>
                </>
              )}
              <div>
                <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
                  Estado
                </span>
                <span className="text-bone">{BOOKING_STATUS_LABEL[booking.status]}</span>
              </div>
              <div>
                <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Pago</span>
                <span className="text-bone">{PAYMENT_STATUS_LABEL[booking.paymentStatus]}</span>
              </div>
            </div>

            <div className="divider" />

            {isPending ? (
              <div className="flex flex-col gap-5">
                {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
                  <div>
                    <span className="eyebrow mb-3">Pagar con PayPal</span>
                    <PayPalButton
                      clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}
                      currency={booking.service.currency}
                      bookingId={booking.id}
                    />
                  </div>
                ) : null}
                {manualPaymentInstructions ? (
                  <ManualPaymentPanel bookingId={booking.id} instructions={manualPaymentInstructions} />
                ) : null}
                <PendingPaymentPanel
                  paymentDeadline={booking.paymentDeadline.toISOString()}
                  bookingNumber={booking.bookingNumber}
                  whatsappNumber={siteConfig.contact.whatsappNumber}
                  message={
                    isReport
                      ? `Hola Beto, quiero confirmar el pago de mi solicitud ${booking.bookingNumber} (${booking.service.name}).`
                      : `Hola Beto, quiero confirmar el pago de mi reserva ${booking.bookingNumber} (${booking.service.name}, ${dateLabel} a las ${timeLabel}).`
                  }
                />
              </div>
            ) : isExpired ? (
              <div className="flex flex-col gap-3">
                <p className="mb-0 text-sm">
                  {isReport
                    ? "El pago no se completó a tiempo. Puedes solicitarlo de nuevo cuando quieras."
                    : "El horario no se confirmó a tiempo y ya volvió a quedar disponible para otras personas."}
                </p>
                <Button href={isReport ? `/reservar?service=${booking.service.id}` : "/agenda"} className="self-start">
                  {isReport ? "Solicitar de nuevo" : "Elegir otro horario"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {isReport ? (
                  <p className="mb-0 text-sm text-bone-dim">
                    Lo elaboraremos y te lo enviaremos dentro de un plazo de{" "}
                    <strong className="font-medium text-bone">{REPORT_DELIVERY_TEXT}</strong>.
                  </p>
                ) : (
                  <a href={`/api/bookings/${booking.id}/ics`} download className="btn btn-ghost">
                    Agregar al calendario
                  </a>
                )}
                <Link href="/contacto" className="btn btn-ghost">
                  ¿Necesitas ayuda con tu {isReport ? "solicitud" : "reserva"}?
                </Link>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
