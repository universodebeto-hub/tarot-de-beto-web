"use client";

import { dayLabel } from "@/lib/date-labels";

interface DateStripProps {
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
}

export function DateStrip({ dates, selected, onSelect }: DateStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {dates.map((d) => {
        const { weekday, day } = dayLabel(d);
        const active = d === selected;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={`flex min-w-[56px] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 transition-colors ${
              active
                ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
                : "border-white/15 text-bone-dim hover:border-gold/40 hover:text-gold-soft"
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-wide">{weekday}</span>
            <span className="text-base font-medium">{day}</span>
          </button>
        );
      })}
    </div>
  );
}
