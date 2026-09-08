import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientAdminById } from "@/server/admin/clients";
import { setUserCreditApprovalFormAction } from "@/app/admin/clientes/[id]/actions";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import { BOOKING_STATUS_TONE } from "@/lib/status-tone";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { EditClientInfoForm } from "@/components/admin/EditClientInfoForm";
import { PromoteToAdminButton } from "@/components/admin/PromoteToAdminButton";

export const metadata: Metadata = { title: "Panel — Cliente", robots: { index: false } };

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientOrNull = await getClientAdminById(id);
  if (!clientOrNull) notFound();
  const client = clientOrNull;

  const tabs: TabItem[] = [
    {
      id: "ajustes",
      label: "Ajustes",
      content: (
        <div className="flex flex-col gap-6">
          <EditClientInfoForm
            userId={client.id}
            firstName={client.firstName}
            lastName={client.lastName}
            email={client.email}
            phone={client.phone}
            country={client.country}
          />
          <PromoteToAdminButton userId={client.id} name={`${client.firstName} ${client.lastName ?? ""}`.trim()} />

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Créditos Beto</span>
              <StatusBadge
                label={client.canUseCredit ? "Habilitado" : "No habilitado"}
                tone={client.canUseCredit ? "success" : "neutral"}
              />
            </div>
            <form action={setUserCreditApprovalFormAction.bind(null, client.id, !client.canUseCredit)}>
              <button type="submit" className={client.canUseCredit ? "btn btn-ghost" : "btn btn-gold"}>
                {client.canUseCredit ? "Deshabilitar crédito" : "Habilitar para pagar a crédito"}
              </button>
            </form>
          </div>
        </div>
      ),
    },
    {
      id: "historial",
      label: "Historial",
      badge: client.bookings.length > 0 ? <span className="text-ash">({client.bookings.length})</span> : null,
      content:
        client.bookings.length === 0 ? (
          <p className="mb-0 text-sm text-ash">Sin reservas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {client.bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between border-b border-white/5 py-2 text-sm">
                <span className="text-bone">
                  {b.service.name} — {fullDateLabel(businessDateString(b.startsAt))} ·{" "}
                  {formatMinutes(minutesInBusinessDay(b.startsAt))}
                </span>
                <StatusBadge label={BOOKING_STATUS_LABEL[b.status]} tone={BOOKING_STATUS_TONE[b.status]} />
              </div>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="flex flex-col gap-3">
        <span className="eyebrow">Cliente</span>
        <div>
          <h2 className="mt-2 mb-1">
            {client.firstName} {client.lastName ?? ""}
          </h2>
          <p className="mb-0 text-sm text-bone-dim">{client.email}</p>
          <p className="mb-0 text-sm text-bone-dim">{client.phone ?? "Sin WhatsApp"}</p>
          <p className="mb-0 text-sm text-bone-dim">{client.country ?? ""}</p>
        </div>
      </GlassCard>

      <GlassCard>
        <Tabs items={tabs} />
      </GlassCard>
    </div>
  );
}
