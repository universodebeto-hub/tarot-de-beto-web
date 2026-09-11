"use client";

import { useTransition } from "react";
import { connectTikTokAction, disconnectTikTokAction } from "@/app/admin/configuracion/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { TrashIcon } from "@/components/ui/icons";

interface Props {
  connected: boolean;
  profile: { displayName: string; avatarUrl: string; followerCount: number } | null;
  notice?: string;
  noticeError?: string;
}

/** Conectar/desconectar la cuenta de TikTok que alimenta la sección "Seguinos" de la home (ver server/tiktok.ts). */
export function TikTokConnectionPanel({ connected, profile, notice, noticeError }: Props) {
  const [pending, startTransition] = useTransition();

  function handleConnect() {
    startTransition(async () => {
      await connectTikTokAction();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="mb-0 text-sm text-bone-dim">
        Conectá tu cuenta de TikTok una sola vez para que la home muestre tu foto, tus seguidores y tus últimos
        videos -- se actualiza solo, sin que tengas que volver a tocar esto.
      </p>

      {notice ? <p className="mb-0 text-sm text-emerald">{notice}</p> : null}
      {noticeError ? <p className="mb-0 text-sm text-ember">{noticeError}</p> : null}

      {connected ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-obsidian/40 p-4">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto externa de TikTok, no vale la pena pasarla por next/image para esto.
            <img src={profile.avatarUrl} alt={profile.displayName} className="h-14 w-14 rounded-full object-cover" />
          ) : null}
          <div className="flex-1">
            <p className="mb-0 text-bone">{profile?.displayName ?? "Cuenta conectada"}</p>
            {profile ? <p className="mb-0 text-xs text-ash">{profile.followerCount.toLocaleString("es")} seguidores</p> : null}
          </div>
          <ConfirmActionButton
            label="Desconectar"
            icon={<TrashIcon className="h-4 w-4" />}
            pendingLabel="Desconectando…"
            tone="danger"
            confirmLabel="Sí, desconectar"
            confirmMessage={`¿Desconectar TikTok? La sección "Seguinos" de la home deja de mostrarse hasta que vuelvas a conectar.`}
            action={disconnectTikTokAction}
            className="flex items-center gap-2 rounded-md border border-ember/30 px-3 py-2 text-xs uppercase tracking-wide text-ember hover:border-ember hover:bg-ember/10"
          />
        </div>
      ) : (
        <button type="button" onClick={handleConnect} disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
          {pending ? "Conectando…" : "Conectar TikTok"}
        </button>
      )}
    </div>
  );
}
