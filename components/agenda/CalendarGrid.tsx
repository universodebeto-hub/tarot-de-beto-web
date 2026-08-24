"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchDayAgenda } from "@/server/agenda-actions";
import type { DayAgenda, DayBlock, TimeSlot } from "@/server/availability";
import { dayColumnLabel } from "@/lib/date-labels";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";

/** "HH:MM" a partir de minutos desde medianoche — sin importar lib/timezone.ts
 * (que arrastra config/site.ts y no debe leerse desde un componente cliente,
 * ver la nota en lib/date-labels.ts sobre el bug de hidratación). */
function formatMinutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

interface CalendarGridBookingProps {
  mode: "booking";
  /** Duración del servicio elegido — determina cuántos bloques de 15 min ocupa. */
  durationMinutes: number;
  selectedStartUtc?: string | null;
  onSelectStart: (slot: TimeSlot) => void;
  onToggleBlock?: never;
  onViewBooking?: never;
}

interface CalendarGridAdminProps {
  mode: "admin";
  durationMinutes?: never;
  selectedStartUtc?: never;
  onSelectStart?: never;
  onToggleBlock: (date: string, startMinute: number) => Promise<void> | void;
  onViewBooking: (bookingId: string) => void;
}

type CalendarGridProps = (CalendarGridBookingProps | CalendarGridAdminProps) & {
  dates: string[];
};

const STATUS_LABEL: Record<DayBlock["status"], string> = {
  available: "Disponible",
  booked: "Reservado",
  blocked: "Bloqueado",
  buffer: "Descanso entre consultas",
  past: "Ya pasó",
  "outside-hours": "Fuera de horario",
};

export function CalendarGrid(props: CalendarGridProps) {
  const { dates, mode } = props;
  const [agendaByDate, setAgendaByDate] = useState<Record<string, DayAgenda | null>>({});
  const [error, setError] = useState(false);
  const [loading, startTransition] = useTransition();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  function refetchDate(date: string) {
    startTransition(async () => {
      try {
        const agenda = await fetchDayAgenda(date);
        setAgendaByDate((prev) => ({ ...prev, [date]: agenda }));
      } catch {
        setError(true);
      }
    });
  }

  useEffect(() => {
    let cancelled = false;

    startTransition(async () => {
      let results: DayAgenda[] | null = null;
      let failed = false;
      try {
        results = await Promise.all(dates.map((d) => fetchDayAgenda(d)));
      } catch {
        failed = true;
      }
      // Los setState de acá abajo ocurren después del await, nunca de forma
      // síncrona dentro del efecto (regla react-hooks/set-state-in-effect).
      if (cancelled) return;
      setError(failed);
      if (results) {
        const next: Record<string, DayAgenda> = {};
        results.forEach((agenda, i) => {
          next[dates[i]] = agenda;
        });
        setAgendaByDate(next);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates.join(",")]);

  if (error) return <ErrorState />;
  if (loading && Object.keys(agendaByDate).length === 0) return <Loading label="Cargando agenda…" />;

  const durationBlocks = mode === "booking" ? Math.max(1, Math.ceil(props.durationMinutes / 15)) : 1;

  async function handleCellClick(agenda: DayAgenda, block: DayBlock, index: number) {
    if (mode === "admin") {
      if (block.status === "booked") {
        if (block.bookingId) props.onViewBooking(block.bookingId);
        return;
      }
      if (block.status !== "available" && block.status !== "blocked") return;
      const cellKey = `${agenda.date}-${block.startMinute}`;
      setPendingCell(cellKey);
      try {
        await props.onToggleBlock(agenda.date, block.startMinute);
        refetchDate(agenda.date);
      } finally {
        setPendingCell(null);
      }
      return;
    }

    // Modo reserva: el bloque elegido debe tener suficientes bloques
    // consecutivos disponibles para la duración del servicio.
    if (agenda.dailyCapReached) return;
    const span = agenda.blocks.slice(index, index + durationBlocks);
    if (span.length < durationBlocks || span.some((b) => b.status !== "available")) return;

    const endBlock = span[span.length - 1];
    props.onSelectStart({
      startUtc: block.startUtc,
      endUtc: endBlock.endUtc,
      label: formatMinutesLabel(block.startMinute),
    });
  }

  function isHighlighted(agenda: DayAgenda, index: number): boolean {
    if (mode !== "booking" || !props.selectedStartUtc) return false;
    const selectedIndex = agenda.blocks.findIndex((b) => b.startUtc === props.selectedStartUtc);
    if (selectedIndex === -1) return false;
    return index >= selectedIndex && index < selectedIndex + durationBlocks;
  }

  function isBookableStart(agenda: DayAgenda, index: number): boolean {
    if (mode !== "booking" || agenda.dailyCapReached) return false;
    const span = agenda.blocks.slice(index, index + durationBlocks);
    return span.length === durationBlocks && span.every((b) => b.status === "available");
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
      {dates.map((date) => {
        const agenda = agendaByDate[date];
        const visibleBlocks = agenda?.blocks.filter((b) => b.status !== "outside-hours") ?? [];

        return (
          <div
            key={date}
            className="glass flex min-w-[46vw] shrink-0 snap-start flex-col overflow-hidden sm:min-w-[150px]"
          >
            <div className="border-b border-white/10 px-3 py-2.5 text-center">
              <span className="font-mono text-[11px] uppercase tracking-wide text-gold-soft">
                {dayColumnLabel(date)}
              </span>
            </div>

            <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto p-2.5">
              {!agenda ? (
                <span className="py-6 text-center font-mono text-[11px] text-ash">Cargando…</span>
              ) : visibleBlocks.length === 0 ? (
                <span className="py-6 text-center text-xs text-ash">Sin horario este día</span>
              ) : agenda.dailyCapReached && mode === "booking" ? (
                <span className="py-6 text-center text-xs text-ash">Día completo</span>
              ) : (
                visibleBlocks.map((block) => {
                  const index = agenda.blocks.indexOf(block);
                  const highlighted = isHighlighted(agenda, index);
                  const bookable = isBookableStart(agenda, index);
                  const cellKey = `${date}-${block.startMinute}`;
                  const clickable =
                    mode === "booking"
                      ? bookable
                      : block.status === "available" || block.status === "blocked" || block.status === "booked";

                  return (
                    <button
                      key={block.startMinute}
                      type="button"
                      title={STATUS_LABEL[block.status]}
                      disabled={!clickable || pendingCell === cellKey}
                      onClick={() => handleCellClick(agenda, block, index)}
                      className={cellClassName(block.status, highlighted, clickable)}
                    >
                      {formatMinutesLabel(block.startMinute)}
                      {mode === "admin" && block.status === "booked" ? " · reservado" : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function cellClassName(status: DayBlock["status"], highlighted: boolean, clickable: boolean): string {
  const base = "rounded-md border px-2 py-1.5 font-mono text-[12.5px] transition-colors text-left";

  if (highlighted) {
    return `${base} border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian`;
  }

  switch (status) {
    case "available":
      return clickable
        ? `${base} border-white/15 text-bone hover:border-gold/40 hover:text-gold-soft cursor-pointer`
        : `${base} border-white/10 text-ash-dim cursor-not-allowed`;
    case "booked":
      return `${base} border-ember/40 bg-ember/10 text-ember ${clickable ? "cursor-pointer hover:border-ember" : "cursor-default"}`;
    case "blocked":
      return `${base} border-white/10 bg-white/5 text-ash ${clickable ? "cursor-pointer hover:border-gold/30" : "cursor-default"}`;
    case "buffer":
      return `${base} border-dashed border-white/10 text-ash-dim cursor-not-allowed`;
    case "past":
    default:
      return `${base} border-white/5 text-ash-dim/60 cursor-not-allowed opacity-50`;
  }
}
