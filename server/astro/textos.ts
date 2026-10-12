import "server-only";
import ascendente from "@/data/astro/textos/ascendente.json";
import planetaEnSigno from "@/data/astro/textos/planeta-en-signo.json";
import type { Punto, Signo } from "@/lib/astro/types";

/**
 * Base de textos propia de la marca (data/astro/textos/*.json): la voz de Beto.
 * La IA la usa como inspiración y la combina con los datos de cada carta. Mientras
 * un archivo diga `"estado": "borrador"`, Beto todavía no lo revisó.
 */

export interface TextoBase {
  titulo: string;
  esencia: string;
  luz: string[];
  sombra: string[];
  consejo: string;
}

interface ArchivoTextos {
  estado: string;
  nota: string;
  entradas: Record<string, TextoBase>;
}

const PLANETA_EN_SIGNO = planetaEnSigno as ArchivoTextos;
const ASCENDENTE = ascendente as ArchivoTextos;

/** Texto base de un punto en un signo, o null si todavía no existe (se redacta solo con los datos de la carta). */
export function textoPlanetaEnSigno(punto: Punto, signo: Signo): TextoBase | null {
  return PLANETA_EN_SIGNO.entradas[`${punto}-${signo}`] ?? null;
}

export function textoAscendente(signo: Signo): TextoBase | null {
  return ASCENDENTE.entradas[signo] ?? null;
}

/** Estado de revisión de cada archivo de textos, para mostrarlo en el panel. */
export function estadoTextos(): Record<string, { estado: string; entradas: number }> {
  return {
    "planeta-en-signo": { estado: PLANETA_EN_SIGNO.estado, entradas: Object.keys(PLANETA_EN_SIGNO.entradas).length },
    ascendente: { estado: ASCENDENTE.estado, entradas: Object.keys(ASCENDENTE.entradas).length },
  };
}
