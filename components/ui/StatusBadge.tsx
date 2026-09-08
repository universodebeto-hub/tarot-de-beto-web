import type { Tone } from "@/lib/status-tone";

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-emerald/30 bg-emerald/[0.12] text-emerald",
  warning: "border-gold/30 bg-gold/[0.12] text-gold-soft",
  danger: "border-ember/30 bg-ember/[0.12] text-ember",
  neutral: "border-white/15 bg-white/[0.05] text-ash",
};

/** Insignia de estado con color -- mismo lenguaje visual (glass + dorado) del resto del sitio, solo 4 tonos semánticos ya usados en app/globals.css. */
export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
