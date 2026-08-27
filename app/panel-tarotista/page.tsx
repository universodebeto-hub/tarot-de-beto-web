import type { Metadata } from "next";
import Link from "next/link";
import {
  getOwnTarotista,
  getOwnAttentionRequests,
  getOwnConfirmedConsultations,
} from "@/server/tarotista-panel";
import { setOwnStatusFormAction, setOwnRequestStatusFormAction } from "@/app/panel-tarotista/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { PanelClientTools } from "@/components/tarotistas/PanelClientTools";
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
const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONTACTED: "Contactada",
  DISMISSED: "Descartada",
};

export default async function PanelTarotistaPage() {
  const tarotista = await getOwnTarotista();
  const requests = tarotista ? await getOwnAttentionRequests() : [];
  const consultations = tarotista ? await getOwnConfirmedConsultations() : [];

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

        <PanelClientTools vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />

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

        <div className="mt-10">
          <span className="eyebrow mb-3">Consultas confirmadas</span>
          {consultations.length === 0 ? (
            <p className="text-sm text-bone-dim">No tienes consultas confirmadas por ahora.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {consultations.map((c) => (
                <GlassCard key={c.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="mb-0.5 flex items-center gap-2 text-bone">
                      {c.user ? `${c.user.firstName} ${c.user.lastName ?? ""}` : c.guestName}
                      {c.unreadCount > 0 ? (
                        <span
                          className="rounded-full bg-gold px-2 py-0.5 font-mono text-[10px] font-semibold"
                          style={{ color: "#1a0f05" }}
                        >
                          {c.unreadCount} mensaje{c.unreadCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </p>
                    <p className="mb-0 text-xs text-ash">
                      {c.service.name} · #{c.bookingNumber}
                    </p>
                  </div>
                  <Link href={`/reservas/${c.id}/llamada`} className="btn btn-gold">
                    Unirse a la llamada
                  </Link>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <span className="eyebrow mb-3">Solicitudes de atención</span>
          {requests.length === 0 ? (
            <p className="text-sm text-bone-dim">Todavía no tienes solicitudes.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((r) => (
                <GlassCard key={r.id} className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-bone">{r.name}</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-wide text-ash">
                      {REQUEST_STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.service ? <p className="mb-0 text-xs text-ash">{r.service.name}</p> : null}
                  {r.email ? <p className="mb-0 text-bone-dim">{r.email}</p> : null}
                  {r.phone ? <p className="mb-0 text-bone-dim">{r.phone}</p> : null}
                  {r.preferredTime ? (
                    <p className="mb-0 text-bone-dim">Preferencia: {r.preferredTime}</p>
                  ) : null}
                  {r.message ? <p className="mb-0 text-bone-dim">{r.message}</p> : null}
                  {r.status === "PENDING" ? (
                    <div className="mt-2 flex gap-2">
                      <form action={setOwnRequestStatusFormAction.bind(null, r.id, "CONTACTED")}>
                        <button type="submit" className="btn btn-ghost">
                          Marcar contactada
                        </button>
                      </form>
                      <form action={setOwnRequestStatusFormAction.bind(null, r.id, "DISMISSED")}>
                        <button type="submit" className="btn btn-ghost">
                          Descartar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
