import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/server/services";
import { ritualGalleryFor } from "@/lib/ritual-gallery";
import { buildWhatsAppLink, siteConfig } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { RitualGallery } from "@/components/rituales/RitualGallery";

interface RitualPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RitualPageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return {};
  return {
    alternates: { canonical: `/servicios/${slug}` },
    title: service.name,
    description: service.description,
  };
}

export default async function RitualDetailPage({ params }: RitualPageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const gallery = ritualGalleryFor(slug);
  const photos = gallery ? [gallery.hero, ...gallery.gallery] : [];

  const whatsappMessage = `Hola Beto, quiero más información sobre el ${service.name}.`;

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow">{service.category}</span>
          <h1 className="mt-3">{service.name}</h1>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col gap-6">
            {gallery ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/25 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.65)]">
                <Image
                  src={gallery.hero}
                  alt={`${service.name} — evidencia visual`}
                  fill
                  sizes="(min-width: 1024px) 460px, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : null}

            <GlassCard className="flex flex-col gap-3">
              <span className="eyebrow">Detalle</span>
              <p className="mb-0 text-bone">{service.description}</p>
              <div className="mt-1 flex items-baseline justify-between border-t border-white/10 pt-3.5 font-mono">
                <span className="text-[1.05rem] text-gold-soft">
                  {service.price} {service.currency}
                </span>
                {!service.available ? (
                  <span className="text-[11px] uppercase tracking-wide text-ash">No disponible por ahora</span>
                ) : null}
              </div>
              <Button
                href={
                  service.available
                    ? `/agenda?service=${service.slug}`
                    : buildWhatsAppLink(siteConfig.contact.whatsappNumber, whatsappMessage)
                }
                external={!service.available}
                className="w-full justify-center"
              >
                {service.available ? "Reservar ahora" : "Consultar disponibilidad"}
              </Button>
            </GlassCard>
          </div>

          <div className="flex flex-col gap-10">
            {photos.length > 0 ? (
              <div>
                <span className="eyebrow mb-4 block">Evidencias visuales de este ritual</span>
                <RitualGallery ritualName={service.name} photos={photos} />
              </div>
            ) : null}

            <div>
              <span className="eyebrow mb-4 block">Testimonios</span>
              <GlassCard className="text-center">
                <p className="mb-0 text-sm text-ash">
                  Espacio reservado para testimonios reales — próximamente.
                </p>
              </GlassCard>
            </div>

            <GlassCard className="flex flex-wrap items-center justify-between gap-3">
              <p className="mb-0 text-sm text-bone-dim">
                ¿Tienes dudas sobre este ritual? Escríbele a Beto directamente.
              </p>
              <div className="flex gap-3">
                <Link href="/servicios" className="btn btn-ghost">
                  Ver todos los rituales
                </Link>
                <a
                  href={buildWhatsAppLink(siteConfig.contact.whatsappNumber, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold"
                >
                  Escribir por WhatsApp
                </a>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
