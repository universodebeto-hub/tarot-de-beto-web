import type { Metadata } from "next";
import { getOwnTarotista } from "@/server/tarotista-panel";
import { setOwnStatusFormAction } from "@/app/panel-tarotista/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  TAROTISTA_STATUS_LABEL,
  TAROTISTA_STATUS_DESCRIPTION,
  TAROTISTA_STATUS_DOT_CLASS,
} from "@/lib/tarotista-status";
import type { TarotistaStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Mi disponibilidad", robots: { index: false } };

const STATUS_ORDER: TarotistaStatus[] = ["DISPONIBLE", "EN_CONSULTA", "EN_REPOSO", "DESCONECTADO"];

/**
 * Panel privado del tarotista (Fase 4) — pensado mobile-first: botones
 * grandes, un toque para cambiar de estado, sin pasos intermedios. El
 * acceso está protegido por sesión (ver proxy.ts) y, dentro de la página,
 * por tener un perfil de Tarotista vinculado a la cuenta (ver
 * server/tarotista-panel.ts::getOwnTarotista() — genérico, sirve para
 * cualquier tarotista futuro sin tocar código).
 */
export default async function PanelTarotistaPage() {
  const tarotista = await getOwnTarotista();

  if (!tarotista) {
    return (
      <section className="py-[88px]">
        <div className="container mx-auto max-w-[1180px] px-7">
          <GlassCard className="mx-auto max-w-lg text-center">
            <span className="eyebrow justify-center">Panel del tarotista</span>
            <h1 className="mt-3">Tu cuenta no tiene un perfil vinculado</h1>
            <p className="mb-0 text-sm text-bone-dim">
              Pide al administrador que vincule tu perfil de tarotista a esta cuenta desde{" "}
              <span className="text-bone">Panel admin → Tarotistas</span>.
            </p>
          </GlassCard>
        </div>
      </section>
    );
  }

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[560px] px-7">
        <div className="mb-8 text-center">
          <span className="eyebrow justify-center">Mi disponibilidad</span>
          <h1 className="mt-3">{tarotista.name}</h1>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-bone-dim">
            <span
              className={`h-2 w-2 rounded-full ${TAROTISTA_STATUS_DOT_CLASS[tarotista.status]}`}
              aria-hidden="true"
            />
            Estado actual: {TAROTISTA_STATUS_LABEL[tarotista.status]}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STATUS_ORDER.map((status) => {
            const active = tarotista.status === status;
            return (
              <form key={status} action={setOwnStatusFormAction.bind(null, status)}>
                <button
                  type="submit"
                  disabled={active}
                  className={`flex w-full flex-col items-center gap-2 rounded-2xl border px-5 py-6 text-center transition-all disabled:cursor-default
                    ${active
                      ? "border-gold/40 bg-gold/[0.12] shadow-[0_0_24px_rgba(232,163,61,0.18)]"
                      : "border-white/10 bg-white/[0.03] hover:border-gold/25 hover:bg-gold/[0.06]"}`}
                >
                  <span
                    className={`h-4 w-4 rounded-full ${TAROTISTA_STATUS_DOT_CLASS[status]}`}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-sm uppercase tracking-[0.1em] text-bone">
                    {TAROTISTA_STATUS_LABEL[status]}
                  </span>
                  <span className="mb-0 text-xs text-ash">{TAROTISTA_STATUS_DESCRIPTION[status]}</span>
                  {active ? <span className="text-[11px] text-gold-soft">Estado actual</span> : null}
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </section>
  );
}
