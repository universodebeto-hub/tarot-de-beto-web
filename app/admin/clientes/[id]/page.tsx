import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientAdminById } from "@/server/admin/clients";
import { listTarotistasAdmin } from "@/server/admin/tarotistas";
import { getServices } from "@/server/services";
import { getCreditStatus } from "@/server/credit";
import {
  setUserCreditApprovalFormAction,
  deleteClientAction,
} from "@/app/admin/clientes/[id]/actions";
import { CreditAccountPanel } from "@/components/admin/CreditAccountPanel";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { BOOKING_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/booking-labels";
import { BOOKING_STATUS_TONE } from "@/lib/status-tone";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrashIcon } from "@/components/ui/icons";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { EditClientInfoForm } from "@/components/admin/EditClientInfoForm";
import { PromoteToAdminButton } from "@/components/admin/PromoteToAdminButton";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { GiftConsultationForm } from "@/components/admin/GiftConsultationForm";
import { ClientNotesPanel } from "@/components/ClientNotesPanel";

export const metadata: Metadata = { title: "Panel — Cliente", robots: { index: false } };

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clientOrNull, tarotistas, services] = await Promise.all([
    getClientAdminById(id),
    listTarotistasAdmin(),
    getServices(),
  ]);
  if (!clientOrNull) notFound();
  const client = clientOrNull;
  const creditStatus = await getCreditStatus(client.id);

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

          {client.canUseCredit ? (
            <div className="border-t border-white/10 pt-6">
              <CreditAccountPanel clientId={client.id} status={creditStatus} />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
            <span className="eyebrow">Regalar consulta</span>
            <GiftConsultationForm
              clientId={client.id}
              services={services.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
              tarotistas={tarotistas.map((t) => ({ id: t.id, name: t.name }))}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
            <span className="eyebrow">Zona de riesgo</span>
            <ConfirmActionButton
              label="Eliminar cuenta"
              icon={<TrashIcon className="h-4 w-4" />}
              pendingLabel="Eliminando…"
              tone="danger"
              confirmLabel="Sí, eliminar"
              confirmMessage={`¿Eliminar la cuenta de ${client.firstName} ${client.lastName ?? ""}? Solo se puede si nunca tuvo reservas.`}
              action={deleteClientAction.bind(null, client.id)}
              className="btn btn-ghost self-start flex items-center gap-2 border-ember/40 text-ember hover:border-ember hover:bg-ember/10"
            />
          </div>
        </div>
      ),
    },
    {
      id: "notas",
      label: "Notas de seguimiento",
      content: (
        <ClientNotesPanel
          clientId={client.id}
          notes={client.clientNotes}
          revalidatePaths={[`/admin/clientes/${client.id}`]}
        />
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
                  {b.paymentMethod === "CORTESIA" ? (
                    <span className="ml-2 text-xs text-gold-soft">({PAYMENT_METHOD_LABEL.CORTESIA})</span>
                  ) : null}
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
        <div className="flex items-center justify-between">
          <span className="eyebrow">Cliente</span>
          <StatusBadge label={client.isActive ? "Activo" : "Inactivo"} tone={client.isActive ? "success" : "neutral"} />
        </div>
        <div>
          <h2 className="mt-2 mb-1">
            {client.firstName} {client.lastName ?? ""}
          </h2>
          <p className="mb-0 text-sm text-bone-dim">{client.email}</p>
          <p className="mb-0 text-sm text-bone-dim">{client.phone ?? "Sin WhatsApp"}</p>
          <p className="mb-0 text-sm text-bone-dim">{client.country ?? ""}</p>
          <p className="mb-0 text-sm text-bone-dim">
            Minutos disponibles: <span className="text-gold-soft">{client.minutesBalance}</span>
          </p>
        </div>
      </GlassCard>

      <GlassCard>
        <Tabs items={tabs} />
      </GlassCard>
    </div>
  );
}
