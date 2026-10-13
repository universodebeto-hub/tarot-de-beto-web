"use client";

import { useState } from "react";

/** Vista previa del PDF dentro del panel (se arma al pedirla, tarda unos segundos) y descarga. */
export function VistaPreviaPdf({ informeId, puedeDescargar }: { informeId: string; puedeDescargar: boolean }) {
  const [ver, setVer] = useState(false);
  const base = `/api/admin/informes/${informeId}/pdf`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setVer((v) => !v)} className="btn btn-ghost">
          {ver ? "Ocultar vista previa" : "Ver vista previa del PDF"}
        </button>
        {puedeDescargar ? (
          <a href={`${base}?descargar=1`} className="btn btn-gold">
            Descargar PDF
          </a>
        ) : null}
        {ver ? (
          <a href={base} target="_blank" rel="noreferrer" className="btn btn-ghost">
            Abrir en pestaña nueva
          </a>
        ) : null}
      </div>
      {ver ? (
        <iframe
          title="Vista previa del informe en PDF"
          src={base}
          className="h-[80vh] w-full rounded-xl border border-white/10 bg-white"
        />
      ) : null}
      <p className="mb-0 text-xs text-ash">
        El PDF no se guarda en ningún sitio: se arma cada vez que lo abres o lo descargas, con los textos actuales.
      </p>
    </div>
  );
}
