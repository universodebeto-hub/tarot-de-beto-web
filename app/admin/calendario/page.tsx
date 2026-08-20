import type { Metadata } from "next";
import { listAvailabilityAdmin, listBlockedTimesAdmin } from "@/server/admin/schedule";
import { toggleAvailabilityAction, deleteAvailabilityAction, deleteBlockAction } from "@/app/admin/calendario/actions";
import { formatMinutes } from "@/lib/timezone";
import { AvailabilityForm } from "@/components/admin/AvailabilityForm";
import { BlockedTimeForm } from "@/components/admin/BlockedTimeForm";
import { GlassCard } from "@/components/ui/GlassCard";

export const metadata: Metadata = { title: "Panel — Calendario", robots: { index: false } };

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function AdminCalendarPage() {
  const [ranges, blocks] = await Promise.all([listAvailabilityAdmin(), listBlockedTimesAdmin()]);

  return (
    <div className="flex flex-col gap-8">
      <GlassCard className="flex flex-col gap-4">
        <span className="eyebrow">Horario semanal</span>
        <AvailabilityForm />
        <div className="flex flex-col gap-2">
          {ranges.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm">
              <span className={r.active ? "text-bone" : "text-ash line-through"}>
                {DAYS[r.dayOfWeek]} · {formatMinutes(r.startMinute)}–{formatMinutes(r.endMinute)}
              </span>
              <div className="flex gap-2">
                <form action={toggleAvailabilityAction.bind(null, r.id)}>
                  <button type="submit" className="btn btn-ghost px-3 py-1.5 text-[11px]">
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <form action={deleteAvailabilityAction.bind(null, r.id)}>
                  <button type="submit" className="btn btn-ghost px-3 py-1.5 text-[11px]">
                    Eliminar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <span className="eyebrow">Bloqueos (vacaciones, descansos, eventos)</span>
        <BlockedTimeForm />
        <div className="flex flex-col gap-2">
          {blocks.length === 0 ? (
            <p className="mb-0 text-sm text-ash">Sin bloqueos.</p>
          ) : (
            blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm">
                <span className="text-bone">
                  {b.startsAt.toISOString().slice(0, 16).replace("T", " ")} →{" "}
                  {b.endsAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  {b.reason ? ` — ${b.reason}` : ""}
                </span>
                <form action={deleteBlockAction.bind(null, b.id)}>
                  <button type="submit" className="btn btn-ghost px-3 py-1.5 text-[11px]">
                    Eliminar
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}
