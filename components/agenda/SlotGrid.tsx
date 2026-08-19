"use client";

import type { TimeSlot } from "@/server/availability";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

interface SlotGridProps {
  loading: boolean;
  error: boolean;
  slots: TimeSlot[] | null;
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
}

export function SlotGrid({ loading, error, slots, selected, onSelect }: SlotGridProps) {
  if (loading) return <Loading label="Buscando horarios…" />;
  if (error) return <ErrorState />;
  if (!slots || slots.length === 0) {
    return (
      <EmptyState
        title="No hay horarios disponibles ese día"
        description="Prueba con otra fecha, o escríbenos por WhatsApp para buscar una alternativa."
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
      {slots.map((slot) => (
        <button
          key={slot.startUtc}
          type="button"
          onClick={() => onSelect(slot)}
          className={`rounded-lg border px-3 py-2.5 font-mono text-sm transition-colors ${
            selected?.startUtc === slot.startUtc
              ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
              : "border-white/15 text-bone hover:border-gold/40 hover:text-gold-soft"
          }`}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}
