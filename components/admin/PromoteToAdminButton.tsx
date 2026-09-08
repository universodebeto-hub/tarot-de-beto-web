"use client";

import { promoteToAdminAction } from "@/app/admin/clientes/[id]/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";

/** Da acceso total de administrador -- pide una confirmación explícita antes de mandar la acción, porque no hay forma de deshacerlo desde el panel. */
export function PromoteToAdminButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ConfirmActionButton
      label="Hacer administrador"
      pendingLabel="Procesando…"
      confirmLabel="Sí, dar acceso"
      confirmMessage={`¿Dar acceso total de administrador a ${name}? Va a poder ver y cambiar todo lo del panel, igual que vos.`}
      action={() => promoteToAdminAction(userId)}
      className="btn btn-ghost self-start disabled:opacity-60"
    />
  );
}
