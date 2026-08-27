import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { RitualBanner } from "@/components/sections/RitualBanner";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";
import { Reveal } from "@/components/ui/Reveal";
import { getFeaturedServices, getServices } from "@/server/services";
import { getPublishedTestimonials } from "@/server/testimonials";
import { getFaqItems } from "@/server/settings";
import { RITUAL_BANNER_SLIDES, RITUAL_BANNER_TAGLINE } from "@/lib/ritual-gallery";

// Nota: esta ruta ya es dinámica (el layout raíz lee la cookie de sesión
// para el Navbar), así que no necesita `revalidate` — cada request consulta
// servicios/testimonios en vivo.

export default async function HomePage() {
  const [services, allServices, testimonials, faqItems] = await Promise.all([
    getFeaturedServices(3),
    getServices(),
    getPublishedTestimonials(),
    getFaqItems(),
  ]);

  const bannerItems = RITUAL_BANNER_SLIDES.flatMap((slide) => {
    const service = allServices.find((s) => s.slug === slide.slug);
    if (!service) return [];
    return [{ ...slide, name: service.name, tagline: RITUAL_BANNER_TAGLINE[slide.slug] ?? service.description }];
  });

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

      {bannerItems.length > 0 ? (
        <>
          <section className="py-[88px]">
            <div className="container mx-auto max-w-[1180px] px-7">
              <Reveal as="div" className="section-head mb-12 max-w-[620px]">
                <span className="eyebrow">Rituales Energéticos</span>
                <h2>
                  Evidencias visuales <em>de nuestros rituales</em>
                </h2>
              </Reveal>
              <RitualBanner items={bannerItems} />
            </div>
          </section>

          <div className="container mx-auto max-w-[1180px] px-7">
            <div className="divider" />
          </div>
        </>
      ) : null}

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
        href="/tarotistas"
        cta="Reservar consulta"
      />

      <FAQSection items={faqItems} compact />
    </>
  );
}
