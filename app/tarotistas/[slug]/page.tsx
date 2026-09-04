import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTarotistaBySlug } from "@/server/tarotistas";
import { getServices } from "@/server/services";
import { getCurrentUser } from "@/lib/auth/session";
import { isReportOnlyService } from "@/lib/service-fulfillment";
import { GlassCard } from "@/components/ui/GlassCard";
import { ConsultationForm } from "@/components/tarotistas/ConsultationForm";
import { AttentionRequestForm } from "@/components/tarotistas/AttentionRequestForm";
import {
  TAROTISTA_STATUS_LABEL,
  TAROTISTA_STATUS_DESCRIPTION,
  TAROTISTA_STATUS_DOT_CLASS,
} from "@/lib/tarotista-status";

interface TarotistaPageProps {
  params: Promise<{ slug: string }>;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export async function generateMetadata({ params }: TarotistaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tarotista = await getTarotistaBySlug(slug);
  if (!tarotista) return {};
  return {
    alternates: { canonical: `/tarotistas/${slug}` },
    title: tarotista.name,
    description: tarotista.bio ?? `Consulta con ${tarotista.name}.`,
  };
}

/**
 * Ficha individual del tarotista (Fases 5-7): si está DISPONIBLE, ofrece
 * consulta inmediata (servicio -> pago -> se habilita, ver
 * ConsultationForm/server/consultations.ts); si no, deja "Solicitar
 * atención" (AttentionRequestForm/server/attention-requests.ts).
 */
export default async function TarotistaProfilePage({ params }: TarotistaPageProps) {
  const { slug } = await params;
  const [tarotista, services, user] = await Promise.all([
    getTarotistaBySlug(slug),
    getServices(),
    getCurrentUser(),
  ]);
  if (!tarotista || !tarotista.active) notFound();

  const eligibleServices = services.filter((s) => !isReportOnlyService(s.slug));
  const isAvailable = tarotista.status === "DISPONIBLE";

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[720px] px-7">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-gold/25 bg-gradient-to-br from-carbon-2 to-obsidian shadow-[0_0_36px_rgba(232,163,61,0.18)]">
            {tarotista.photoUrl ? (
              <Image src={tarotista.photoUrl} alt={tarotista.name} fill className="object-cover" priority />
            ) : (
              <span className="font-display text-4xl text-gold-soft">{initials(tarotista.name)}</span>
            )}
          </div>

          <span className="eyebrow justify-center">Tarotista</span>
          <h1 className="mt-3 mb-0">{tarotista.name}</h1>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-bone-dim">
              <span
                className={`h-2 w-2 rounded-full ${TAROTISTA_STATUS_DOT_CLASS[tarotista.status]}`}
                aria-hidden="true"
              />
              {TAROTISTA_STATUS_LABEL[tarotista.status]}
            </span>
            {tarotista.experience ? (
              <>
                <span className="h-1 w-1 rounded-full bg-white/15" aria-hidden="true" />
                <span className="font-mono text-[11px] uppercase tracking-wide text-gold-soft">
                  {tarotista.experience}
                </span>
              </>
            ) : null}
          </div>

          {tarotista.bio ? (
            <p className="mx-auto mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-bone-dim">{tarotista.bio}</p>
          ) : null}
        </div>

        <GlassCard>
          {isAvailable ? (
            <>
              <span className="eyebrow mb-4">Consulta ahora</span>
              <ConsultationForm
                tarotistaId={tarotista.id}
                services={eligibleServices}
                isLoggedIn={Boolean(user)}
              />
            </>
          ) : (
            <>
              <span className="eyebrow mb-2">Solicitar atención</span>
              <p className="mb-4 text-sm text-bone-dim">{TAROTISTA_STATUS_DESCRIPTION[tarotista.status]}</p>
              <AttentionRequestForm tarotistaId={tarotista.id} />
            </>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
