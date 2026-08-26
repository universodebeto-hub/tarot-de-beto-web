import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookingById } from "@/server/bookings";
import { GlassCard } from "@/components/ui/GlassCard";
import { CallRoom } from "@/components/call/CallRoom";

export const metadata: Metadata = { title: "Llamada", robots: { index: false } };

interface CallPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Fase 11 (audio): página compartida por cliente y tarotista para la
 * llamada de una consulta ya pagada — la autorización real (quién puede
 * entrar a ESTA sala) pasa por /api/calls/[bookingId]/token en cada
 * carga, no acá (esta página solo confirma que la reserva es del tipo
 * correcto antes de montar el componente de llamada).
 */
export default async function CallPage({ params }: CallPageProps) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking || !booking.tarotistaId || !booking.tarotista) notFound();

  const isReady = booking.status === "CONFIRMED" && booking.paymentStatus === "PAID";

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[560px] px-7">
        <div className="mb-8 text-center">
          <span className="eyebrow justify-center">Consulta</span>
          <h1 className="mt-3">{booking.service.name}</h1>
          <p className="mb-0 font-mono text-sm text-gold">#{booking.bookingNumber}</p>
        </div>

        <GlassCard>
          {isReady ? (
            <CallRoom bookingId={booking.id} />
          ) : (
            <p className="mb-0 text-center text-sm text-bone-dim">
              Esta consulta todavía no está habilitada para llamar.
            </p>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
