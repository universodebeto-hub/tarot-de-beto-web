const AGENDA_STEPS = ["Servicio", "Fecha y horario", "Datos", "Pago", "Confirmación"];
export const REPORT_STEPS = ["Servicio", "Datos", "Pago", "Confirmación"];

export function StepIndicator({ current, steps }: { current: number; steps?: string[] }) {
  const labels = steps ?? AGENDA_STEPS;
  return (
    <ol className="mb-10 flex flex-wrap gap-x-6 gap-y-3">
      {labels.map((label, i) => {
        const step = i + 1;
        const state = step === current ? "current" : step < current ? "done" : "upcoming";
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${
                state === "done"
                  ? "bg-gold text-obsidian"
                  : state === "current"
                    ? "border border-gold text-gold-soft"
                    : "border border-white/15 text-ash"
              }`}
            >
              {state === "done" ? "✓" : step}
            </span>
            <span
              className={`font-mono text-[11px] uppercase tracking-wide ${
                state === "upcoming" ? "text-ash" : "text-bone"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
