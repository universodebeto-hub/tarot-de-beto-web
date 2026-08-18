"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { fetchAvailableSlots } from "@/server/agenda-actions";
import type { TimeSlot } from "@/server/availability";
import { buildWhatsAppLink } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import type { Service } from "@/types/content";

interface AgendaExplorerProps {
  services: Service[];
  dates: string[];
  whatsappNumber: string;
  initialServiceId?: string;
}

function dayLabel(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(d).replace(".", "");
  const day = new Intl.DateTimeFormat("es-CO", { day: "numeric" }).format(d);
  return { weekday, day };
}

function fullDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function AgendaExplorer({ services, dates, whatsappNumber, initialServiceId }: AgendaExplorerProps) {
  const availableServices = useMemo(() => services.filter((s) => s.available), [services]);
  const defaultServiceId = availableServices.some((s) => s.id === initialServiceId)
    ? initialServiceId
    : availableServices[0]?.id;
  const [serviceId, setServiceId] = useState(defaultServiceId ?? "");
  const [date, setDate] = useState(dates[0] ?? "");
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, startTransition] = useTransition();

  const selectedService = availableServices.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;

    startTransition(async () => {
      let result: TimeSlot[] | null = null;
      let failed = false;
      try {
        result = await fetchAvailableSlots(serviceId, date);
      } catch {
        failed = true;
      }
      // Los setState de acá abajo ocurren después del await, nunca de forma
      // síncrona dentro del efecto (regla react-hooks/set-state-in-effect).
      if (cancelled) return;
      setSlots(result);
      setError(failed);
      setSelectedSlot(null);
    });

    return () => {
      cancelled = true;
    };
  }, [serviceId, date]);

  if (availableServices.length === 0) {
    return (
      <EmptyState
        title="No hay servicios disponibles por ahora"
        description="Escríbenos por WhatsApp y coordinamos tu consulta directamente."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">Servicio</span>
        <div className="flex flex-wrap gap-3">
          {availableServices.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              className={`rounded-full border px-4 py-2 font-mono text-[11.5px] uppercase tracking-wide transition-colors ${
                s.id === serviceId
                  ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
                  : "border-white/15 text-bone-dim hover:border-gold/40 hover:text-gold-soft"
              }`}
            >
              {s.name} · {s.durationMinutes} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">Fecha</span>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => {
            const { weekday, day } = dayLabel(d);
            const active = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
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
      </div>

      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">
          Horarios disponibles — {fullDateLabel(date)}
        </span>

        {loading ? <Loading label="Buscando horarios…" /> : null}
        {!loading && error ? <ErrorState /> : null}
        {!loading && !error && slots && slots.length === 0 ? (
          <EmptyState
            title="No hay horarios disponibles ese día"
            description="Prueba con otra fecha, o escríbenos por WhatsApp para buscar una alternativa."
          />
        ) : null}
        {!loading && !error && slots && slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {slots.map((slot) => (
              <button
                key={slot.startUtc}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-lg border px-3 py-2.5 font-mono text-sm transition-colors ${
                  selectedSlot?.startUtc === slot.startUtc
                    ? "border-transparent bg-gradient-to-br from-gold-soft to-gold text-obsidian"
                    : "border-white/15 text-bone hover:border-gold/40 hover:text-gold-soft"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedSlot && selectedService ? (
        <GlassCard className="flex flex-col gap-3">
          <span className="eyebrow">Vas a agendar</span>
          <p className="mb-0 text-bone">
            <strong className="font-medium">{selectedService.name}</strong> el {fullDateLabel(date)} a las{" "}
            {selectedSlot.label} (hora Colombia).
          </p>
          <p className="mb-0 text-sm">
            El pago en línea y la confirmación automática llegan en las próximas fases. Por ahora,
            confírmalo directamente con Beto por WhatsApp.
          </p>
          {whatsappNumber ? (
            <Button
              href={buildWhatsAppLink(
                whatsappNumber,
                `Hola Beto, quiero agendar ${selectedService.name} el ${fullDateLabel(date)} a las ${selectedSlot.label} (hora Colombia).`,
              )}
              external
              className="self-start"
            >
              Confirmar por WhatsApp
            </Button>
          ) : null}
        </GlassCard>
      ) : null}
    </div>
  );
}
