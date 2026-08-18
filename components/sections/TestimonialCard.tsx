import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import type { Testimonial } from "@/types/content";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Reveal>
      <GlassCard className="flex h-full flex-col gap-3">
        <div className="flex gap-1 text-gold" aria-label={`${testimonial.rating} de 5 estrellas`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} aria-hidden="true">
              {i < testimonial.rating ? "★" : "☆"}
            </span>
          ))}
        </div>
        <p className="text-sm italic text-bone">&ldquo;{testimonial.text}&rdquo;</p>
        <span className="mt-auto font-mono text-[11px] uppercase tracking-wide text-gold">
          {testimonial.name}
        </span>
      </GlassCard>
    </Reveal>
  );
}
