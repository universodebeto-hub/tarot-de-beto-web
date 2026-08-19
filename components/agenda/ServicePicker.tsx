"use client";

import type { Service } from "@/types/content";

interface ServicePickerProps {
  services: Service[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ServicePicker({ services, selectedId, onSelect }: ServicePickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {services.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={`rounded-full border px-4 py-2 font-mono text-[11.5px] uppercase tracking-wide transition-colors ${
            s.id === selectedId
              ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
              : "border-white/15 text-bone-dim hover:border-gold/40 hover:text-gold-soft"
          }`}
        >
          {s.name} · {s.durationMinutes} min
        </button>
      ))}
    </div>
  );
}
