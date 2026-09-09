"use client";

import { useState, type ReactNode } from "react";

/** Oculta contenido secundario (herramientas técnicas, poco usadas) detrás de un desplegable, para que el panel principal no compita visualmente con lo que sí se mira todos los días. */
export function CollapsibleSection({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-wide text-ash hover:text-bone-dim"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        {label}
      </button>
      {open ? <div className="flex flex-col gap-4">{children}</div> : null}
    </div>
  );
}
