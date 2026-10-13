import type { Metadata } from "next";
import Link from "next/link";
import { hayFirma, listarInformes } from "@/server/admin/informes";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SummaryBar } from "@/components/admin/SummaryBar";
import { FirmaInformeForm } from "@/components/admin/informes/FirmaInformeForm";
import { ESTADO_INFORME_ETIQUETA, ESTADO_INFORME_TONO } from "@/lib/astro/estado-informe";
import { VALUE_TONE } from "@/components/admin/SummaryBar";

export const metadata: Metadata = { title: "Panel — Informes de carta astral", robots: { index: false } };
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const fecha = (d: Date) =>
  new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(d);

export default async function AdminInformesPage() {
  const [informes, firma] = await Promise.all([listarInformes(), hayFirma()]);
  const porHacer = informes.filter((i) => i.estado === "PENDIENTE").length;
  const enRevision = informes.filter((i) => i.estado === "CALCULADO" || i.estado === "REDACTADO").length;
  const entregados = informes.filter((i) => i.estado === "ENTREGADO").length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="eyebrow">Carta astral</span>
        <h2 className="mt-2 mb-0">Informes</h2>
        <p className="mt-2 mb-0 text-sm text-bone-dim">
          Aquí aparecen las cartas astrales ya pagadas. Genera el borrador, revísalo a detalle, ajústalo y descarga el PDF para
          enviarlo tú.
        </p>
      </div>

      <SummaryBar
        stats={[
          { label: "informes", value: informes.length },
          { label: "por empezar", value: porHacer, tone: porHacer > 0 ? "warning" : "neutral" },
          { label: "en revisión", value: enRevision, tone: enRevision > 0 ? "warning" : "neutral" },
          { label: "entregados", value: entregados, tone: "success" },
        ]}
      />

      {informes.length === 0 ? (
        <EmptyState title="Todavía no hay informes" description="Cuando una reserva de Carta Astral quede pagada, aparecerá aquí." />
      ) : (
        <GlassCard className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[11px] uppercase tracking-wide text-ash">
                <th className="px-4 py-3 font-normal">Reserva</th>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">Estado</th>
                <th className="px-4 py-3 font-normal">Textos</th>
                <th className="px-4 py-3 font-normal">Pagada</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {informes.map((i) => (
                <tr key={i.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-bone-dim">{i.bookingNumber}</td>
                  <td className="px-4 py-3 text-bone">{i.cliente}</td>
                  <td className="px-4 py-3">
                    <span className={VALUE_TONE[ESTADO_INFORME_TONO[i.estado]]}>{ESTADO_INFORME_ETIQUETA[i.estado]}</span>
                    {i.error ? <span className="ml-2 text-xs text-ember">con error</span> : null}
                  </td>
                  <td className="px-4 py-3 text-bone-dim">{i.seccionesHechas > 0 ? `${i.seccionesHechas} secciones` : "—"}</td>
                  <td className="px-4 py-3 text-bone-dim">{fecha(i.entregado ?? i.creado)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/informes/${i.id}`} className="btn btn-ghost">
                      {i.estado === "ENTREGADO" ? "Ver" : "Abrir"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      <GlassCard className="flex flex-col gap-3">
        <span className="eyebrow">Firma del informe</span>
        <FirmaInformeForm hayFirma={firma} />
      </GlassCard>
    </div>
  );
}
