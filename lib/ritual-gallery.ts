/**
 * Galería de fotos reales por ritual — evidencias visuales de trabajos ya
 * realizados, distintas de la imagen ilustrada del catálogo
 * (`lib/service-images.ts`). Clave por `Service.slug` (ver
 * `prisma/seed.ts`), mismo patrón que `lib/service-intake.ts`: sin tocar el
 * schema de Prisma, si un slug no aparece acá ese servicio no tiene galería.
 *
 * Archivos generados a partir de las fotos reales en
 * `public/assets/rituales/<slug>/` (hero.webp, card.webp, gallery-NN.webp) —
 * ver el plan aprobado para el detalle de qué foto original corresponde a
 * cada una.
 */

export interface RitualGallery {
  hero: string;
  gallery: string[];
}

function galleryFiles(slug: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `/assets/rituales/${slug}/gallery-${String(i + 1).padStart(2, "0")}.webp`,
  );
}

function ritualEntry(slug: string, galleryCount: number): RitualGallery {
  return {
    hero: `/assets/rituales/${slug}/hero.webp`,
    gallery: galleryFiles(slug, galleryCount),
  };
}

export const RITUAL_GALLERY: Record<string, RitualGallery> = {
  "ritual-endulzamiento": ritualEntry("ritual-endulzamiento", 3),
  "ritual-de-amarre": ritualEntry("ritual-de-amarre", 3),
  "ritual-corte-de-lazos": ritualEntry("ritual-corte-de-lazos", 3),
  "ritual-proteccion": ritualEntry("ritual-proteccion", 3),
  "ritual-del-dinero": ritualEntry("ritual-del-dinero", 2),
  "ritual-destrancadera": ritualEntry("ritual-destrancadera", 1),
  "ritual-abre-caminos": ritualEntry("ritual-abre-caminos", 2),
};

export function ritualGalleryFor(slug: string): RitualGallery | null {
  return RITUAL_GALLERY[slug] ?? null;
}

export interface RitualBannerSlide {
  slug: string;
  desktop: string;
  mobile: string;
}

/** Diapositivas del banner rotativo de home, en un orden fijo que evita que
 * dos fotos del mismo ritual (o de rituales visualmente parecidos) queden
 * consecutivas. Archivos generados en public/assets/banner-rituales/. */
export const RITUAL_BANNER_SLIDES: RitualBannerSlide[] = [
  {
    slug: "ritual-endulzamiento",
    desktop: "/assets/banner-rituales/01-ritual-endulzamiento-desktop.webp",
    mobile: "/assets/banner-rituales/01-ritual-endulzamiento-mobile.webp",
  },
  {
    slug: "ritual-de-amarre",
    desktop: "/assets/banner-rituales/02-ritual-de-amarre-desktop.webp",
    mobile: "/assets/banner-rituales/02-ritual-de-amarre-mobile.webp",
  },
  {
    slug: "ritual-abre-caminos",
    desktop: "/assets/banner-rituales/03-ritual-abre-caminos-desktop.webp",
    mobile: "/assets/banner-rituales/03-ritual-abre-caminos-mobile.webp",
  },
  {
    slug: "ritual-corte-de-lazos",
    desktop: "/assets/banner-rituales/04-ritual-corte-de-lazos-desktop.webp",
    mobile: "/assets/banner-rituales/04-ritual-corte-de-lazos-mobile.webp",
  },
  {
    slug: "ritual-proteccion",
    desktop: "/assets/banner-rituales/05-ritual-proteccion-desktop.webp",
    mobile: "/assets/banner-rituales/05-ritual-proteccion-mobile.webp",
  },
];

/** Frase breve por ritual, para el banner rotativo de home — basada en la
 * descripción real ya existente del servicio (prisma/seed.ts), sin agregar
 * características que no estén ya en el catálogo. */
export const RITUAL_BANNER_TAGLINE: Record<string, string> = {
  "ritual-endulzamiento": "Armonía y calidez en tus vínculos más cercanos.",
  "ritual-de-amarre": "Fortalece la conexión y el compromiso en una relación.",
  "ritual-abre-caminos": "Despeja el camino hacia nuevas oportunidades.",
  "ritual-corte-de-lazos": "Libera ataduras que ya no te corresponden.",
  "ritual-proteccion": "Un resguardo energético para tu día a día.",
};
