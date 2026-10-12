import type { Elemento, Punto, Signo, TipoAspecto } from "./types";

/**
 * Glifos astrológicos (Unicode). En el PDF se dibujan con DejaVu Sans, que trae todos;
 * las fuentes de la marca no los incluyen.
 */

export const SIMBOLO_SIGNO: Record<Signo, string> = {
  aries: "♈",
  tauro: "♉",
  geminis: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  escorpio: "♏",
  sagitario: "♐",
  capricornio: "♑",
  acuario: "♒",
  piscis: "♓",
};

/** Los ángulos (Ascendente y Medio Cielo) se escriben con sus siglas, no tienen glifo. */
export const SIMBOLO_PUNTO: Record<Punto, string> = {
  sol: "☉",
  luna: "☽",
  mercurio: "☿",
  venus: "♀",
  marte: "♂",
  jupiter: "♃",
  saturno: "♄",
  urano: "♅",
  neptuno: "♆",
  pluton: "♇",
  quiron: "⚷",
  nodoNorte: "☊",
  nodoSur: "☋",
  ascendente: "AC",
  medioCielo: "MC",
};

export const SIGLAS_ANGULO: ReadonlySet<Punto> = new Set(["ascendente", "medioCielo"]);

/** Colores de los aspectos: armónicos en verdes, tensos en rojos, la conjunción en dorado. */
export const COLOR_ASPECTO: Record<TipoAspecto, string> = {
  conjuncion: "#b7791f",
  sextil: "#2f8f83",
  trigono: "#3a8a4f",
  cuadratura: "#c6642a",
  oposicion: "#b3382c",
};

/** Tinte de cada elemento sobre el anillo de signos de la rueda. */
export const COLOR_ELEMENTO: Record<Elemento, string> = {
  fuego: "#c6642a",
  tierra: "#9a6a14",
  aire: "#6f7f93",
  agua: "#4a6f94",
};
