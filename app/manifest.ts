import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Fase 8 (PWA): hace el sitio instalable en el teléfono del tarotista —
 * "Agregar a pantalla de inicio" ya usa esto para el ícono/nombre/colores,
 * sin necesitar una app nativa. Mismo patrón que app/sitemap.ts (Next.js
 * genera /manifest.webmanifest solo, sin archivo estático en public/).
 * `start_url: "/panel-tarotista"` porque quien instala esto en su teléfono
 * es el tarotista, no un cliente ocasional — abre directo a su panel de
 * disponibilidad, el uso real de "app" que pidió el proyecto.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.siteName} — Panel del tarotista`,
    short_name: siteConfig.siteName,
    description: "Gestiona tu disponibilidad y tus consultas desde el teléfono.",
    start_url: "/panel-tarotista",
    display: "standalone",
    background_color: "#0b0a0c",
    theme_color: "#0b0a0c",
    icons: [
      { src: "/assets/logo/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/logo/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
