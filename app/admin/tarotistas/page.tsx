import type { Metadata } from "next";
import { listTarotistasAdmin } from "@/server/admin/tarotistas";
import { unlinkTarotistaAccountFormAction } from "@/app/admin/tarotistas/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { LinkTarotistaForm } from "@/components/admin/LinkTarotistaForm";
import { TAROTISTA_STATUS_LABEL, TAROTISTA_STATUS_DOT_CLASS } from "@/lib/tarotista-status";

export const metadata: Metadata = { title: "Panel — Tarotistas", robots: { index: false } };

/**
 * Vincula cada perfil de Tarotista a una cuenta de acceso — es lo único que
 * un tarotista nuevo necesita antes de poder usar /panel-tarotista. La
 * gestión más completa (crear perfil nuevo, editar foto/bio/servicios) es
 * la Fase 6; esta pantalla mínima solo desbloquea la Fase 4.
 */
export default async function AdminTarotistasPage() {
  const tarotistas = await listTarotistasAdmin();

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <p className="mb-0 text-sm text-bone-dim">
          Vincula cada perfil a la cuenta de la persona que lo va a manejar — con eso ya puede entrar a{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/panel-tarotista</code> y cambiar su
          propio estado. La persona debe tener una cuenta creada primero (Iniciar sesión → Crear cuenta).
        </p>
      </GlassCard>

      {tarotistas.map((t) => (
        <GlassCard key={t.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="mb-1">{t.name}</h3>
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-bone-dim">
                <span className={`h-2 w-2 rounded-full ${TAROTISTA_STATUS_DOT_CLASS[t.status]}`} aria-hidden="true" />
                {TAROTISTA_STATUS_LABEL[t.status]}
              </span>
            </div>
          </div>

          {t.user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
              <p className="mb-0 text-bone-dim">
                Vinculado a <span className="text-bone">{t.user.email}</span>
              </p>
              <form action={unlinkTarotistaAccountFormAction.bind(null, t.id)}>
                <button type="submit" className="btn btn-ghost">
                  Desvincular
                </button>
              </form>
            </div>
          ) : (
            <div className="border-t border-white/10 pt-3">
              <LinkTarotistaForm tarotistaId={t.id} />
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}
