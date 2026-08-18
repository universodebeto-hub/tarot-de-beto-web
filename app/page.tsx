import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";
import { Reveal } from "@/components/ui/Reveal";
import { faqItems } from "@/lib/sample-data";
import { withReserveHref } from "@/lib/service-cta";
import { siteConfig } from "@/config/site";
import { getFeaturedServices } from "@/server/services";
import { getPublishedTestimonials } from "@/server/testimonials";

// Revalida cada 60s: servicios/testimonios se editan desde el panel admin
// (Fase 7) y deben reflejarse sin esperar un redeploy completo.
export const revalidate = 60;

export default async function HomePage() {
  const [featuredServices, testimonials] = await Promise.all([
    getFeaturedServices(3),
    getPublishedTestimonials(),
  ]);
  const services = withReserveHref(featuredServices, siteConfig.contact.whatsappNumber);

  return (
    <>
      <Hero />

      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="divider" />
      </div>

      <section className="py-[88px]">
        <div className="container mx-auto max-w-[1180px] px-7">
          <Reveal as="div" className="section-head mb-12 max-w-[620px]">
            <span className="eyebrow">Servicios destacados</span>
            <h2>
              Elige la consulta <em>que tu momento pide</em>
            </h2>
          </Reveal>
          <ServiceGrid services={services} />
        </div>
      </section>

      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="divider" />
      </div>

      <HowItWorks />

      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="divider" />
      </div>

      <Testimonials testimonials={testimonials} />

      <CTASection
        eyebrow="Reserva tu consulta"
        title={
          <>
            Descubre lo que <em>las cartas tienen para decirte</em>
          </>
        }
        href="/servicios"
        cta="Reservar consulta"
      />

      <FAQSection items={faqItems} compact />
    </>
  );
}
