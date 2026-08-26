import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { buildWhatsAppLink } from "@/config/site";
import {
  TAROTISTA_STATUS_LABEL,
  TAROTISTA_STATUS_DESCRIPTION,
  TAROTISTA_STATUS_DOT_CLASS,
} from "@/lib/tarotista-status";
import type { Tarotista } from "@prisma/client";

interface TarotistaCardProps {
  tarotista: Tarotista;
  whatsappNumber: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/**
 * Ficha pública de un tarotista (Fase 2). El CTA todavía apunta al flujo de
 * reserva actual (/agenda) — el nuevo flujo "duración -> pago -> consulta
 * habilitada" sin fecha/hora es la Fase 4, no se adelanta acá. "Solicitar
 * atención" (tarotista no disponible) todavía no tiene backend propio (esa
 * es la Fase 5), así que de momento cae a WhatsApp, mismo criterio que ya
 * usa el resto del sitio para flujos aún no automatizados.
 */
export function TarotistaCard({ tarotista, whatsappNumber }: TarotistaCardProps) {
  const isAvailable = tarotista.status === "DISPONIBLE";

  return (
    <GlassCard className="flex flex-col items-center gap-4 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-gold/25 bg-gradient-to-br from-carbon-2 to-obsidian shadow-[0_0_30px_rgba(232,163,61,0.12)]">
        {tarotista.photoUrl ? (
          <Image src={tarotista.photoUrl} alt={tarotista.name} fill className="object-cover" />
        ) : (
          <span className="font-display text-3xl text-gold-soft">{initials(tarotista.name)}</span>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-xl">{tarotista.name}</h3>
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-bone-dim">
          <span
            className={`h-2 w-2 rounded-full ${TAROTISTA_STATUS_DOT_CLASS[tarotista.status]}`}
            aria-hidden="true"
          />
          {TAROTISTA_STATUS_LABEL[tarotista.status]}
        </span>
      </div>

      {tarotista.bio ? <p className="mb-0 max-w-[32ch] text-sm text-bone-dim">{tarotista.bio}</p> : null}

      {tarotista.specialties.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-2">
          {tarotista.specialties.map((s) => (
            <li
              key={s}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10.5px] uppercase tracking-wide text-ash"
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mb-0 text-xs text-ash">{TAROTISTA_STATUS_DESCRIPTION[tarotista.status]}</p>

      {isAvailable ? (
        <Button href="/agenda" className="w-full justify-center">
          Consultar ahora
        </Button>
      ) : whatsappNumber ? (
        <Button
          href={buildWhatsAppLink(
            whatsappNumber,
            `Hola Beto, quiero solicitar atención con ${tarotista.name} en cuanto esté disponible.`,
          )}
          external
          variant="ghost"
          className="w-full justify-center"
        >
          Solicitar atención
        </Button>
      ) : null}
    </GlassCard>
  );
}
