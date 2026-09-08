import type { Metadata } from "next";
import Link from "next/link";
import { listClientsAdmin } from "@/server/admin/clients";
import { fullDateLabel } from "@/lib/date-labels";
import { businessDateString } from "@/lib/timezone";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { EyeIcon } from "@/components/ui/icons";
import { ICON_BTN_NEUTRAL } from "@/lib/admin-ui";
import { SummaryBar } from "@/components/admin/SummaryBar";

export const metadata: Metadata = { title: "Panel — Clientes", robots: { index: false } };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const clients = await listClientsAdmin(q);

  const totalSpent = clients.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="flex flex-col gap-6">
      <SummaryBar
        stats={[
          { label: "Clientes", value: clients.length },
          { label: "Con reservas", value: clients.filter((c) => c.bookingsCount > 0).length, tone: "success" },
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
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left font-mono text-[11px] uppercase tracking-wide text-ash">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Email</th>
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
                  <td className="py-2.5 pr-4 text-bone-dim">{c.bookingsCount}</td>
                  <td className="py-2.5 pr-4 text-bone-dim">
                    {c.lastBookingAt ? fullDateLabel(businessDateString(c.lastBookingAt)) : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-bone-dim">${c.totalSpent.toFixed(2)}</td>
                  <td className="py-2.5 pr-4">
                    <Link href={`/admin/clientes/${c.id}`} title="Ver cliente" className={ICON_BTN_NEUTRAL}>
                      <EyeIcon />
                    </Link>
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
