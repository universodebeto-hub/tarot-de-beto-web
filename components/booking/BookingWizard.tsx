"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchAvailableSlots } from "@/server/agenda-actions";
import { submitBooking } from "@/server/booking-actions";
import type { TimeSlot } from "@/server/availability";
import { fullDateLabel, formatBusinessTime } from "@/lib/date-labels";
import { ServicePicker } from "@/components/agenda/ServicePicker";
import { DateStrip } from "@/components/agenda/DateStrip";
import { SlotGrid } from "@/components/agenda/SlotGrid";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { GlassCard } from "@/components/ui/GlassCard";
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
  const startDate = initialDate && dates.includes(initialDate) ? initialDate : (dates[0] ?? "");
  const canSkipToStep4 = Boolean(initialServiceId && initialDate && initialSlotUtc);

  const [step, setStep] = useState(canSkipToStep4 ? 4 : 1);
  const [serviceId, setServiceId] = useState(startServiceId);
  const [date, setDate] = useState(startDate);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(
    canSkipToStep4 && initialSlotUtc
      ? { startUtc: initialSlotUtc, endUtc: initialSlotUtc, label: formatBusinessTime(initialSlotUtc) }
      : null,
  );
  const [refetchToken, setRefetchToken] = useState(0);
  const [slotsLoading, startSlotsTransition] = useTransition();

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmitTransition] = useTransition();

  const selectedService = availableServices.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!serviceId || !date || step !== 3) return;
    let cancelled = false;

    startSlotsTransition(async () => {
      let result: TimeSlot[] | null = null;
      let failed = false;
      try {
        result = await fetchAvailableSlots(serviceId, date);
      } catch {
        failed = true;
      }
      if (cancelled) return;
      setSlots(result);
      setSlotsError(failed);
      if (
        !canSkipToStep4 ||
        !result?.some((s) => s.startUtc === selectedSlot?.startUtc)
      ) {
        setSelectedSlot(null);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, date, step, refetchToken]);

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
      });

      if (result.error || !result.booking) {
        setSubmitError(result.error ?? "No se pudo crear la reserva. Intenta de nuevo.");
        return;
      }

      router.push(`/reservas/${result.booking.id}`);
    });
  }

  function backToSlotPicker() {
    setStep(3);
    setSelectedSlot(null);
    setSubmitError(null);
    setRefetchToken((n) => n + 1);
  }

  const canGoStep1Next = Boolean(serviceId);
  const canGoStep2Next = Boolean(date);
  const canGoStep3Next = Boolean(selectedSlot);
  const canSubmit = currentUser ? true : guestName.trim() && guestEmail.trim();

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

      {step === 2 ? (
        <div className="flex flex-col gap-6">
          <DateStrip dates={dates} selected={date} onSelect={setDate} />
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

      {step === 3 ? (
        <div className="flex flex-col gap-6">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ash">
            {selectedService?.name} — {fullDateLabel(date)}
          </span>
          <SlotGrid
            loading={slotsLoading}
            error={slotsError}
            slots={slots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">
              Atrás
            </button>
            <button
              type="button"
              disabled={!canGoStep3Next}
              onClick={() => setStep(4)}
              className="btn btn-gold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && selectedSlot && selectedService ? (
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

          {submitError ? (
            <div className="flex flex-col gap-2">
              <p className="mb-0 text-sm text-ember">{submitError}</p>
              <button type="button" onClick={backToSlotPicker} className="btn btn-ghost self-start">
                Elegir otro horario
              </button>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="btn btn-ghost">
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
