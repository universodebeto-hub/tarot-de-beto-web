"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import type { FaqItem } from "@/types/content";

interface FAQSectionProps {
  items: FaqItem[];
  compact?: boolean;
}

export function FAQSection({ items, compact = false }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const visibleItems = compact ? items.slice(0, 5) : items;

  return (
    <section id="faq" className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <Reveal as="div" className="section-head mb-12 max-w-[620px]">
          <span className="eyebrow">Preguntas frecuentes</span>
          <h2>
            Todo lo que <em>necesitas saber</em>
          </h2>
        </Reveal>

        <div className="mx-auto flex max-w-[760px] flex-col gap-3">
          {visibleItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question} className="glass overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-base text-bone">{item.question}</span>
                  <span
                    className={`shrink-0 font-mono text-gold transition-transform ${isOpen ? "rotate-45" : ""}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {isOpen ? (
                  <div className="px-6 pb-5">
                    <p className="mb-0 text-sm">{item.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
