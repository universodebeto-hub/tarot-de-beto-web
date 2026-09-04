"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createInstantConsultationAction } from "@/app/tarotistas/[slug]/actions";
import { submitReportRequest } from "@/server/booking-actions";
import { isReportOnlyService } from "@/lib/service-fulfillment";
import { intakeFieldsFor } from "@/lib/service-intake";
import type { Service } from "@/types/content";

interface ConsultationFormProps {
  tarotistaId: string;
  services: Service[];
  isLoggedIn: boolean;
}

/**
 * Fase 6-7: "duración -> pago -> consulta habilitada", sin fecha/hora — el
 * servicio elegido ya trae su propia duración fija del catálogo. Agrupado
 * por categoría (mismo orden que el catálogo, ver prisma/seed.ts) y
 * ordenado de más barato a más caro dentro de cada grupo. Los servicios
 * "solo informe" (Numerología/Carta Astral) viven en el mismo selector,
 * pero al elegirlos se piden sus datos de nacimiento acá mismo y el envío
 * va por submitReportRequest (sin tarotista ni videollamada, ver
 * server/bookings.ts::createReportRequest) en vez de
 * createInstantConsultationAction.
 */
export function ConsultationForm({ tarotistaId, services, isLoggedIn }: ConsultationFormProps) {
  const router = useRouter();

  const groups = useMemo(() => {
    const byCategory = new Map<string, Service[]>();
    for (const s of services) {
      if (!byCategory.has(s.category)) byCategory.set(s.category, []);
      byCategory.get(s.category)!.push(s);
    }
    for (const list of byCategory.values()) {
      list.sort((a, b) => a.price - b.price);
    }
    return Array.from(byCategory.entries());
  }, [services]);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const selected = services.find((s) => s.id === serviceId) ?? null;
  const isReport = selected ? isReportOnlyService(selected.slug) : false;
  const intakeFields = selected ? intakeFieldsFor(selected.slug) : [];

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [intakeData, setIntakeData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setIntakeValue(key: string, value: string) {
    setIntakeData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = isReport
        ? await submitReportRequest({
            serviceId,
            guestName: guestName || undefined,
            guestEmail: guestEmail || undefined,
            guestPhone: guestPhone || undefined,
            intakeData,
          })
        : await createInstantConsultationAction(tarotistaId, serviceId, guestName, guestEmail, guestPhone);
      if (result.error || !result.booking) {
        setError(result.error ?? "No se pudo iniciar la solicitud.");
        return;
      }
      router.push(`/reservas/${result.booking.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (services.length === 0) {
    return <p className="text-sm text-bone-dim">No hay servicios disponibles para consulta inmediata.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <span className="eyebrow">Elige tu servicio</span>
        {groups.map(([category, items]) => (
          <div key={category} className="flex flex-col gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold-soft">{category}</span>
            <div className="flex flex-col gap-2">
              {items.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors
                    ${serviceId === s.id ? "border-gold/40 bg-gold/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-gold/20"}`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="serviceId"
                      value={s.id}
                      checked={serviceId === s.id}
                      onChange={() => setServiceId(s.id)}
                      className="accent-gold"
                    />
                    <span>
                      <span className="block text-bone">{s.name}</span>
                      <span className="block text-xs text-ash">
                        {isReportOnlyService(s.slug) ? "Informe" : `${s.durationMinutes} min`}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono text-gold-soft">
                    ${s.price.toFixed(2)} {s.currency}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {intakeFields.length > 0 ? (
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Datos para el informe</span>
          {intakeFields.map((f) => (
            <input
              key={f.key}
              type={f.type}
              required
              placeholder={f.label}
              value={intakeData[f.key] ?? ""}
              onChange={(e) => setIntakeValue(f.key, e.target.value)}
              className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
            />
          ))}
        </div>
      ) : null}

      {!isLoggedIn ? (
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Tus datos</span>
          <input
            type="text"
            required
            placeholder="Nombre completo"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
          />
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
          />
          <input
            type="tel"
            placeholder="WhatsApp (opcional)"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
          />
        </div>
      ) : null}

      <button type="submit" disabled={submitting} className="btn btn-gold self-start disabled:opacity-60">
        {submitting ? "Iniciando..." : "Continuar al pago"}
      </button>
      {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
    </form>
  );
}
