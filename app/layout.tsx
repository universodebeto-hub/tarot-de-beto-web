import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Work_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { StarsField } from "@/components/layout/StarsField";
import { ToastProvider } from "@/components/ui/Toast";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";
import { getProviderPresence } from "@/server/presence";
import { prisma } from "@/lib/prisma";
import { Analytics } from "@/components/analytics/Analytics";
import { LocalBusinessJsonLd } from "@/components/seo/LocalBusinessJsonLd";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "500", "600"],
});

const workSans = Work_Sans({
  variable: "--font-worksans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const spaceMono = Space_Mono({
  variable: "--font-spacemono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const DEFAULT_TITLE = `${siteConfig.siteName} — Lecturas de tarot con Alberto Arango`;
const DEFAULT_DESCRIPTION =
  "Tarot, guía espiritual y consultas personalizadas con Alberto Arango. Más de 12 años de experiencia acompañando decisiones de amor, trabajo y camino de vida.";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${siteConfig.siteName}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: siteConfig.siteName,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: siteConfig.siteUrl,
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  // Fase 8 (PWA): permite "Agregar a pantalla de inicio" en iPhone (Safari
  // no sigue el manifest.webmanifest para esto, necesita sus propios meta
  // tags) — en Android, app/manifest.ts ya alcanza. themeColor colorea la
  // barra de estado del sistema al abrir como app instalada.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.siteName,
  },
};

export const viewport = {
  themeColor: "#0b0a0c",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nota: leer la sesión aquí hace dinámicas todas las rutas anidadas (ya no
  // se sirven estáticas/ISR). Es el trade-off correcto para tener el estado
  // de "sesión iniciada" en el Navbar; revisar en la Fase 9 (performance) si
  // conviene aislarlo en un componente cliente aparte para las páginas 100%
  // públicas.
  const user = await getCurrentUser();
  const presence = await getProviderPresence();
  // Si la cuenta logueada tiene un perfil de tarotista vinculado (ver
  // server/tarotista-panel.ts), "Hola, X" en el navbar lleva a su panel de
  // disponibilidad en vez del dashboard de cliente.
  const ownTarotista = user
    ? await prisma.tarotista.findUnique({ where: { userId: user.id }, select: { id: true } })
    : null;

  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${workSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocalBusinessJsonLd />
        <StarsField />
        <ToastProvider>
          <Navbar
            whatsappNumber={siteConfig.contact.whatsappNumber}
            userFirstName={user?.firstName}
            accountHref={ownTarotista ? "/panel-tarotista" : "/dashboard"}
          />
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
          <WhatsAppButton
            whatsappNumber={siteConfig.contact.whatsappNumber}
            isOnline={presence.isOnline}
          />
        </ToastProvider>
        <Analytics
          gaId={siteConfig.analytics.gaId}
          metaPixelId={siteConfig.analytics.metaPixelId}
          tiktokPixelId={siteConfig.analytics.tiktokPixelId}
        />
      </body>
    </html>
  );
}
