import { siteConfig } from "@/config/site";

/**
 * Datos estructurados Schema.org (`LocalBusiness`) para que buscadores
 * puedan mostrar nombre, contacto y redes en resultados enriquecidos.
 * `telephone`/`sameAs` solo se incluyen si están configurados, para no
 * publicar datos vacíos o inventados.
 */
export function LocalBusinessJsonLd() {
  const sameAs = [
    siteConfig.social.tiktok,
    siteConfig.social.instagram,
    siteConfig.social.facebook,
    siteConfig.social.youtube,
  ].filter(Boolean);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteConfig.siteName,
    alternateName: siteConfig.brandName,
    description:
      "Lecturas de tarot y consultas espirituales con Alberto Arango, más de 12 años de experiencia.",
    url: siteConfig.siteUrl,
    priceRange: "$$",
  };

  if (siteConfig.contact.whatsappNumber) data.telephone = siteConfig.contact.whatsappNumber;
  if (siteConfig.contact.email) data.email = siteConfig.contact.email;
  if (sameAs.length > 0) data.sameAs = sameAs;

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
