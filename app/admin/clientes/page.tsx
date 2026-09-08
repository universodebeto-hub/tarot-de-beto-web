import type { Metadata } from "next";
import Link from "next/link";
import { listClientsAdmin } from "@/server/admin/clients";
import { fullDateLabel } from "@/lib/date-labels";
import { businessDateString } from "@/lib/timezone";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EyeIcon, TrashIcon } from "@/components/ui/icons";
import { ICON_BTN_NEUTRAL, ICON_BTN_DANGER } from "@/lib/admin-ui";
import { SummaryBar } from "@/components/admin/SummaryBar";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { deleteClientFromListAction } from "@/app/admin/clientes/[id]/actions";

export const metadata: Metadata = { title: "Panel — Clientes", robots: { index: false } };

interface PageProps {
  searchParams: Promise<{ q?: string; activity?: string }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const { q, activity } = await searchParams;
  const allClients = await listClientsAdmin(q);

  const activeCount = allClients.filter((c) => c.isActive).length;
  const inactiveCount = allClients.filter((c) => !c.isActive).length;
  const clients =
    activity === "active"
      ? allClients.filter((c) => c.isActive)
      : activity === "inactive"
        ? allClients.filter((c) => !c.isActive)
        : allClients;

  const totalSpent = allClients.reduce((sum, c) => sum + c.totalSpent, 0);

  function hrefForActivity(value: "active" | "inactive" | ""): string {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (value) qs.set("activity", value);
    const query = qs.toString();
    return `/admin/clientes${query ? `?${query}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryBar
        stats={[
          { label: "Clientes", value: allClients.length, href: hrefForActivity(""), active: !activity },
          {
            label: "Activos (30 días)",
            value: activeCount,
            tone: "success",
            href: hrefForActivity("active"),
            active: activity === "active",
          },
          {
            label: "Inactivos",
            value: inactiveCount,
            tone: "neutral",
            href: hrefForActivity("inactive"),
            active: activity === "inactive",
          },
          { label: "Total histórico", value: `$${totalSpent.toFixed(2)}` },
        ]}
      />

      <GlassCard>
        <form method="get" className="flex gap-3">
          <input
            type="text"
            name="q"
            placeholder="Buscar por nombre o email"
            defaultValue={q ?? ""}
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
          />
          <button type="submit" className="btn btn-gold">
            Buscar
          </button>
        </form>
      </GlassCard>

      {clients.length === 0 ? (
        <EmptyState title="No hay clientes registrados" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left font-mono text-[11px] uppercase tracking-wide text-ash">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">WhatsApp</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Reservas</th>
                <th className="py-2 pr-4">Última consulta</th>
                <th className="py-2 pr-4">Total gastado</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 pr-4">
                    <Link href={`/admin/clientes/${c.id}`} className="text-gold-soft hover:text-gold">
                      {c.firstName} {c.lastName ?? ""}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-bone-dim">{c.email}</td>
                  <td className="py-2.5 pr-4 text-bone-dim">{c.phone ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge label={c.isActive ? "Activo" : "Inactivo"} tone={c.isActive ? "success" : "neutral"} />
                  </td>
                  <td className="py-2.5 pr-4 text-bone-dim">{c.bookingsCount}</td>
                  <td className="py-2.5 pr-4 text-bone-dim">
                    {c.lastBookingAt ? fullDateLabel(businessDateString(c.lastBookingAt)) : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-bone-dim">${c.totalSpent.toFixed(2)}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/clientes/${c.id}`} title="Ver cliente" className={ICON_BTN_NEUTRAL}>
                        <EyeIcon />
                      </Link>
                      <ConfirmActionButton
                        label=""
                        icon={<TrashIcon />}
                        title="Eliminar"
                        pendingLabel=""
                        tone="danger"
                        confirmLabel="Sí, eliminar"
                        confirmMessage={`¿Eliminar la cuenta de ${c.firstName} ${c.lastName ?? ""}? Solo se puede si nunca tuvo reservas.`}
                        action={deleteClientFromListAction.bind(null, c.id)}
                        className={ICON_BTN_DANGER}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
