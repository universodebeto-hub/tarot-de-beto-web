import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOwnTarotista } from "@/server/tarotista-panel";
import { getCallUsageReport } from "@/server/admin/call-usage";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { fullDateLabel } from "@/lib/date-labels";
import { businessDateString } from "@/lib/timezone";

export const metadata: Metadata = { title: "Mi consumo de minutos", robots: { index: false } };

/** Igual que /admin/consumo pero acotado a las propias consultas del tarotista logueado (ver server/admin/call-usage.ts::getCallUsageReport). */
export default async function TarotistaCallUsagePage() {
  const tarotista = await getOwnTarotista();
  if (!tarotista) redirect("/panel-tarotista");

  const groups = await getCallUsageReport(tarotista.id);

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[900px] px-7">
        <div className="mb-8 text-center">
          <span className="eyebrow justify-center">Mi consumo de minutos</span>
          <h1 className="mt-3">Minutos pagados vs. usados</h1>
          <Link href="/panel-tarotista" className="text-sm text-gold-soft hover:text-gold">
            ← Volver a mi disponibilidad
          </Link>
        </div>

        {groups.length === 0 ? (
          <EmptyState title="Todavía no tienes consultas pagadas para reportar" />
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((g) => {
              const unused = g.totalMinutesPaid - g.totalMinutesConsumed;
              return (
                <GlassCard key={g.clientKey} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="block text-bone">{g.clientName}</span>
                      {g.clientEmail ? <span className="text-xs text-ash">{g.clientEmail}</span> : null}
                    </div>
                    <div className="flex gap-5 text-right text-sm">
                      <div>
                        <span className="block font-mono text-[10.5px] uppercase tracking-wide text-ash">Pagado</span>
                        <span className="text-bone">{g.totalMinutesPaid} min</span>
                      </div>
                      <div>
                        <span className="block font-mono text-[10.5px] uppercase tracking-wide text-ash">
                          Consumido
                        </span>
                        <span className="text-bone">{g.totalMinutesConsumed} min</span>
                      </div>
                      <div>
                        <span className="block font-mono text-[10.5px] uppercase tracking-wide text-ash">
                          Sin usar
                        </span>
                        <span className={unused > 0 ? "text-gold-soft" : "text-bone"}>{unused} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ash">
                          <th className="py-1.5 pr-4">#</th>
                          <th className="py-1.5 pr-4">Servicio</th>
                          <th className="py-1.5 pr-4">Fecha</th>
                          <th className="py-1.5 pr-4">Llamadas</th>
                          <th className="py-1.5 pr-4">Pagado</th>
                          <th className="py-1.5 pr-4">Consumido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.bookings.map((b) => (
                          <tr key={b.id} className="border-b border-white/5">
                            <td className="py-2 pr-4 text-gold-soft">{b.bookingNumber}</td>
                            <td className="py-2 pr-4 text-bone-dim">{b.serviceName}</td>
                            <td className="py-2 pr-4 text-bone-dim">{fullDateLabel(businessDateString(b.startsAt))}</td>
                            <td className="py-2 pr-4 text-bone-dim">{b.callCount}</td>
                            <td className="py-2 pr-4 text-bone-dim">{b.minutesPaid} min</td>
                            <td className="py-2 pr-4 text-bone-dim">{b.minutesConsumed} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
