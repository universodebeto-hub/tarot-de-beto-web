import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "En mantenimiento",
  robots: { index: false },
};

/**
 * Página de mantenimiento. Aún no está conectada a un interruptor real
 * (eso llega en la Fase 7, panel admin, vía middleware + tabla `settings`);
 * por ahora es solo la vista, visitable manualmente en /mantenimiento.
 */
export default function MantenimientoPage() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-7 py-24 text-center">
      <div className="tarot-card mb-10">
        <span className="mark tl">✦</span>
        <div className="glyph">
          <svg viewBox="0 0 100 100" fill="none" stroke="var(--color-gold)" strokeWidth={1.3} className="opacity-70">
            <circle cx="50" cy="50" r="6" />
            <path d="M50 20v14M50 66v14M20 50h14M66 50h14M28 28l10 10M62 62l10 10M72 28 62 38M38 62 28 72" />
          </svg>
        </div>
        <span className="mark br">✦</span>
      </div>

      <span className="eyebrow">En pausa</span>
      <h1 className="mt-3 max-w-lg">
        Estamos <em>reordenando las cartas</em>
      </h1>
      <p className="max-w-[46ch]">
        {siteConfig.siteName} está en mantenimiento por un momento breve. Vuelve pronto — o escríbenos por
        WhatsApp si necesitas ayuda ahora mismo.
      </p>
    </section>
  );
}
