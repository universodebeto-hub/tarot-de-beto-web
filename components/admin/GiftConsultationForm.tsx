"use client";

import { useMemo, useState, useTransition } from "react";
import { grantComplimentaryConsultationAction } from "@/app/admin/clientes/[id]/actions";
import { isReportOnlyService } from "@/lib/service-fulfillment";

interface ServiceOption {
  id: string;
  name: string;
  slug: string;
}

interface TarotistaOption {
  id: string;
  name: string;
}

/** Regalar una consulta a este cliente (ej. para reactivarlo) -- se crea ya pagada, sin pasar por ningún cobro real. */
export function GiftConsultationForm({
  clientId,
  services,
  tarotistas,
}: {
  clientId: string;
  services: ServiceOption[];
  tarotistas: TarotistaOption[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [tarotistaId, setTarotistaId] = useState(tarotistas[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedService = services.find((s) => s.id === serviceId);
  const needsTarotista = useMemo(
    () => (selectedService ? !isReportOnlyService(selectedService.slug) : false),
    [selectedService],
  );

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result = await grantComplimentaryConsultationAction(
        clientId,
        serviceId,
        needsTarotista ? tarotistaId : null,
      );
      setMessage(result.error ?? "Listo -- la consulta ya está regalada y confirmada.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="mb-0 text-sm text-bone-dim">
        Crea una consulta ya pagada para este cliente, sin cobrarle nada -- útil para reactivar a alguien inactivo.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Servicio
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {needsTarotista ? (
        <label className="flex flex-col gap-1 text-sm">
          Tarotista que la atiende
          <select
            value={tarotistaId}
            onChange={(e) => setTarotistaId(e.target.value)}
            className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
          >
            {tarotistas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !serviceId || (needsTarotista && !tarotistaId)}
        className="btn btn-gold self-start disabled:opacity-60"
      >
        {pending ? "Regalando…" : "Regalar consulta"}
      </button>
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}
