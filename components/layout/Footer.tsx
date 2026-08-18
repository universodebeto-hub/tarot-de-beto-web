import Link from "next/link";
import { siteConfig, buildWhatsAppLink } from "@/config/site";
import { Button } from "@/components/ui/Button";

const QUICK_LINKS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/agenda", label: "Agenda" },
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
            <Button href="/agenda">Reservar consulta</Button>
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
            <span className="font-display italic text-lg text-gold-soft">
              <strong className="font-medium not-italic text-bone">Tarot</strong> de Beto
            </span>
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
          <p className="mb-0">Lecturas con respeto, sin promesas vacías.</p>
        </div>
      </div>
    </footer>
  );
}
