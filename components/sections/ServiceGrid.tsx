"use client";

import { useMemo, useState } from "react";
import { ServiceCard } from "@/components/sections/ServiceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Service } from "@/types/content";

interface ServiceGridProps {
  services: Service[];
  withFilters?: boolean;
}

/**
 * Filtro por categoría oficial del catálogo (ver prisma/seed.ts): el valor
 * de filtro coincide con `Service.category` tal como vive en la base de
 * datos; la etiqueta es el texto corto que se muestra en el botón.
 */
const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "Lecturas de Tarot", label: "Lecturas de Tarot" },
  { value: "Rituales Energéticos", label: "Rituales" },
  { value: "Otros", label: "Otros" },
];

export function ServiceGrid({ services, withFilters = false }: ServiceGridProps) {
  const [category, setCategory] = useState<string>(CATEGORY_FILTERS[0].value);

  const filtered = useMemo(() => {
    if (!withFilters) return services;
    return services.filter((s) => s.category === category);
  }, [services, category, withFilters]);

  return (
    <div>
      {withFilters ? (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-full border px-4 py-2 font-mono text-[11.5px] uppercase tracking-wide transition-colors ${
                category === value
                  ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
                  : "border-white/15 text-bone-dim hover:border-gold/40 hover:text-gold-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay servicios que coincidan"
          description="Prueba con otra categoría o escríbenos directamente para ajustar la consulta a lo que necesitas."
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
