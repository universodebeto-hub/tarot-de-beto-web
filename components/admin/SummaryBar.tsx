import Link from "next/link";
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
  /** Si viene, el chip es un link -- ej. filtrar la lista de abajo por ese estado. */
  href?: string;
  /** Marca el chip como el filtro actualmente activo (fondo resaltado). */
  active?: boolean;
}

/** Franja de chips de resumen arriba de una lista del panel (ej. "24 reservas · 3 pendientes") -- mismo estilo glass que el resto del sitio. Los que traen `href` funcionan como atajo de filtro. */
export function SummaryBar({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((s) => {
        const content = (
          <>
            <span className={`text-lg font-semibold ${VALUE_TONE[s.tone ?? "neutral"]}`}>{s.value}</span>
            <span className="font-mono text-[10.5px] uppercase tracking-wide text-ash">{s.label}</span>
          </>
        );
        const className = `glass flex items-baseline gap-2 rounded-xl px-4 py-2.5 ${
          s.href ? "transition-colors hover:border-gold/30" : ""
        } ${s.active ? "border-gold/40 bg-gold/[0.06]" : ""}`;

        return s.href ? (
          <Link key={s.label} href={s.href} className={className}>
            {content}
          </Link>
        ) : (
          <div key={s.label} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
