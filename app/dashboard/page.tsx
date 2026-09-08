import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutUser } from "@/server/auth";
import { getUserBookings } from "@/server/bookings";
import { getCreditStatus } from "@/server/credit";
import { prisma } from "@/lib/prisma";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/booking-labels";
import { isReportOnlyService, REPORT_DELIVERY_TEXT } from "@/lib/service-fulfillment";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false },
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const bookings = await getUserBookings(user.id);
  const creditStatus = user.canUseCredit ? await getCreditStatus(user.id) : null;
  const hasPendingCredit = Boolean(creditStatus && (creditStatus.amountOwed > 0 || creditStatus.paused));

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Mi cuenta</span>
            <h1 className="mt-3 mb-0">
              Hola, <em>{user.firstName}</em>
            </h1>
          </div>
          <form action={logoutUser}>
            <button type="submit" className="btn btn-ghost">
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard>
            <span className="eyebrow mb-4">Mi perfil</span>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-ash">Nombre</dt>
                <dd className="mb-0 text-bone">
                  {user.firstName} {user.lastName ?? ""}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-ash">Email</dt>
                <dd className="mb-0 text-bone">{user.email}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-ash">WhatsApp</dt>
                <dd className="mb-0 text-bone">{user.phone || "Sin registrar"}</dd>
              </div>
            </dl>
          </GlassCard>

          {hasPendingCredit && creditStatus ? (
            <GlassCard className="lg:col-span-2">
              <span className="eyebrow mb-3">Pagos pendientes</span>
              <p className="mb-2 text-sm text-bone-dim">
                Tenés un saldo pendiente de <span className="text-gold-soft">${creditStatus.amountOwed.toFixed(2)}</span> por
                consultas atendidas a crédito ({creditStatus.minutesAccumulated} de {creditStatus.minutesCap} minutos usados).
              </p>
              {creditStatus.paused ? (
                <p className="mb-0 text-sm text-ember">
                  Tu crédito está pausado por ahora -- escribinos por WhatsApp para regularizar el pago y volver a pedir
                  consultas a crédito.
                </p>
              ) : null}
            </GlassCard>
          ) : null}

          <div>
            <span className="eyebrow mb-4">Mis reservas</span>
            {bookings.length === 0 ? (
              <EmptyState
                title="Todavía no tienes reservas"
                description="Elige un tarotista disponible para agendar tu primera consulta."
                action={
                  <Button href="/tarotistas" className="mt-2">
                    Ver tarotistas
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((booking) => {
                  const isReport = isReportOnlyService(booking.service.slug);
                  const isConsultation = Boolean(booking.tarotistaId) && !isReport;
                  return (
                  <Link key={booking.id} href={`/reservas/${booking.id}`}>
                    <GlassCard className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-gold/40">
                      <div>
                        <p className="mb-1 text-bone">{booking.service.name}</p>
                        <p className="mb-0 font-mono text-[11.5px] uppercase tracking-wide text-ash">
                          {isReport
                            ? `Informe · entrega en ${REPORT_DELIVERY_TEXT}`
                            : isConsultation
                              ? `Consulta con ${booking.tarotista?.name}`
                              : `${fullDateLabel(businessDateString(booking.startsAt))} · ${formatMinutes(minutesInBusinessDay(booking.startsAt))}`}{" "}
                          · #{booking.bookingNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="mb-0.5 text-sm text-gold-soft">{BOOKING_STATUS_LABEL[booking.status]}</p>
                        <p className="mb-0 font-mono text-[11px] uppercase tracking-wide text-ash">
                          {PAYMENT_STATUS_LABEL[booking.paymentStatus]}
                        </p>
                      </div>
                    </GlassCard>
                  </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
