import type { Metadata } from "next";
import Link from "next/link";
import { listBookingsAdmin } from "@/server/admin/bookings";
import { getServices } from "@/server/services";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/booking-labels";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Panel — Reservas", robots: { index: false } };

interface PageProps {
  searchParams: Promise<{ status?: string; serviceId?: string; from?: string; to?: string; q?: string }>;
}

const STATUS_OPTIONS: BookingStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "RESCHEDULE_REQUESTED",
];

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [bookings, services] = await Promise.all([
    listBookingsAdmin({
      status: params.status as BookingStatus | undefined,
      serviceId: params.serviceId,
      from: params.from,
      to: params.to,
      q: params.q,
    }),
    getServices(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <form method="get" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">Estado</label>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">Servicio</label>
            <select
              name="serviceId"
              defaultValue={params.serviceId ?? ""}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
            >
              <option value="">Todos</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">Desde</label>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">Hasta</label>
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash">Buscar</label>
            <input
              type="text"
              name="q"
              placeholder="Nombre, email, #reserva"
              defaultValue={params.q ?? ""}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
            />
          </div>
          <div className="flex items-end lg:col-span-5">
            <button type="submit" className="btn btn-gold">
              Filtrar
            </button>
          </div>
        </form>
      </GlassCard>

      {bookings.length === 0 ? (
        <EmptyState title="No hay reservas con esos filtros" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left font-mono text-[11px] uppercase tracking-wide text-ash">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Servicio</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Pago</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 pr-4">
                    <Link href={`/admin/reservas/${b.id}`} className="text-gold-soft hover:text-gold">
                      {b.bookingNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-bone">{b.user ? `${b.user.firstName} ${b.user.lastName ?? ""}` : b.guestName}</td>
                  <td className="py-2.5 pr-4 text-bone-dim">
                    {b.service.name}
                    {b.tarotista ? <span className="text-ash"> · {b.tarotista.name}</span> : null}
                  </td>
                  <td className="py-2.5 pr-4 text-bone-dim">
                    {fullDateLabel(businessDateString(b.startsAt))} · {formatMinutes(minutesInBusinessDay(b.startsAt))}
                  </td>
                  <td className="py-2.5 pr-4 text-bone-dim">{BOOKING_STATUS_LABEL[b.status]}</td>
                  <td className="py-2.5 pr-4 text-bone-dim">{PAYMENT_STATUS_LABEL[b.paymentStatus]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
