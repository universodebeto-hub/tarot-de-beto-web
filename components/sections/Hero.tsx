import { siteConfig, buildWhatsAppLink } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const TRUST_BADGES = ["Consultas personalizadas", "Atención privada", "Agenda online", "Pago seguro"];

export function Hero() {
  return (
    <section className="hero relative pb-20 pt-16 sm:pt-24">
      <div className="container mx-auto grid max-w-[1180px] items-center gap-12 px-7 lg:grid-cols-[1.1fr_0.9fr] lg:gap-[60px]">
        <Reveal>
          <span className="eyebrow">{siteConfig.siteName}</span>
          <h1>
            {siteConfig.tagline.split(" ").slice(0, 4).join(" ")}
            <br />
            <em>{siteConfig.tagline.split(" ").slice(4).join(" ")}</em>
          </h1>
          <p className="lead max-w-[46ch] text-[1.08rem]">
            Alberto Arango es tarotista, guía espiritual, terapeuta holístico y espiritista, con más de 12
            años de experiencia acompañando decisiones de amor, trabajo y camino de vida. Una consulta
            cercana, honesta y sin vueltas.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/servicios">Reservar consulta</Button>
            <Button href="/servicios" variant="ghost">
              Ver servicios
            </Button>
            {siteConfig.contact.whatsappNumber ? (
              <Button
                href={buildWhatsAppLink(
                  siteConfig.contact.whatsappNumber,
                  "Hola Beto, estoy interesado en reservar una consulta.",
                )}
                external
                variant="ghost"
              >
                WhatsApp
              </Button>
            ) : null}
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-ash">
            {TRUST_BADGES.map((badge) => (
              <li key={badge} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gold" aria-hidden="true" />
                {badge}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="relative flex justify-center" style={{ perspective: "1200px" }}>
            <div className="tarot-card behind" aria-hidden="true" />
            <div className="tarot-card">
              <span className="mark tl">XVII</span>
              <div className="glyph">
                <svg viewBox="0 0 100 100" fill="none" stroke="var(--color-gold)" strokeWidth={1.3}>
                  <circle cx="50" cy="38" r="20" />
                  <path d="M50 6 L50 16 M50 60 L50 70 M14 38 L24 38 M76 38 L86 38 M23 11 L30 18 M77 11 L70 18 M23 65 L30 58 M77 65 L70 58" />
                  <path d="M20 92 Q50 68 80 92" strokeWidth={1} />
                </svg>
              </div>
              <span className="mark br">XVII</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
