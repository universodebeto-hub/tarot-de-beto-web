import type { Metadata } from "next";
import { listTarotistasAdmin } from "@/server/admin/tarotistas";
import { unlinkTarotistaAccountFormAction } from "@/app/admin/tarotistas/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { SummaryBar } from "@/components/admin/SummaryBar";
import { LinkTarotistaForm } from "@/components/admin/LinkTarotistaForm";
import { CreateTarotistaForm } from "@/components/admin/CreateTarotistaForm";
import { TAROTISTA_STATUS_LABEL } from "@/lib/tarotista-status";
import { TAROTISTA_STATUS_TONE } from "@/lib/status-tone";

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
      <SummaryBar
        stats={[
          { label: "Tarotistas", value: tarotistas.length },
          { label: "Vinculados", value: tarotistas.filter((t) => t.user).length, tone: "success" },
          { label: "Sin vincular", value: tarotistas.filter((t) => !t.user).length, tone: "warning" },
        ]}
      />

      <GlassCard>
        <p className="mb-0 text-sm text-bone-dim">
          Vincula cada perfil a la cuenta de la persona que lo va a manejar — con eso ya puede entrar a{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/panel-tarotista</code> y cambiar su
          propio estado. La persona debe tener una cuenta creada primero (Iniciar sesión → Crear cuenta).
        </p>
      </GlassCard>

      <GlassCard>
        <CreateTarotistaForm />
      </GlassCard>

      {tarotistas.map((t) => (
        <GlassCard key={t.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="mb-0">{t.name}</h3>
              <StatusBadge label={TAROTISTA_STATUS_LABEL[t.status]} tone={TAROTISTA_STATUS_TONE[t.status]} />
            </div>
          </div>

          {t.user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
              <p className="mb-0 text-bone-dim">
                Vinculado a <span className="text-bone">{t.user.email}</span>
              </p>
              <ConfirmActionButton
                label="Desvincular"
                pendingLabel="Desvinculando…"
                confirmLabel="Sí, desvincular"
                confirmMessage={`¿Desvincular la cuenta de ${t.user.email} del perfil de ${t.name}? Va a perder acceso a /panel-tarotista hasta que se vuelva a vincular.`}
                action={unlinkTarotistaAccountFormAction.bind(null, t.id)}
                className="btn btn-ghost"
              />
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
