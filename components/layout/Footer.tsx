import Link from "next/link";
import Image from "next/image";
import { siteConfig, buildWhatsAppLink } from "@/config/site";
import { Button } from "@/components/ui/Button";

const QUICK_LINKS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/tarotistas", label: "Tarotistas" },
  { href: "/faq", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
];

const SOCIALS = [
  { href: siteConfig.social.tiktok, label: "TikTok" },
  { href: siteConfig.social.instagram, label: "Instagram" },
  { href: siteConfig.social.facebook, label: "Facebook" },
  { href: siteConfig.social.youtube, label: "YouTube" },
].filter((s) => s.href);

export function Footer() {
  return (
    <footer className="site-footer relative z-10 border-t border-white/10 py-16">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="glass arcana mb-12 text-center">
          <span className="eyebrow mb-3 justify-center">¿Lista tu pregunta?</span>
          <h2 className="mb-6">
            ¿Listo para consultar <em>las cartas?</em>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/tarotistas">Reservar consulta</Button>
            {siteConfig.contact.whatsappNumber ? (
              <Button
                href={buildWhatsAppLink(
                  siteConfig.contact.whatsappNumber,
                  "Hola Beto, tengo dudas antes de reservar mi consulta.",
                )}
                external
                variant="ghost"
              >
                ¿Dudas antes de reservar?
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/assets/logo/emblem.png"
                alt=""
                width={38}
                height={38}
                className="shrink-0 rounded-[9px] drop-shadow-[0_0_10px_rgba(232,163,61,0.5)]"
              />
              <span className="flex flex-col items-start leading-none">
                <span className="font-mono text-[7.5px] uppercase tracking-[0.3em] text-ash">Tarot de</span>
                <span className="bg-gradient-to-br from-gold-soft via-gold to-ember bg-clip-text font-display text-xl font-semibold text-transparent">
                  Beto
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm">
              Lecturas de tarot con Alberto Arango. Consultas honestas, cercanas y sin promesas vacías.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm">Enlaces rápidos</h3>
            <ul className="flex flex-col gap-2 font-mono text-xs uppercase tracking-wide">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-bone-dim hover:text-gold-soft transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm">Hablemos</h3>
            <ul className="flex flex-col gap-2 font-mono text-xs uppercase tracking-wide">
              {siteConfig.contact.whatsappNumber ? (
                <li>
                  <a
                    href={buildWhatsAppLink(
                      siteConfig.contact.whatsappNumber,
                      "Hola Beto, estoy interesado en reservar una consulta.",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bone-dim hover:text-gold-soft transition-colors"
                  >
                    Hablar directamente con Beto
                  </a>
                </li>
              ) : null}
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bone-dim hover:text-gold-soft transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divider my-10" />

        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[12.5px] text-ash">
          <p className="mb-0">
            © {new Date().getFullYear()} {siteConfig.siteName} — {siteConfig.brandName}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacidad" className="hover:text-gold-soft transition-colors">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-gold-soft transition-colors">
              Términos
            </Link>
            <Link href="/politica-de-reservas" className="hover:text-gold-soft transition-colors">
              Reservas y cancelación
            </Link>
          </div>
          <p className="mb-0">Lecturas con respeto, sin promesas vacías.</p>
        </div>
      </div>
    </footer>
  );
}
