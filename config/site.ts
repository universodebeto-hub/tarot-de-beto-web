/**
 * Configuración central de la marca. Todo lo que pueda cambiar sin tocar
 * código (nombre, contacto, redes, moneda, zona horaria) vive aquí y se
 * alimenta de variables de entorno — nunca hardcodeado en componentes.
 * A partir de la Fase 2, los textos editables por el admin (quiénes somos,
 * FAQ, políticas) se moverán a la tabla `settings` en base de datos; esto
 * cubre la configuración de infraestructura/marca que sí vive en el entorno.
 *
 * Solo se lee directamente desde componentes de servidor (layout, páginas,
 * metadata). Los valores que necesitan componentes cliente (Navbar,
 * WhatsAppButton, ContactForm, ServiceCard) se les pasan como props simples
 * calculadas por su padre servidor — no leer este módulo desde un componente
 * "use client": en esta versión de Next.js (16.3.1 + Turbopack) un cliente
 * anidado dentro de otro cliente puede hidratar con un valor de
 * NEXT_PUBLIC (o de contexto) desactualizado. Ver components/sections/ServiceCard.tsx
 * y lib/service-cta.ts para el patrón recomendado.
 */

function required(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const siteConfig = {
  brandName: required("NEXT_PUBLIC_BRAND_NAME", "Universo de Beto"),
  siteName: required("NEXT_PUBLIC_SITE_NAME", "Tarot de Beto"),
  tagline: required(
    "NEXT_PUBLIC_TAGLINE",
    "La carta ya sabe lo que tú preguntas.",
  ),
  siteUrl: required("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  contact: {
    whatsappNumber: required("NEXT_PUBLIC_WHATSAPP_NUMBER", ""),
    email: required("NEXT_PUBLIC_CONTACT_EMAIL", ""),
  },

  social: {
    tiktok: required("NEXT_PUBLIC_TIKTOK_URL", ""),
    instagram: required("NEXT_PUBLIC_INSTAGRAM_URL", ""),
    facebook: required("NEXT_PUBLIC_FACEBOOK_URL", ""),
    youtube: required("NEXT_PUBLIC_YOUTUBE_URL", ""),
  },

  currency: required("NEXT_PUBLIC_CURRENCY", "USD"),
  timezone: required("NEXT_PUBLIC_BUSINESS_TIMEZONE", "America/Bogota"),
} as const;

export type SiteConfig = typeof siteConfig;

/** Construye el link de WhatsApp con mensaje pre-rellenado (wa.me). Recibe el número explícito (ver nota arriba sobre por qué no se lee del módulo en cliente). */
export function buildWhatsAppLink(whatsappNumber: string, message?: string): string {
  const number = whatsappNumber.replace(/[^\d]/g, "");
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
