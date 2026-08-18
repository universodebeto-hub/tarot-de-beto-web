import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import type { Service } from "@/types/content";

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII"];

interface ServiceCardProps {
  service: Service;
  index: number;
}

export function ServiceCard({ service, index }: ServiceCardProps) {
  return (
    <Reveal>
      <GlassCard numeral={ROMAN[index % ROMAN.length]} className="flex h-full flex-col gap-3">
        <div className="flex h-[46px] w-[46px] items-center justify-center text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-[30px] w-[30px]">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
        </div>
        <h3 className="mb-0">{service.name}</h3>
        <p className="text-sm">{service.description}</p>

        {!service.available ? (
          <span className="font-mono text-[11px] uppercase tracking-wide text-ash">No disponible por ahora</span>
        ) : null}

        <div className="mt-auto flex items-baseline justify-between border-t border-white/10 pt-3.5 font-mono">
          <span className="text-[1.05rem] text-gold-soft">
            {service.price} {service.currency}
          </span>
          <span className="text-[11.5px] text-ash">{service.durationMinutes} min</span>
        </div>

        {service.available ? (
          <Button href={`/agenda?service=${service.slug}`} className="w-full justify-center">
            Reservar ahora
          </Button>
        ) : (
          <Button href="/contacto" variant="ghost" className="w-full justify-center">
            Consultar disponibilidad
          </Button>
        )}
      </GlassCard>
    </Reveal>
  );
}
