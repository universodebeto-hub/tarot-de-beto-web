import type { Metadata } from "next";
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
        <div className="mb-8 text-center">
          <span className="eyebrow justify-center">Tarotista</span>
          <h1 className="mt-3">{tarotista.name}</h1>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-bone-dim">
            <span
              className={`h-2 w-2 rounded-full ${TAROTISTA_STATUS_DOT_CLASS[tarotista.status]}`}
              aria-hidden="true"
            />
            {TAROTISTA_STATUS_LABEL[tarotista.status]}
          </span>
          {tarotista.bio ? <p className="mx-auto mt-3 max-w-[46ch] text-bone-dim">{tarotista.bio}</p> : null}
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
