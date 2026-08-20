import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientAdminById } from "@/server/admin/clients";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import { GlassCard } from "@/components/ui/GlassCard";

export const metadata: Metadata = { title: "Panel — Cliente" };

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientAdminById(id);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <span className="eyebrow">Cliente</span>
        <h2 className="mt-2 mb-1">
          {client.firstName} {client.lastName ?? ""}
        </h2>
        <p className="mb-0 text-sm text-bone-dim">{client.email}</p>
        <p className="mb-0 text-sm text-bone-dim">{client.phone ?? "Sin WhatsApp"}</p>
        <p className="mb-0 text-sm text-bone-dim">{client.country ?? ""}</p>
      </GlassCard>

      <GlassCard>
        <span className="eyebrow mb-3">Historial de reservas</span>
        {client.bookings.length === 0 ? (
          <p className="mb-0 text-sm text-ash">Sin reservas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {client.bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between border-b border-white/5 py-2 text-sm">
                <span className="text-bone">
                  {b.service.name} — {fullDateLabel(businessDateString(b.startsAt))} ·{" "}
                  {formatMinutes(minutesInBusinessDay(b.startsAt))}
                </span>
                <span className="text-bone-dim">{BOOKING_STATUS_LABEL[b.status]}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
