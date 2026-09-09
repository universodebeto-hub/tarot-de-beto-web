"use client";

/** Abre el diálogo de impresión del navegador -- desde ahí se puede imprimir en papel o "Guardar como PDF". Ver .print-area/.no-print en app/globals.css. */
export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost no-print">
      {label}
    </button>
  );
}
