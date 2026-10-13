"use client";

import { useState } from "react";
import { corregirLugarAction } from "@/app/admin/informes/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash";

interface Props {
  informeId: string;
  ciudad: string;
  pais: string;
  region?: string;
  lat: number;
  lon: number;
  zonaHoraria: string;
}

/**
 * Corrige el lugar de nacimiento: volver a buscar la ciudad (con región) o poner coordenadas y zona
 * a mano. Recalcula la carta y descarta los textos ya redactados (dependen de la carta).
 */
export function CorregirLugar({ informeId, ciudad, pais, region, lat, lon, zonaHoraria }: Props) {
  const [modo, setModo] = useState<"buscar" | "manual">("buscar");
  const [b, setB] = useState({ ciudad, pais, region: region ?? "" });
  const [m, setM] = useState({ lat: String(lat), lon: String(lon), zona: zonaHoraria });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="tablist" aria-label="Cómo corregir el lugar">
        {(["buscar", "manual"] as const).map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={modo === x}
            onClick={() => setModo(x)}
            className={`btn ${modo === x ? "btn-gold" : "btn-ghost"}`}
          >
            {x === "buscar" ? "Buscar de nuevo" : "Coordenadas a mano"}
          </button>
        ))}
      </div>

      {modo === "buscar" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="lugar-ciudad">Ciudad</label>
            <input id="lugar-ciudad" className={inputClass} value={b.ciudad} onChange={(e) => setB({ ...b, ciudad: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="lugar-region">Estado / departamento</label>
            <input id="lugar-region" className={inputClass} value={b.region} onChange={(e) => setB({ ...b, region: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="lugar-pais">País</label>
            <input id="lugar-pais" className={inputClass} value={b.pais} onChange={(e) => setB({ ...b, pais: e.target.value })} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="lugar-lat">Latitud (−90 a 90)</label>
            <input id="lugar-lat" inputMode="decimal" className={inputClass} value={m.lat} onChange={(e) => setM({ ...m, lat: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="lugar-lon">Longitud (−180 a 180)</label>
            <input id="lugar-lon" inputMode="decimal" className={inputClass} value={m.lon} onChange={(e) => setM({ ...m, lon: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="lugar-zona">Zona horaria</label>
            <input id="lugar-zona" className={inputClass} value={m.zona} onChange={(e) => setM({ ...m, zona: e.target.value })} placeholder="America/Bogota" />
          </div>
        </div>
      )}

      {error ? <p className="mb-0 text-sm text-ember" role="alert">{error}</p> : null}

      <ConfirmActionButton
        label="Recalcular la carta"
        pendingLabel="Recalculando…"
        confirmMessage={
          <>
            Se recalculará la carta con este lugar y <strong>se borrarán los textos ya redactados</strong>: habrá que generarlos de nuevo.
          </>
        }
        confirmLabel="Recalcular"
        className="btn btn-ghost self-start"
        action={() =>
          corregirLugarAction(
            informeId,
            modo === "buscar"
              ? { ciudad: b.ciudad, pais: b.pais, region: b.region }
              : { lat: Number(m.lat.replace(",", ".")), lon: Number(m.lon.replace(",", ".")), zonaHoraria: m.zona.trim() },
          )
        }
        onSettled={(r) => setError(r.error ?? null)}
      />
    </div>
  );
}
