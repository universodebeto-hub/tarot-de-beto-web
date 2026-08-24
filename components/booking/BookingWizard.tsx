"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBooking } from "@/server/booking-actions";
import type { TimeSlot } from "@/server/availability";
import { fullDateLabel, formatBusinessTime } from "@/lib/date-labels";
import { ServicePicker } from "@/components/agenda/ServicePicker";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { GlassCard } from "@/components/ui/GlassCard";
import { intakeFieldsFor, hasRequiredIntakeData } from "@/lib/service-intake";
import type { Service } from "@/types/content";

interface CurrentUserInfo {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
}

interface BookingWizardProps {
  services: Service[];
  dates: string[];
  currentUser: CurrentUserInfo | null;
  initialServiceId?: string;
  initialDate?: string;
  initialSlotUtc?: string;
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

export function BookingWizard({
  services,
  dates,
  currentUser,
  initialServiceId,
  initialDate,
  initialSlotUtc,
}: BookingWizardProps) {
  const router = useRouter();
  const availableServices = useMemo(() => services.filter((s) => s.available), [services]);

  const startServiceId = availableServices.some((s) => s.id === initialServiceId)
    ? initialServiceId!
    : (availableServices[0]?.id ?? "");
  // El wizard fusiona "Fecha" y "Hora" en un solo paso 2 ("Fecha y horario") —
  // el enlace de la agenda que trae fecha+horario ya elegidos salta directo
  // al paso 3 ("Datos").
  const canSkipToDataStep = Boolean(initialServiceId && initialDate && initialSlotUtc);

  const [step, setStep] = useState(canSkipToDataStep ? 3 : 1);
  const [serviceId, setServiceId] = useState(startServiceId);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(
    canSkipToDataStep && initialSlotUtc
      ? { startUtc: initialSlotUtc, endUtc: initialSlotUtc, label: formatBusinessTime(initialSlotUtc) }
      : null,
  );

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [intakeData, setIntakeData] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmitTransition] = useTransition();

  const selectedService = availableServices.find((s) => s.id === serviceId) ?? null;
  const intakeFields = selectedService ? intakeFieldsFor(selectedService.slug) : [];
  const date = selectedSlot ? selectedSlot.startUtc.slice(0, 10) : (initialDate ?? dates[0] ?? "");

  async function handleConfirm() {
    if (!selectedSlot || !serviceId) return;
    setSubmitError(null);

    startSubmitTransition(async () => {
      const result = await submitBooking({
        serviceId,
        startUtc: selectedSlot.startUtc,
        guestName: currentUser ? undefined : guestName,
        guestEmail: currentUser ? undefined : guestEmail,
        guestPhone: currentUser ? undefined : guestPhone || undefined,
        intakeData: intakeFields.length > 0 ? intakeData : undefined,
      });

      if (result.error || !result.booking) {
        setSubmitError(result.error ?? "No se pudo crear la reserva. Intenta de nuevo.");
        return;
      }

      router.push(`/reservas/${result.booking.id}`);
    });
  }

  function backToCalendarStep() {
    setStep(2);
    setSelectedSlot(null);
    setSubmitError(null);
  }

  const canGoStep1Next = Boolean(serviceId);
  const canGoStep2Next = Boolean(selectedSlot);
  const hasContactData = currentUser ? true : Boolean(guestName.trim() && guestEmail.trim());
  const hasIntakeData =
    intakeFields.length === 0 || hasRequiredIntakeData(selectedService?.slug ?? "", intakeData);
  const canSubmit = hasContactData && hasIntakeData;

  return (
    <div>
      <StepIndicator current={step} />

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
          <span className="font-mono text-[11px] uppercase tracking-wide text-ash">
            {selectedService.name} · {selectedService.durationMinutes} min
          </span>
          <CalendarGrid
            mode="booking"
            dates={dates}
            durationMinutes={selectedService.durationMinutes}
            selectedStartUtc={selectedSlot?.startUtc ?? null}
            onSelectStart={setSelectedSlot}
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
              Atrás
            </button>
            <button
              type="button"
              disabled={!canGoStep2Next}
              onClick={() => setStep(3)}
              className="btn btn-gold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && selectedSlot && selectedService ? (
        <div className="flex flex-col gap-6">
          <GlassCard className="flex flex-col gap-3">
            <span className="eyebrow">Resumen</span>
            <p className="mb-0 text-bone">
              <strong className="font-medium">{selectedService.name}</strong> ({selectedService.durationMinutes}{" "}
              min) — {fullDateLabel(date)}
              {selectedSlot.label ? ` a las ${selectedSlot.label}` : ""} (hora Colombia).
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

          {submitError ? (
            <div className="flex flex-col gap-2">
              <p className="mb-0 text-sm text-ember">{submitError}</p>
              <button type="button" onClick={backToCalendarStep} className="btn btn-ghost self-start">
                Elegir otro horario
              </button>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">
              Atrás
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleConfirm}
              className="btn btn-gold disabled:opacity-40"
            >
              {submitting ? "Reservando…" : "Confirmar reserva"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
