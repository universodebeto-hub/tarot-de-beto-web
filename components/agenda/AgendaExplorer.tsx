"use client";

import { useMemo, useState } from "react";
import type { TimeSlot } from "@/server/availability";
import { buildWhatsAppLink } from "@/config/site";
import { fullDateLabel } from "@/lib/date-labels";
import { ServicePicker } from "@/components/agenda/ServicePicker";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { isReportOnlyService } from "@/lib/service-fulfillment";
import type { Service } from "@/types/content";

interface AgendaExplorerProps {
  services: Service[];
  dates: string[];
  whatsappNumber: string;
  initialServiceId?: string;
}

export function AgendaExplorer({ services, dates, whatsappNumber, initialServiceId }: AgendaExplorerProps) {
  // Informe Numerológico y Carta Astral no usan agenda — se solicitan desde
  // /reservar directamente (ver ServiceCard), nunca eligiendo un horario acá.
  const availableServices = useMemo(
    () => services.filter((s) => s.available && !isReportOnlyService(s.slug)),
    [services],
  );
  const defaultServiceId = availableServices.some((s) => s.id === initialServiceId)
    ? initialServiceId
    : availableServices[0]?.id;
  const [serviceId, setServiceId] = useState(defaultServiceId ?? "");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedService = availableServices.find((s) => s.id === serviceId) ?? null;

  function handleSelectStart(slot: TimeSlot) {
    setSelectedSlot(slot);
    setSelectedDate(slot.startUtc.slice(0, 10));
  }

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
      ? `/reservar?service=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(selectedDate ?? "")}&slot=${encodeURIComponent(selectedSlot.startUtc)}`
      : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">Servicio</span>
        <ServicePicker
          services={availableServices}
          selectedId={serviceId}
          onSelect={(id) => {
            setServiceId(id);
            setSelectedSlot(null);
          }}
        />
      </div>

      {selectedService ? (
        <div>
          <span className="mb-3 block font-mono text-[11px] uppercase tracking-wide text-ash">
            Elige fecha y horario — {selectedService.durationMinutes} min
          </span>
          <CalendarGrid
            mode="booking"
            dates={dates}
            durationMinutes={selectedService.durationMinutes}
            selectedStartUtc={selectedSlot?.startUtc ?? null}
            onSelectStart={handleSelectStart}
          />
        </div>
      ) : null}

      {selectedSlot && selectedService && selectedDate ? (
        <GlassCard className="flex flex-col gap-3">
          <span className="eyebrow">Horario elegido</span>
          <p className="mb-0 text-bone">
            <strong className="font-medium">{selectedService.name}</strong> el {fullDateLabel(selectedDate)} a las{" "}
            {selectedSlot.label} (hora Colombia).
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            {reservarHref ? <Button href={reservarHref}>Continuar con la reserva</Button> : null}
            {whatsappNumber ? (
              <Button
                href={buildWhatsAppLink(
                  whatsappNumber,
                  `Hola Beto, tengo dudas sobre agendar ${selectedService.name} el ${fullDateLabel(selectedDate)} a las ${selectedSlot.label} (hora Colombia).`,
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
