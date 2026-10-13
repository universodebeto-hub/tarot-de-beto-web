"use client";

import { useActionState } from "react";
import { guardarFirmaAction, quitarFirmaAction } from "@/app/admin/informes/actions";

/** Sube la imagen de la firma del informe. Se guarda en la base de datos privada, nunca en un almacenamiento público. */
export function FirmaInformeForm({ hayFirma }: { hayFirma: boolean }) {
  const [state, formAction, pending] = useActionState(guardarFirmaAction, {} as { error?: string; success?: boolean });

  return (
    <div className="flex flex-col gap-3">
      <p className="mb-0 text-sm text-bone-dim">
        {hayFirma
          ? "Hay una firma subida: reemplaza a la de siempre y aparece al final de cada informe."
          : "Los informes llevan la firma «Alberto Arango» que viene con el proyecto. Puedes subir otra si quieres cambiarla."}
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="firma-png" className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
            Imagen PNG con fondo transparente (máx. 300 KB)
          </label>
          <input id="firma-png" name="firma" type="file" accept="image/png" required className="text-sm text-bone-dim" />
        </div>
        <button type="submit" disabled={pending} className="btn btn-ghost">
          {pending ? "Subiendo…" : hayFirma ? "Reemplazar firma" : "Subir otra firma"}
        </button>
      </form>
      {hayFirma ? (
        <form action={quitarFirmaAction}>
          <button type="submit" className="btn btn-ghost text-ember">
            Volver a la firma de siempre
          </button>
        </form>
      ) : null}
      {state.error ? <p className="mb-0 text-sm text-ember" role="alert">{state.error}</p> : null}
      {state.success ? <p className="mb-0 text-sm text-emerald" role="status">Firma guardada.</p> : null}
    </div>
  );
}
