"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { fetchAvailableSlots } from "@/server/agenda-actions";
import type { TimeSlot } from "@/server/availability";
import { buildWhatsAppLink } from "@/config/site";
import { fullDateLabel } from "@/lib/date-labels";
import { ServicePicker } from "@/components/agenda/ServicePicker";
import { DateStrip } from "@/components/agenda/DateStrip";
import { SlotGrid } from "@/components/agenda/SlotGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Service } from "@/types/content";

interface AgendaExplorerProps {
  services: Service[];
  dates: string[];
  whatsappNumber: string;
  initialServiceId?: string;
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

  const reservarHref =
    selectedSlot && serviceId
      ? `/reservar?service=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}&slot=${encodeURIComponent(selectedSlot.startUtc)}`
      : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">Servicio</span>
        <ServicePicker services={availableServices} selectedId={serviceId} onSelect={setServiceId} />
      </div>

      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">Fecha</span>
        <DateStrip dates={dates} selected={date} onSelect={setDate} />
      </div>

      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">
          Horarios disponibles — {fullDateLabel(date)}
        </span>
        <SlotGrid loading={loading} error={error} slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
      </div>

      {selectedSlot && selectedService ? (
        <GlassCard className="flex flex-col gap-3">
          <span className="eyebrow">Horario elegido</span>
          <p className="mb-0 text-bone">
            <strong className="font-medium">{selectedService.name}</strong> el {fullDateLabel(date)} a las{" "}
            {selectedSlot.label} (hora Colombia).
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            {reservarHref ? <Button href={reservarHref}>Continuar con la reserva</Button> : null}
            {whatsappNumber ? (
              <Button
                href={buildWhatsAppLink(
                  whatsappNumber,
                  `Hola Beto, tengo dudas sobre agendar ${selectedService.name} el ${fullDateLabel(date)} a las ${selectedSlot.label} (hora Colombia).`,
                )}
                external
                variant="ghost"
              >
                Preguntar por WhatsApp
              </Button>
            ) : null}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
