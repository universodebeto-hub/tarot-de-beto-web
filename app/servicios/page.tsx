import type { Metadata } from "next";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { CTASection } from "@/components/sections/CTASection";
import { withReserveHref } from "@/lib/service-cta";
import { siteConfig } from "@/config/site";
import { getServices } from "@/server/services";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Tipos de consulta de tarot disponibles con Alberto Arango: duración, modalidad y precio.",
};

// Revalida cada 60s: el catálogo se edita desde el panel admin (Fase 7).
export const revalidate = 60;

export default async function ServiciosPage() {
  const allServices = await getServices();
  const services = withReserveHref(allServices, siteConfig.contact.whatsappNumber);

  return (
    <>
      <section className="pb-6 pt-14">
        <div className="container mx-auto max-w-[1180px] px-7">
          <span className="eyebrow">Servicios</span>
          <h1 className="mt-3 max-w-2xl">
            Elige la consulta
            <br />
            <em>que tu momento pide.</em>
          </h1>
          <p className="max-w-[52ch] text-[1.05rem]">
            Cada consulta se ajusta a lo que traes. Si tu pregunta no encaja en ninguna, escríbele a Beto y
            la ajustan juntos por WhatsApp.
          </p>
        </div>
      </section>

      <section className="pb-[88px] pt-0">
        <div className="container mx-auto max-w-[1180px] px-7">
          <ServiceGrid services={services} withFilters />
        </div>
      </section>

      <CTASection
        eyebrow="¿No sabes cuál elegir?"
        title={
          <>
            Escríbele a Beto y lo <em>definen juntos</em>
          </>
        }
        href="/contacto"
        cta="Ir a contacto"
      />
    </>
  );
}
