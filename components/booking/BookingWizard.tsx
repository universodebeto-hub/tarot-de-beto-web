"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReportRequest } from "@/server/booking-actions";
import { ServicePicker } from "@/components/agenda/ServicePicker";
import { StepIndicator, REPORT_STEPS } from "@/components/booking/StepIndicator";
import { GlassCard } from "@/components/ui/GlassCard";
import { intakeFieldsFor, hasRequiredIntakeData } from "@/lib/service-intake";
import { REPORT_DELIVERY_TEXT } from "@/lib/service-fulfillment";
import type { Service } from "@/types/content";

interface CurrentUserInfo {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
}

interface BookingWizardProps {
  services: Service[];
  currentUser: CurrentUserInfo | null;
  initialServiceId?: string;
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

/**
 * Solicitud de informe (Numerología/Carta Astral) — únicas dos servicios
 * que todavía usan /reservar. Las consultas con tarotista (todo lo demás)
 * pasan por la consulta instantánea desde /tarotistas/[slug] — ver
 * ConsultationForm. No hay paso de fecha/horario acá: el informe se
 * entrega en un plazo de días, no en una llamada agendada.
 */
export function BookingWizard({ services, currentUser, initialServiceId }: BookingWizardProps) {
  const router = useRouter();
  const availableServices = useMemo(() => services.filter((s) => s.available), [services]);

  const startServiceId = availableServices.some((s) => s.id === initialServiceId)
    ? initialServiceId!
    : (availableServices[0]?.id ?? "");

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(startServiceId);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [intakeData, setIntakeData] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmitTransition] = useTransition();

  const selectedService = availableServices.find((s) => s.id === serviceId) ?? null;
  const intakeFields = selectedService ? intakeFieldsFor(selectedService.slug) : [];

  async function handleConfirm() {
    if (!serviceId || !selectedService) return;
    setSubmitError(null);

    startSubmitTransition(async () => {
      const result = await submitReportRequest({
        serviceId,
        guestName: currentUser ? undefined : guestName,
        guestEmail: currentUser ? undefined : guestEmail,
        guestPhone: currentUser ? undefined : guestPhone || undefined,
        intakeData: intakeFields.length > 0 ? intakeData : undefined,
      });

      if (result.error || !result.booking) {
        setSubmitError(result.error ?? "No se pudo enviar la solicitud. Intenta de nuevo.");
        return;
      }

      router.push(`/reservas/${result.booking.id}`);
    });
  }

  function backFromDataStep() {
    setStep(1);
    setSubmitError(null);
  }

  const canGoStep1Next = Boolean(serviceId);
  const hasContactData = currentUser ? true : Boolean(guestName.trim() && guestEmail.trim());
  const hasIntakeData =
    intakeFields.length === 0 || hasRequiredIntakeData(selectedService?.slug ?? "", intakeData);
  const canSubmit = hasContactData && hasIntakeData;

  return (
    <div>
      <StepIndicator current={step} steps={REPORT_STEPS} />

      {step === 1 ? (
        <div className="flex flex-col gap-6">
          <ServicePicker services={availableServices} selectedId={serviceId} onSelect={setServiceId} />
          <button
            type="button"
            disabled={!canGoStep1Next}
            onClick={() => setStep(2)}
            className="btn btn-gold self-start disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}

      {step === 2 && selectedService ? (
        <div className="flex flex-col gap-6">
          <GlassCard className="flex flex-col gap-3">
            <span className="eyebrow">Resumen</span>
            <p className="mb-0 text-bone">
              <strong className="font-medium">{selectedService.name}</strong> — informe personalizado, sin
              horario ni llamada. Se elaborará y enviará dentro de un plazo de{" "}
              <strong className="font-medium">{REPORT_DELIVERY_TEXT}</strong> tras confirmar el pago.
            </p>
            <p className="mb-0 font-mono text-[1.05rem] text-gold-soft">
              {selectedService.price} {selectedService.currency}
            </p>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            {currentUser ? (
              <>
                <span className="eyebrow">Tus datos</span>
                <p className="mb-0 text-sm text-bone">
                  Reservando como <strong className="font-medium">{currentUser.firstName}</strong> (
                  {currentUser.email}
                  {currentUser.phone ? ` · ${currentUser.phone}` : ""}).
                </p>
              </>
            ) : (
              <>
                <span className="eyebrow">Tus datos</span>
                <div>
                  <label htmlFor="guestName" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="guestEmail" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="guestPhone" className={labelClass}>
                    WhatsApp (opcional)
                  </label>
                  <input
                    id="guestPhone"
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </GlassCard>

          {intakeFields.length > 0 ? (
            <GlassCard className="flex flex-col gap-4">
              <span className="eyebrow">Información necesaria para tu servicio</span>
              <p className="mb-0 text-sm text-bone-dim">
                {selectedService.name} requiere estos datos para poder realizarse correctamente.
              </p>
              {intakeFields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`intake-${field.key}`} className={labelClass}>
                    {field.label}
                  </label>
                  <input
                    id={`intake-${field.key}`}
                    type={field.type}
                    value={intakeData[field.key] ?? ""}
                    onChange={(e) => setIntakeData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    required
                    className={inputClass}
                  />
                </div>
              ))}
            </GlassCard>
          ) : null}

          {submitError ? <p className="mb-0 text-sm text-ember">{submitError}</p> : null}

          <div className="flex gap-3">
            <button type="button" onClick={backFromDataStep} className="btn btn-ghost">
              Atrás
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleConfirm}
              className="btn btn-gold disabled:opacity-40"
            >
              {submitting ? "Enviando…" : "Enviar solicitud"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
