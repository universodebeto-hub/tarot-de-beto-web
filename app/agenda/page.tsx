import type { Metadata } from "next";
import { AgendaExplorer } from "@/components/agenda/AgendaExplorer";
import { getServices } from "@/server/services";
import { nextBusinessDates } from "@/lib/timezone";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/agenda" },
  title: "Agenda",
  description: "Consulta la disponibilidad de Alberto Arango y elige el horario que mejor te quede.",
};

const DAYS_AHEAD = 14;

interface AgendaPageProps {
  searchParams: Promise<{ service?: string }>;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const [services, { service: serviceSlug }] = await Promise.all([getServices(), searchParams]);
  const dates = nextBusinessDates(DAYS_AHEAD);
  const initialServiceId = services.find((s) => s.slug === serviceSlug)?.id;

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow">Agenda</span>
          <h1 className="mt-3">
            Elige tu <em>horario</em>
          </h1>
          <p className="mb-0 text-[1.05rem]">
            Disponibilidad real, calculada en el horario de atención vigente. Selecciona un servicio, una
            fecha y un horario.
          </p>
        </div>

        <AgendaExplorer
          services={services}
          dates={dates}
          whatsappNumber={siteConfig.contact.whatsappNumber}
          initialServiceId={initialServiceId}
        />
      </div>
    </section>
  );
}
