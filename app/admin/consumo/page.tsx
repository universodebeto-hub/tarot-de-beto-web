import type { Metadata } from "next";
import Link from "next/link";
import { getCallUsageReport } from "@/server/admin/call-usage";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMinutesAdjustment } from "@/components/admin/InlineMinutesAdjustment";
import { fullDateLabel } from "@/lib/date-labels";
import { businessDateString } from "@/lib/timezone";

export const metadata: Metadata = { title: "Panel — Consumo de minutos", robots: { index: false } };

export default async function AdminCallUsagePage() {
  const groups = await getCallUsageReport();

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <p className="mb-0 text-sm text-bone-dim">
          Minutos pagados por cada cliente (según la duración del servicio que compró) contra los minutos que
          realmente consumió en llamada -- útil para detectar consultas donde se pagó más tiempo del que se usó. Si
          atendiste a alguien por WhatsApp en vez de por la app, no queda ninguna llamada registrada -- usá el ajuste
          manual de esa fila para cargar los minutos que realmente usaste.
        </p>
      </GlassCard>

      {groups.length === 0 ? (
        <EmptyState title="Todavía no hay consultas pagadas con tarotista para reportar" />
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
                      <span className="block font-mono text-[10.5px] uppercase tracking-wide text-ash">Consumido</span>
                      <span className="text-bone">{g.totalMinutesConsumed} min</span>
                    </div>
                    <div>
                      <span className="block font-mono text-[10.5px] uppercase tracking-wide text-ash">Sin usar</span>
                      <span className={unused > 0 ? "text-gold-soft" : "text-bone"}>{unused} min</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ash">
                        <th className="py-1.5 pr-4">#</th>
                        <th className="py-1.5 pr-4">Servicio</th>
                        <th className="py-1.5 pr-4">Fecha</th>
                        <th className="py-1.5 pr-4">Llamadas</th>
                        <th className="py-1.5 pr-4">Pagado</th>
                        <th className="py-1.5 pr-4">Consumido</th>
                        <th className="py-1.5 pr-4">Ajuste manual (WhatsApp, etc.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.bookings.map((b) => (
                        <tr key={b.id} className="border-b border-white/5">
                          <td className="py-2 pr-4">
                            <Link href={`/admin/reservas/${b.id}`} className="text-gold-soft hover:text-gold">
                              {b.bookingNumber}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-bone-dim">{b.serviceName}</td>
                          <td className="py-2 pr-4 text-bone-dim">{fullDateLabel(businessDateString(b.startsAt))}</td>
                          <td className="py-2 pr-4 text-bone-dim">{b.callCount}</td>
                          <td className="py-2 pr-4 text-bone-dim">{b.minutesPaid} min</td>
                          <td className="py-2 pr-4 text-bone-dim">{b.minutesConsumed} min</td>
                          <td className="py-2 pr-4">
                            <InlineMinutesAdjustment bookingId={b.id} initial={b.manualAdjustmentMinutes} />
                          </td>
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
  );
}
