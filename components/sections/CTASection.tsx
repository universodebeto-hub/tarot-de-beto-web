import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";

interface CTASectionProps {
  eyebrow: string;
  title: ReactNode;
  href: string;
  cta: string;
}

export function CTASection({ eyebrow, title, href, cta }: CTASectionProps) {
  return (
    <section className="text-center">
      <div className="container mx-auto max-w-[1180px] px-7">
        <Reveal>
          <GlassCard className="mx-auto max-w-[640px]">
            <span className="eyebrow mb-3.5 justify-center">{eyebrow}</span>
            <h2 className="mb-4">{title}</h2>
            <Button href={href}>{cta}</Button>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}
