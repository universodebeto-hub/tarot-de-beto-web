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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${siteConfig.siteName} — Lecturas de tarot con Alberto Arango`,
    template: `%s — ${siteConfig.siteName}`,
  },
  description:
    "Tarot, guía espiritual y consultas personalizadas con Alberto Arango. Más de 12 años de experiencia acompañando decisiones de amor, trabajo y camino de vida.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${workSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StarsField />
        <ToastProvider>
          <Navbar whatsappNumber={siteConfig.contact.whatsappNumber} />
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
          <WhatsAppButton whatsappNumber={siteConfig.contact.whatsappNumber} />
        </ToastProvider>
      </body>
    </html>
  );
}
