import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { siteConfig } from "@/config/site";

export interface LegalSection {
  heading: string;
  /** Un párrafo por elemento. */
  body: string[];
}

interface LegalArticleProps {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  sections: LegalSection[];
}

/**
 * Layout compartido para las páginas legales. El aviso de "texto de
 * ejemplo" es intencional y visible — estos textos cubren la estructura
 * esperada (qué se recopila, cómo se paga, cómo se cancela) pero no
 * reemplazan una revisión legal real antes de operar con clientes de
 * verdad, sobre todo en cuanto a normativa de protección de datos aplicable
 * (ej. Colombia: Ley 1581 de 2012) y a los términos reales de cancelación
 * que Alberto quiera ofrecer.
 */
export function LegalArticle({ eyebrow, title, intro, sections }: LegalArticleProps) {
  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[860px] px-7">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-3 mb-6">{title}</h1>

        <GlassCard className="mb-8 border-gold/30 bg-gold/5">
          <p className="mb-0 text-sm text-bone-dim">
            <strong className="text-gold-soft">Texto de ejemplo.</strong> Este contenido cubre la
            estructura habitual de esta página, pero antes de publicarlo con clientes reales debe
            revisarlo un abogado — en particular la normativa de protección de datos aplicable y los
            términos de cancelación/reembolso que {siteConfig.brandName} quiera ofrecer.
          </p>
        </GlassCard>

        {intro ? <p className="mb-8 text-[1.05rem] text-bone-dim">{intro}</p> : null}

        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="mb-3 text-xl">{s.heading}</h2>
              <div className="flex flex-col gap-3 text-bone-dim">
                {s.body.map((paragraph, i) => (
                  <p key={i} className="mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
