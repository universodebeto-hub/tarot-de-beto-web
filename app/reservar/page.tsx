import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getServices } from "@/server/services";
import { getCurrentUser } from "@/lib/auth/session";
import { isReportOnlyService } from "@/lib/service-fulfillment";

export const metadata: Metadata = {
  title: "Solicitar informe",
  description: "Solicita tu Informe Numerológico o Carta Astral con Alberto Arango.",
  robots: { index: false },
};

interface ReservarPageProps {
  searchParams: Promise<{ service?: string }>;
}

/** Solo Numerología y Carta Astral pasan por acá — el resto de las consultas se reservan como instantáneas desde /tarotistas/[slug]. */
export default async function ReservarPage({ searchParams }: ReservarPageProps) {
  const [services, params, user] = await Promise.all([getServices(), searchParams, getCurrentUser()]);
  const reportServices = services.filter((s) => isReportOnlyService(s.slug));

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow">Reservar</span>
          <h1 className="mt-3">
            Tu <em>informe</em>
          </h1>
        </div>

        <BookingWizard services={reportServices} currentUser={user} initialServiceId={params.service} />
      </div>
    </section>
  );
}
