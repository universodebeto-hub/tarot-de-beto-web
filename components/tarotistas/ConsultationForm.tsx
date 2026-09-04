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

/** Orden fijo de categorías en el selector -- no depende del orden en que llegan los servicios (ver prisma/seed.ts). */
const CATEGORY_ORDER = ["Lecturas de Tarot", "Rituales Energéticos", "Otros"];
const CATEGORY_NUMERAL = ["I", "II", "III"];

function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

function CategoryIcon({ category }: { category: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4 } as const;
  if (category === "Lecturas de Tarot") {
    return (
      <svg {...common} className="h-4 w-4">
        <rect x="5" y="3" width="9" height="14" rx="1.5" transform="rotate(-8 9.5 10)" />
        <rect x="11" y="6" width="9" height="14" rx="1.5" transform="rotate(8 15.5 13)" />
      </svg>
    );
  }
  if (category === "Rituales Energéticos") {
    return (
      <svg {...common} className="h-4 w-4">
        <path d="M12 3c2 3-1 4-1 6.5a3 3 0 1 0 6 0c0-1-.5-1.8-1-2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 21c-4 0-6-2.4-6-5.5C6 12 9 10 12 8c3 2 6 4 6 7.5 0 3.1-2 5.5-6 5.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common} className="h-4 w-4">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
    </svg>
  );
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
    return Array.from(byCategory.entries()).sort(([a], [b]) => categoryRank(a) - categoryRank(b));
  }, [services]);

  const [serviceId, setServiceId] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(groups[0]?.[0] ?? null);
  const selected = services.find((s) => s.id === serviceId) ?? null;
  const isReport = selected ? isReportOnlyService(selected.slug) : false;

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
        <div>
          <span className="eyebrow">Reserva tu momento</span>
          <h3 className="mt-1.5 mb-0 font-display text-[22px] font-medium text-bone">
            Elige el servicio <em className="italic text-gold-soft">que buscás</em>
          </h3>
        </div>
        {groups.map(([category, items], idx) => {
          const isOpen = openCategory === category;
          const hasSelection = items.some((s) => s.id === serviceId);
          const minPrice = Math.min(...items.map((s) => s.price));
          return (
            <div
              key={category}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isOpen || hasSelection ? "border-gold/40 bg-gold/[0.04]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : category)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-[13px] transition-colors ${
                      hasSelection
                        ? "border-gold/60 bg-gold/15 text-gold-soft"
                        : "border-white/15 text-ash"
                    }`}
                    aria-hidden="true"
                  >
                    {CATEGORY_NUMERAL[idx] ?? idx + 1}
                  </span>
                  <span className={`shrink-0 ${hasSelection ? "text-gold-soft" : "text-ash"}`} aria-hidden="true">
                    <CategoryIcon category={category} />
                  </span>
                  <span>
                    <span className="block font-mono text-[12px] uppercase tracking-[0.1em] text-bone">
                      {category}
                    </span>
                    <span className="block text-xs text-ash">
                      {items.length} {items.length === 1 ? "opción" : "opciones"} · desde ${minPrice.toFixed(2)}
                    </span>
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className={`h-4 w-4 shrink-0 text-gold-soft transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isOpen ? (
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {items.map((s) => {
                    const sIsSelected = serviceId === s.id;
                    const sFields = sIsSelected ? intakeFieldsFor(s.slug) : [];
                    return (
                      <div key={s.id} className="flex flex-col gap-2">
                        <label
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors
                            ${sIsSelected ? "border-gold/50 bg-gold/[0.1]" : "border-white/10 bg-obsidian/40 hover:border-gold/25"}`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="serviceId"
                              value={s.id}
                              checked={sIsSelected}
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

                        {sFields.length > 0 ? (
                          <div className="flex flex-col gap-2 rounded-xl border border-gold/20 bg-obsidian/40 p-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold-soft">
                              Datos para el informe
                            </span>
                            {sFields.map((f) => (
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
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

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

      <button type="submit" disabled={submitting || !serviceId} className="btn btn-gold self-start disabled:opacity-60">
        {submitting ? "Iniciando..." : "Continuar al pago"}
      </button>
      {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
    </form>
  );
}
