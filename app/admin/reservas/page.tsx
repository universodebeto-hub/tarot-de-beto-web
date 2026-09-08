import type { Metadata } from "next";
import { listBookingsAdmin } from "@/server/admin/bookings";
import { getServices } from "@/server/services";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SummaryBar } from "@/components/admin/SummaryBar";
import { BookingsTable, type BookingRow } from "@/components/admin/BookingsTable";
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

  const pendingCount = bookings.filter((b) => b.status === "PENDING_PAYMENT").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const expiredCount = bookings.filter((b) => b.status === "EXPIRED" || b.status === "CANCELLED").length;

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    clientName: b.user ? `${b.user.firstName} ${b.user.lastName ?? ""}`.trim() : (b.guestName ?? "—"),
    serviceName: b.service.name,
    tarotistaName: b.tarotista?.name ?? null,
    dateLabel: `${fullDateLabel(businessDateString(b.startsAt))} · ${formatMinutes(minutesInBusinessDay(b.startsAt))}`,
    startsAtMs: b.startsAt.getTime(),
    status: b.status,
    paymentStatus: b.paymentStatus,
  }));

  return (
    <div className="flex flex-col gap-6">
      <SummaryBar
        stats={[
          { label: "Resultados", value: bookings.length },
          { label: "Pendientes de pago", value: pendingCount, tone: "warning" },
          { label: "Confirmadas", value: confirmedCount, tone: "success" },
          { label: "Canceladas / expiradas", value: expiredCount, tone: "danger" },
        ]}
      />

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

      {rows.length === 0 ? <EmptyState title="No hay reservas con esos filtros" /> : <BookingsTable rows={rows} />}
    </div>
  );
}
