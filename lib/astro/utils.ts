import {
  ASPECTOS_MAYORES,
  ELEMENTO_DE_SIGNO,
  MODALIDAD_DE_SIGNO,
  ORBE_EXTRA_LUMINARES,
  SIGNOS,
} from "./config";
import type { Aspecto, Cuspide, Elemento, Modalidad, Punto, PosicionPunto, Signo } from "./types";

/** Lleva cualquier ángulo al rango [0, 360). */
export function normalizar360(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

export function signoDeLongitud(longitud: number): Signo {
  return SIGNOS[Math.floor(normalizar360(longitud) / 30)];
}

/** Grado dentro del signo, 0 a 30 (sin incluir 30). */
export function gradoEnSigno(longitud: number): number {
  return normalizar360(longitud) % 30;
}

/** Casa (1–12) en la que cae una longitud, dada la lista de cúspides en orden de casa. */
export function casaDeLongitud(longitud: number, cuspides: readonly Cuspide[]): number {
  const lon = normalizar360(longitud);
  for (let i = 0; i < 12; i++) {
    const inicio = cuspides[i].longitud;
    const fin = cuspides[(i + 1) % 12].longitud;
    const ancho = normalizar360(fin - inicio);
    if (normalizar360(lon - inicio) < ancho) return i + 1;
  }
  return 12;
}

/** Nombre de la fase lunar según la elongación Luna − Sol. */
export function faseLunarDeElongacion(solLongitud: number, lunaLongitud: number): string {
  const e = normalizar360(lunaLongitud - solLongitud);
  if (e < 22.5 || e >= 337.5) return "Luna nueva";
  if (e < 67.5) return "Luna creciente";
  if (e < 112.5) return "Cuarto creciente";
  if (e < 157.5) return "Gibosa creciente";
  if (e < 202.5) return "Luna llena";
  if (e < 247.5) return "Gibosa menguante";
  if (e < 292.5) return "Cuarto menguante";
  return "Luna menguante";
}

/** Punto con la velocidad diaria (grados/día) que hace falta para saber si un aspecto es aplicativo. */
export interface PuntoConVelocidad {
  punto: Punto;
  longitud: number;
  velocidad: number;
}

const ES_ANGULO: ReadonlySet<Punto> = new Set(["ascendente", "medioCielo"]);
const ES_LUMINAR: ReadonlySet<Punto> = new Set(["sol", "luna"]);

/**
 * Aspectos mayores entre todos los pares de puntos. Excluye el Nodo Sur (siempre
 * opuesto al Norte, sería redundante) y los pares de ángulos entre sí
 * (Ascendente–Medio Cielo). Ordenados del más exacto al menos exacto.
 */
export function calcularAspectos(puntos: readonly PuntoConVelocidad[]): Aspecto[] {
  const candidatos = puntos.filter((p) => p.punto !== "nodoSur");
  const resultado: Aspecto[] = [];

  for (let i = 0; i < candidatos.length; i++) {
    for (let j = i + 1; j < candidatos.length; j++) {
      const a = candidatos[i];
      const b = candidatos[j];
      if (ES_ANGULO.has(a.punto) && ES_ANGULO.has(b.punto)) continue;

      // d: separación de A a B en [0, 360); la distancia angular real es min(d, 360 - d).
      const d = normalizar360(b.longitud - a.longitud);
      const distancia = Math.min(d, 360 - d);
      const extra = ES_LUMINAR.has(a.punto) || ES_LUMINAR.has(b.punto) ? ORBE_EXTRA_LUMINARES : 0;

      for (const def of ASPECTOS_MAYORES) {
        const orbe = Math.abs(distancia - def.angulo);
        if (orbe > def.orbe + extra) continue;

        // Aplicativo: la distancia al aspecto exacto se está achicando.
        // Se mide sobre d (0–360) contra el exacto más cercano (0, 60, 90, 120, 180, 240, 270, 300, 360).
        const exactos = [0, 60, 90, 120, 180, 240, 270, 300, 360];
        const cercano = exactos.reduce((m, x) => (Math.abs(d - x) < Math.abs(d - m) ? x : m), exactos[0]);
        const diferencia = d - cercano;
        const ritmo = b.velocidad - a.velocidad;
        const aplicativo = Math.sign(diferencia) * ritmo < 0;

        resultado.push({ a: a.punto, b: b.punto, tipo: def.tipo, orbe: Math.round(orbe * 100) / 100, aplicativo });
        break;
      }
    }
  }

  return resultado.sort((x, y) => x.orbe - y.orbe);
}

const PUNTOS_PARA_BALANCE: ReadonlySet<Punto> = new Set([
  "sol", "luna", "mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton", "ascendente",
]);

/** Cuenta, uno por punto, los 10 planetas (Sol a Plutón) y el Ascendente (si se conoce) por elemento y modalidad. */
export function calcularBalance(puntos: readonly Pick<PosicionPunto, "punto" | "signo">[]): {
  elementos: Record<Elemento, number>;
  modalidades: Record<Modalidad, number>;
} {
  const elementos: Record<Elemento, number> = { fuego: 0, tierra: 0, aire: 0, agua: 0 };
  const modalidades: Record<Modalidad, number> = { cardinal: 0, fija: 0, mutable: 0 };
  for (const p of puntos) {
    if (!PUNTOS_PARA_BALANCE.has(p.punto)) continue;
    elementos[ELEMENTO_DE_SIGNO[p.signo]] += 1;
    modalidades[MODALIDAD_DE_SIGNO[p.signo]] += 1;
  }
  return { elementos, modalidades };
}
