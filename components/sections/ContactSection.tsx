import type { ReactNode } from "react";
import { buildWhatsAppLink, siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-gold/8 text-gold">
      {children}
    </div>
  );
}

export function ContactSection() {
  const cards = [
    siteConfig.social.tiktok && {
      key: "tiktok",
      title: "Síguenos en TikTok",
      text: "Cartas del día, señales y lecturas cortas cada semana.",
      href: siteConfig.social.tiktok,
      cta: "Ir a TikTok",
      variant: "ghost" as const,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[26px] w-[26px]">
          <path d="M16.6 5.82c-.9-.62-1.5-1.6-1.63-2.72h-3.02v13.2c0 1.36-1.1 2.46-2.46 2.46a2.46 2.46 0 0 1 0-4.92c.24 0 .48.03.7.1V10.8a5.5 5.5 0 0 0-.7-.05 5.5 5.5 0 1 0 5.5 5.5V9.4a8.2 8.2 0 0 0 4.61 1.4V7.76a5.5 5.5 0 0 1-3-1.94Z" />
        </svg>
      ),
    },
    siteConfig.social.facebook && {
      key: "facebook",
      title: "Síguenos en Facebook",
      text: "Testimonios, disponibilidad y publicaciones sobre tarot.",
      href: siteConfig.social.facebook,
      cta: "Ir a Facebook",
      variant: "ghost" as const,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[26px] w-[26px]">
          <path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.35A21 21 0 0 0 14 4.2c-2.2 0-3.7 1.34-3.7 3.8v2.1H7.7v3h2.6V21h3.2Z" />
        </svg>
      ),
    },
    siteConfig.contact.whatsappNumber && {
      key: "whatsapp",
      title: "Pide tu consulta al WhatsApp",
      text: siteConfig.contact.whatsappNumber,
      href: buildWhatsAppLink(
        siteConfig.contact.whatsappNumber,
        "Hola Beto, estoy interesado en reservar una consulta.",
      ),
      cta: "Escribir por WhatsApp",
      variant: "gold" as const,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[26px] w-[26px]">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .78.8-2.93-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.78.96-.14.16-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z" />
        </svg>
      ),
    },
  ].filter(Boolean) as {
    key: string;
    title: string;
    text: string;
    href: string;
    cta: string;
    variant: "gold" | "ghost";
    icon: ReactNode;
  }[];

  return (
    <section id="contacto" className="pb-[110px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <Reveal as="div" className="section-head mb-12 max-w-[620px]">
          <span className="eyebrow">Contáctame</span>
          <h2>
            Hablemos de tu <em>consulta</em>
          </h2>
        </Reveal>

        {cards.length === 0 ? (
          <p className="text-ash">Contacto próximamente disponible.</p>
        ) : (
          <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Reveal key={card.key}>
                <GlassCard className="flex h-full flex-col gap-3.5 text-left">
                  <IconWrap>{card.icon}</IconWrap>
                  <h3 className="mb-0.5">{card.title}</h3>
                  <p className="mb-1 text-sm">{card.text}</p>
                  <Button href={card.href} external variant={card.variant} className="mt-auto self-start">
                    {card.cta}
                  </Button>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
