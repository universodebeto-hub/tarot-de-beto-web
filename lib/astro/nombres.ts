import type { Punto, Signo, TipoAspecto } from "./types";

/** Nombres para mostrar (en español, con tildes) de signos, puntos y aspectos. */

export const NOMBRE_SIGNO: Record<Signo, string> = {
  aries: "Aries",
  tauro: "Tauro",
  geminis: "Géminis",
  cancer: "Cáncer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  escorpio: "Escorpio",
  sagitario: "Sagitario",
  capricornio: "Capricornio",
  acuario: "Acuario",
  piscis: "Piscis",
};

export const NOMBRE_PUNTO: Record<Punto, string> = {
  sol: "Sol",
  luna: "Luna",
  mercurio: "Mercurio",
  venus: "Venus",
  marte: "Marte",
  jupiter: "Júpiter",
  saturno: "Saturno",
  urano: "Urano",
  neptuno: "Neptuno",
  pluton: "Plutón",
  quiron: "Quirón",
  nodoNorte: "Nodo Norte",
  nodoSur: "Nodo Sur",
  ascendente: "Ascendente",
  medioCielo: "Medio Cielo",
};

export const NOMBRE_ASPECTO: Record<TipoAspecto, string> = {
  conjuncion: "conjunción",
  sextil: "sextil",
  cuadratura: "cuadratura",
  trigono: "trígono",
  oposicion: "oposición",
};

/** Minúsculas y sin tildes, para comparar texto escrito por una persona o por la IA. */
export function normalizarTexto(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
