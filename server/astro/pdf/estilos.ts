import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * Identidad visual del informe. La paleta sale de app/globals.css (obsidiana, dorado, hueso)
 * y las tipografías son las mismas de la web (Fraunces, Work Sans, Space Mono). Las páginas
 * interiores van sobre papel claro para que se pueda imprimir sin gastar tinta; solo la
 * portada es oscura, como la web.
 */

export const COLOR = {
  obsidiana: "#0b0a0c",
  carbon: "#17151a",
  ceniza: "#8a8590",
  cenizaOscura: "#57525c",
  oro: "#e8a33d",
  oroSuave: "#f0c47a",
  /** Dorado más profundo: el oro de la web no tiene contraste suficiente sobre papel claro. */
  oroProfundo: "#9a6a14",
  brasa: "#c6642a",
  hueso: "#f3efe8",
  papel: "#fbf8f2",
  tinta: "#1d1a21",
  tintaSuave: "#4a4550",
  linea: "#dccfb6",
  fondoSuave: "#f4eee2",
} as const;

export const FUENTE = {
  titulo: "Fraunces",
  texto: "WorkSans",
  etiqueta: "SpaceMono",
  firma: "GreatVibes",
  simbolos: "Simbolos",
} as const;

const RUTA_FUENTES = path.join(process.cwd(), "data", "astro", "fonts");
const archivo = (nombre: string) => path.join(RUTA_FUENTES, nombre);

let fuentesRegistradas = false;

export function registrarFuentes(): void {
  if (fuentesRegistradas) return;

  Font.register({
    family: FUENTE.titulo,
    fonts: [
      { src: archivo("fraunces-latin-400-normal.woff"), fontWeight: 400 },
      { src: archivo("fraunces-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: archivo("fraunces-latin-600-normal.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: FUENTE.texto,
    fonts: [
      { src: archivo("work-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: archivo("work-sans-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: archivo("work-sans-latin-600-normal.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: FUENTE.etiqueta,
    fonts: [
      { src: archivo("space-mono-latin-400-normal.woff"), fontWeight: 400 },
      { src: archivo("space-mono-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({ family: FUENTE.firma, src: archivo("great-vibes-latin-400-normal.woff") });
  Font.register({ family: FUENTE.simbolos, src: archivo("DejaVuSans.ttf") });

  // Sin guiones automáticos: el algoritmo de partición de palabras no conoce el español.
  Font.registerHyphenationCallback((palabra) => [palabra]);
  fuentesRegistradas = true;
}

export type NombreLogo = "emblem.png" | "logo-full.png";

/** Logo de la marca como imagen en memoria (así no depende de rutas ni de red al generar el PDF). */
export function leerLogo(nombre: NombreLogo): { data: Buffer; format: "png" } {
  return { data: readFileSync(path.join(process.cwd(), "public", "assets", "logo", nombre)), format: "png" };
}

/** Firma por defecto ("Alberto Arango", Qwigley azul) que viaja con el proyecto; la que se sube en el panel la reemplaza. */
export function leerFirmaPorDefecto(): Buffer {
  return readFileSync(path.join(process.cwd(), "data", "astro", "firma", "firma-alberto-arango.png"));
}
