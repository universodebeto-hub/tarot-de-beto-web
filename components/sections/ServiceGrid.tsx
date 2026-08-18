"use client";

import { useMemo, useState } from "react";
import { ServiceCard } from "@/components/sections/ServiceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ServiceWithCta } from "@/lib/service-cta";

interface ServiceGridProps {
  services: ServiceWithCta[];
  withFilters?: boolean;
}

type DurationFilter = "all" | "short" | "medium" | "long";

export function ServiceGrid({ services, withFilters = false }: ServiceGridProps) {
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (onlyAvailable && !s.available) return false;
      if (duration === "short" && s.durationMinutes > 15) return false;
      if (duration === "medium" && (s.durationMinutes <= 15 || s.durationMinutes > 30)) return false;
      if (duration === "long" && s.durationMinutes <= 30) return false;
      return true;
    });
  }, [services, duration, onlyAvailable]);

  return (
    <div>
      {withFilters ? (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {(
            [
              ["all", "Todas"],
              ["short", "≤ 15 min"],
              ["medium", "16–30 min"],
              ["long", "> 30 min"],
            ] as [DurationFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDuration(value)}
              className={`rounded-full border px-4 py-2 font-mono text-[11.5px] uppercase tracking-wide transition-colors ${
                duration === value
                  ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
                  : "border-white/15 text-bone-dim hover:border-gold/40 hover:text-gold-soft"
              }`}
            >
              {label}
            </button>
          ))}

          <label className="ml-1 flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-wide text-bone-dim">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            Solo disponibles
          </label>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay servicios que coincidan"
          description="Prueba con otro filtro o escríbenos directamente para ajustar la consulta a lo que necesitas."
        />
      ) : (
        <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
