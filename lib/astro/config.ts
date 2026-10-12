import type { Elemento, Modalidad, Signo, TipoAspecto } from "./types";

/**
 * Configuración astrológica por defecto (aprobada el 2026-10-12, ver
 * docs/carta-astral/01-especificacion.md): zodíaco tropical, casas Placidus,
 * nodos verdaderos, aspectos mayores con estos orbes.
 */

export const SIGNOS: readonly Signo[] = [
  "aries", "tauro", "geminis", "cancer", "leo", "virgo",
  "libra", "escorpio", "sagitario", "capricornio", "acuario", "piscis",
];

export const ELEMENTO_DE_SIGNO: Record<Signo, Elemento> = {
  aries: "fuego", leo: "fuego", sagitario: "fuego",
  tauro: "tierra", virgo: "tierra", capricornio: "tierra",
  geminis: "aire", libra: "aire", acuario: "aire",
  cancer: "agua", escorpio: "agua", piscis: "agua",
};

export const MODALIDAD_DE_SIGNO: Record<Signo, Modalidad> = {
  aries: "cardinal", cancer: "cardinal", libra: "cardinal", capricornio: "cardinal",
  tauro: "fija", leo: "fija", escorpio: "fija", acuario: "fija",
  geminis: "mutable", virgo: "mutable", sagitario: "mutable", piscis: "mutable",
};

export interface DefinicionAspecto {
  tipo: TipoAspecto;
  /** Ángulo exacto entre los dos puntos, en grados. */
  angulo: number;
  /** Orbe máximo en grados. */
  orbe: number;
}

export const ASPECTOS_MAYORES: readonly DefinicionAspecto[] = [
  { tipo: "conjuncion", angulo: 0, orbe: 8 },
  { tipo: "sextil", angulo: 60, orbe: 5 },
  { tipo: "cuadratura", angulo: 90, orbe: 7 },
  { tipo: "trigono", angulo: 120, orbe: 7 },
  { tipo: "oposicion", angulo: 180, orbe: 8 },
];

/** Grados extra de orbe cuando uno de los dos puntos es el Sol o la Luna. */
export const ORBE_EXTRA_LUMINARES = 2;

/** Más allá de esta latitud (absoluta) Placidus no se puede calcular: se usan Signos Enteros. */
export const LATITUD_MAXIMA_PLACIDUS = 66;

/** Antes de este año los husos horarios históricos son poco confiables (hora solar local, etc.). */
export const ANIO_HORA_POCO_CONFIABLE = 1930;
