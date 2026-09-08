import type { Tone } from "@/lib/status-tone";

const VALUE_TONE: Record<Tone, string> = {
  success: "text-emerald",
  warning: "text-gold-soft",
  danger: "text-ember",
  neutral: "text-bone",
};

export interface SummaryStat {
  label: string;
  value: string | number;
  tone?: Tone;
}

/** Franja de chips de resumen arriba de una lista del panel (ej. "24 reservas · 3 pendientes") -- mismo estilo glass que el resto del sitio. */
export function SummaryBar({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((s) => (
        <div key={s.label} className="glass flex items-baseline gap-2 rounded-xl px-4 py-2.5">
          <span className={`text-lg font-semibold ${VALUE_TONE[s.tone ?? "neutral"]}`}>{s.value}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-ash">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
