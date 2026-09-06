"use client";

import { useState, useTransition } from "react";
import { promoteToAdminAction } from "@/app/admin/clientes/[id]/actions";

/** Da acceso total de administrador -- pide una confirmación explícita en el navegador antes de mandar la acción, porque no hay forma de deshacerlo desde el panel. */
export function PromoteToAdminButton({ userId, name }: { userId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `¿Dar acceso total de administrador a ${name}? Va a poder ver y cambiar todo lo del panel, igual que vos.`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await promoteToAdminAction(userId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleClick} disabled={pending} className="btn btn-ghost self-start disabled:opacity-60">
        {pending ? "Procesando…" : "Hacer administrador"}
      </button>
      {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
    </div>
  );
}
