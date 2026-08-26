"use client";

import { useRouter } from "next/navigation";
import { CountdownTimer } from "@/components/booking/CountdownTimer";
import { buildWhatsAppLink } from "@/config/site";
import { Button } from "@/components/ui/Button";

interface PendingPaymentPanelProps {
  paymentDeadline: string;
  bookingNumber: string;
  whatsappNumber: string;
  message: string;
}

export function PendingPaymentPanel({
  paymentDeadline,
  bookingNumber,
  whatsappNumber,
  message,
}: PendingPaymentPanelProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <p className="mb-0 text-sm">
        Tiempo restante para completar el pago:{" "}
        <CountdownTimer deadlineIso={paymentDeadline} onExpire={() => router.refresh()} />
      </p>
      <p className="mb-0 text-sm">
        ¿Prefieres pagar de otra forma? Confirma tu pago directamente con Beto por WhatsApp mencionando tu
        número de reserva <strong className="font-medium text-bone">{bookingNumber}</strong> y él la
        marcará como confirmada.
      </p>
      {whatsappNumber ? (
        <Button href={buildWhatsAppLink(whatsappNumber, message)} external className="self-start">
          Confirmar por WhatsApp
        </Button>
      ) : null}
    </div>
  );
}
