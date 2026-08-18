import { TestimonialCard } from "@/components/sections/TestimonialCard";
import { Reveal } from "@/components/ui/Reveal";
import type { Testimonial } from "@/types/content";

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section id="referencias" className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <Reveal as="div" className="section-head mb-12 max-w-[620px]">
          <span className="eyebrow">Referencias</span>
          <h2>
            Experiencias de <em>nuestros clientes</em>
          </h2>
        </Reveal>

        {testimonials.length === 0 ? (
          <p className="text-ash">Todavía no hay referencias publicadas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
