import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getServices } from "@/server/services";
import { nextBusinessDates } from "@/lib/timezone";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Reservar consulta",
  description: "Elige tu servicio, fecha y horario para reservar tu consulta con Alberto Arango.",
  robots: { index: false },
};

const DAYS_AHEAD = 14;

interface ReservarPageProps {
  searchParams: Promise<{ service?: string; date?: string; slot?: string }>;
}

export default async function ReservarPage({ searchParams }: ReservarPageProps) {
  const [services, params, user] = await Promise.all([getServices(), searchParams, getCurrentUser()]);
  const dates = nextBusinessDates(DAYS_AHEAD);

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow">Reservar</span>
          <h1 className="mt-3">
            Tu <em>consulta</em>
          </h1>
        </div>

        <BookingWizard
          services={services}
          dates={dates}
          currentUser={user}
          initialServiceId={params.service}
          initialDate={params.date}
          initialSlotUtc={params.slot}
        />
      </div>
    </section>
  );
}
