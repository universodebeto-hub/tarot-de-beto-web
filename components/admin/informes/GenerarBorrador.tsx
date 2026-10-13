"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { avanzarInformeAction } from "@/app/admin/informes/actions";

const NOMBRE_PASO: Record<string, string> = {
  carta: "Carta calculada",
  triada: "Tu Gran Tríada",
  balance: "Balance de energías",
  personales: "Planetas personales",
  sociales: "Planetas sociales y generacionales",
  casas: "Las 12 casas",
  aspectos: "Aspectos principales",
  "nodos-quiron": "Nodos lunares y Quirón",
  sintesis: "Síntesis y consejos",
};

interface Props {
  informeId: string;
  /** Pasos que faltan al abrir la página (1 si aún no hay carta + secciones por redactar). */
  pasosPendientes: number;
  etiqueta: string;
}

/**
 * Avanza el informe de a UN paso por petición (carta, luego cada sección), mostrando el avance.
 * Así ninguna petición se acerca al límite de tiempo, y si algo falla se reintenta ese mismo paso.
 */
export function GenerarBorrador({ informeId, pasosPendientes, etiqueta }: Props) {
  const router = useRouter();
  const [corriendo, setCorriendo] = useState(false);
  const [hechos, setHechos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelar = useRef(false);

  async function generar() {
    setCorriendo(true);
    setError(null);
    setHechos([]);
    cancelar.current = false;
    try {
      for (let i = 0; i < 30 && !cancelar.current; i++) {
        const r = await avanzarInformeAction(informeId);
        if (r.error) {
          setError(r.error);
          break;
        }
        if (r.paso) setHechos((h) => [...h, NOMBRE_PASO[r.paso as string] ?? String(r.paso)]);
        if (!r.quedanPasos) break;
      }
    } catch {
      setError("Se cortó la conexión. Pulsa de nuevo para continuar donde quedó.");
    } finally {
      setCorriendo(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generar} disabled={corriendo} className="btn btn-gold disabled:opacity-40">
          {corriendo ? "Generando…" : etiqueta}
        </button>
        {corriendo ? (
          <button type="button" onClick={() => (cancelar.current = true)} className="btn btn-ghost">
            Detener después de este paso
          </button>
        ) : null}
        {!corriendo && pasosPendientes > 0 ? (
          <span className="text-sm text-bone-dim">
            Faltan {pasosPendientes} {pasosPendientes === 1 ? "paso" : "pasos"}.
          </span>
        ) : null}
      </div>
      {hechos.length > 0 ? (
        <ul className="mb-0 list-none space-y-1 p-0 text-sm text-bone-dim" aria-live="polite">
          {hechos.map((h, i) => (
            <li key={`${h}-${i}`}>✓ {h}</li>
          ))}
          {corriendo ? <li className="text-gold-soft">Trabajando en el siguiente paso…</li> : null}
        </ul>
      ) : null}
      {error ? (
        <p className="mb-0 text-sm text-ember" role="alert">
          {error} Puedes volver a pulsar el botón: sigue donde quedó.
        </p>
      ) : null}
    </div>
  );
}
