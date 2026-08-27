import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/quienes-somos", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/servicios", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/tarotistas", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/contacto", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/privacidad", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/politica-de-reservas", priority: 0.3, changeFrequency: "yearly" as const },
];

/**
 * Solo páginas públicas e indexables. Deliberadamente fuera: `/admin`,
 * `/dashboard`, `/login`, `/registro`, `/recuperar-password`,
 * `/restablecer-password`, `/reservar`, `/reservas/[id]` (privadas o
 * dependientes de query params/sesión — ver `robots.ts` y los `robots:
 * { index: false }` en esas páginas).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${siteConfig.siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
