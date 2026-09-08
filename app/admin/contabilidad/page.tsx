import type { Metadata } from "next";
import Link from "next/link";
import { getAccountingReport, listExpenses } from "@/server/admin/accounting";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SummaryBar } from "@/components/admin/SummaryBar";
import { BusinessExpenseForm } from "@/components/admin/BusinessExpenseForm";
import { UsdToCopRateForm } from "@/components/admin/UsdToCopRateForm";
import { fullDateLabel } from "@/lib/date-labels";
import { businessDateString } from "@/lib/timezone";

export const metadata: Metadata = { title: "Panel — Contabilidad", robots: { index: false } };

type RangeKey = "mes" | "anio" | "todo";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

function rangeFor(key: RangeKey): { from?: Date; to?: Date } {
  const now = new Date();
  if (key === "mes") return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (key === "anio") return { from: new Date(now.getFullYear(), 0, 1) };
  return {};
}

const RANGE_LABEL: Record<RangeKey, string> = { mes: "Este mes", anio: "Este año", todo: "Todo" };

export default async function AdminAccountingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range: RangeKey = params.range === "anio" || params.range === "todo" ? params.range : "mes";

  const [report, expenses] = await Promise.all([
    getAccountingReport(rangeFor(range)),
    listExpenses(rangeFor(range)),
  ]);

  const ivaProgressPct = Math.min(100, (report.yearToDateGrossUsd * report.usdToCopRate / report.ivaThresholdCop) * 100);
  const yearToDateCop = report.yearToDateGrossUsd * report.usdToCopRate;

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <p className="mb-0 text-sm text-bone-dim">
          Solo se cuentan reservas realmente pagadas (confirmadas o completadas) -- ni pendientes ni canceladas, y sin
          Cortesía (regalos). El <strong className="text-bone">ingreso bruto</strong> es lo que cuenta para el tope de
          IVA ante la DIAN; la <strong className="text-bone">comisión</strong> de PayPal y los{" "}
          <strong className="text-bone">gastos</strong> del negocio se descuentan aparte para calcular la ganancia
          real.
        </p>
      </GlassCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["mes", "anio", "todo"] as RangeKey[]).map((r) => (
            <Link
              key={r}
              href={`/admin/contabilidad?range=${r}`}
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                r === range ? "border border-gold/40 bg-gold/[0.06] text-gold-soft" : "border border-white/10 text-bone-dim hover:border-gold/25"
              }`}
            >
              {RANGE_LABEL[r]}
            </Link>
          ))}
        </div>
        <a href={`/api/admin/accounting/export?range=${range}`} className="btn btn-ghost">
          Exportar CSV
        </a>
      </div>

      <SummaryBar
        stats={[
          { label: "Ingreso bruto", value: `$${report.totalGrossUsd.toFixed(2)}` },
          { label: "Comisión PayPal", value: `$${report.totalFeeUsd.toFixed(2)}`, tone: "warning" },
          { label: "Neto recibido", value: `$${report.totalNetUsd.toFixed(2)}` },
          { label: "Gastos operativos", value: `$${report.totalExpensesUsd.toFixed(2)}`, tone: "warning" },
          {
            label: "Ganancia real",
            value: `$${report.profitUsd.toFixed(2)}`,
            tone: report.profitUsd >= 0 ? "success" : "danger",
          },
        ]}
      />

      <GlassCard className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow">Tope de IVA (DIAN) -- año {new Date().getFullYear()}</span>
          <span className="text-sm text-bone-dim">
            {report.yearToDateGrossUsd.toFixed(2)} USD · ${yearToDateCop.toLocaleString("es-CO", { maximumFractionDigits: 0 })}{" "}
            COP de ${report.ivaThresholdCop.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP ({report.ivaThresholdUvt} UVT)
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${ivaProgressPct >= 90 ? "bg-ember" : ivaProgressPct >= 70 ? "bg-gold-soft" : "bg-emerald"}`}
            style={{ width: `${ivaProgressPct}%` }}
          />
        </div>
        <p className="mb-0 text-xs text-ash">
          Al llegar a este tope de ingresos brutos anuales, pasás a ser responsable de IVA. UVT {new Date().getFullYear()} = $
          {report.uvtValueCop.toLocaleString("es-CO")} COP.
        </p>
        <UsdToCopRateForm initial={report.usdToCopRate} />
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <span className="eyebrow">Movimientos ({RANGE_LABEL[range].toLowerCase()})</span>
        {report.rows.length === 0 ? (
          <EmptyState title="Sin ventas pagadas en este período" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ash">
                  <th className="py-1.5 pr-4">#</th>
                  <th className="py-1.5 pr-4">Fecha</th>
                  <th className="py-1.5 pr-4">Cliente</th>
                  <th className="py-1.5 pr-4">Servicio</th>
                  <th className="py-1.5 pr-4">Método</th>
                  <th className="py-1.5 pr-4">Bruto</th>
                  <th className="py-1.5 pr-4">Comisión</th>
                  <th className="py-1.5 pr-4">Neto</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.bookingId} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <Link href={`/admin/reservas/${r.bookingId}`} className="text-gold-soft hover:text-gold">
                        {r.bookingNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-bone-dim">{fullDateLabel(businessDateString(r.paidAt))}</td>
                    <td className="py-2 pr-4 text-bone-dim">{r.clientName}</td>
                    <td className="py-2 pr-4 text-bone-dim">{r.serviceName}</td>
                    <td className="py-2 pr-4 text-bone-dim">{r.paymentMethodLabel}</td>
                    <td className="py-2 pr-4 text-bone">${r.grossUsd.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-bone-dim">{r.feeUsd > 0 ? `$${r.feeUsd.toFixed(2)}` : "—"}</td>
                    <td className="py-2 pr-4 text-bone-dim">${r.netUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <span className="eyebrow mb-4 block">Gastos operativos</span>
        <BusinessExpenseForm
          expenses={expenses.map((e) => ({
            id: e.id,
            description: e.description,
            amountUsd: Number(e.amountUsd),
            category: e.category,
            incurredAt: e.incurredAt.toISOString(),
          }))}
        />
      </GlassCard>
    </div>
  );
}
