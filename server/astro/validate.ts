import { NOMBRE_PUNTO, NOMBRE_SIGNO, normalizarTexto } from "@/lib/astro/nombres";
import type { CartaNatal, Punto, Signo } from "@/lib/astro/types";

/**
 * Validación anti-invento (Fase 3): el texto que redacta la IA no puede contradecir la
 * carta calculada. Es una revisión simple por patrones de frase ("Venus en Libra",
 * "Marte en la casa 4", "casa 7 en Piscis", "Mercurio retrógrado"); no entiende todo
 * lo que se pueda escribir, así que sirve para ATRAPAR errores evidentes y mostrarlos
 * como avisos al revisar el informe, no como garantía. No bloquea nada.
 */

const PUNTOS = Object.keys(NOMBRE_PUNTO) as Punto[];
const SIGNOS = Object.keys(NOMBRE_SIGNO) as Signo[];
const PLANETAS: Punto[] = ["mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton"];

const porNombre = <T extends string>(nombres: Record<T, string>) =>
  new Map((Object.keys(nombres) as T[]).map((k) => [normalizarTexto(nombres[k]), k]));

const PUNTO_POR_NOMBRE = porNombre(NOMBRE_PUNTO);
const SIGNO_POR_NOMBRE = porNombre(NOMBRE_SIGNO);

const alternativas = (nombres: string[]) =>
  nombres.map(normalizarTexto).sort((a, b) => b.length - a.length).join("|");
const RE_PUNTOS = alternativas(PUNTOS.map((p) => NOMBRE_PUNTO[p]));
const RE_PLANETAS = alternativas(PLANETAS.map((p) => NOMBRE_PUNTO[p]));
const RE_SIGNOS = alternativas(SIGNOS.map((s) => NOMBRE_SIGNO[s]));

const SIGNO_EN = new RegExp(`\\b(${RE_PUNTOS})\\s+(?:esta\\s+)?en\\s+(?:el\\s+signo\\s+de\\s+)?(${RE_SIGNOS})\\b`, "g");
const CASA_EN = new RegExp(`\\b(${RE_PUNTOS})\\s+(?:esta\\s+)?en\\s+(?:la\\s+)?casa\\s+(\\d{1,2})\\b`, "g");
const CUSPIDE_EN = new RegExp(`\\bcasa\\s+(\\d{1,2})\\s+(?:esta\\s+)?en\\s+(${RE_SIGNOS})\\b`, "g");
const RETROGRADO = new RegExp(`\\b(${RE_PLANETAS})\\s+retrograd[oa]\\b`, "g");

/** Temas que el informe nunca debe tratar como predicción (ver docs/carta-astral/02-contenido-informe.md). */
const TEMAS_SENSIBLES =
  /\b(muerte|morir|moriras|fallec\w*|enfermedad\w*|diagnostic\w*|tumor\w*|embaraz\w*|loteria|fortuna|riqueza garantizada|te haras rico)\b/g;

export function validarTexto(markdown: string, carta: CartaNatal): string[] {
  const texto = normalizarTexto(markdown);
  const avisos = new Set<string>();
  const punto = (p: Punto) => carta.puntos.find((x) => x.punto === p);
  const nombre = (p: Punto) => NOMBRE_PUNTO[p];

  for (const m of texto.matchAll(SIGNO_EN)) {
    const p = PUNTO_POR_NOMBRE.get(m[1])!;
    const dicho = SIGNO_POR_NOMBRE.get(m[2])!;
    const real = punto(p);
    if (!real) {
      avisos.add(`Menciona "${nombre(p)} en ${NOMBRE_SIGNO[dicho]}", pero ese punto no existe en esta carta (¿hora desconocida?).`);
    } else if (real.signo !== dicho) {
      avisos.add(`Dice "${nombre(p)} en ${NOMBRE_SIGNO[dicho]}", pero en la carta está en ${NOMBRE_SIGNO[real.signo]}.`);
    }
  }

  for (const m of texto.matchAll(CASA_EN)) {
    const p = PUNTO_POR_NOMBRE.get(m[1])!;
    const dicha = Number(m[2]);
    const real = punto(p);
    if (!real) {
      avisos.add(`Menciona "${nombre(p)} en la casa ${dicha}", pero ese punto no existe en esta carta.`);
    } else if (real.casa === null) {
      avisos.add(`Menciona "${nombre(p)} en la casa ${dicha}", pero esta carta no tiene casas (hora desconocida).`);
    } else if (real.casa !== dicha) {
      avisos.add(`Dice "${nombre(p)} en la casa ${dicha}", pero en la carta está en la casa ${real.casa}.`);
    }
  }

  for (const m of texto.matchAll(CUSPIDE_EN)) {
    const n = Number(m[1]);
    const dicho = SIGNO_POR_NOMBRE.get(m[2])!;
    const real = carta.casas[n - 1];
    if (n < 1 || n > 12) {
      avisos.add(`Menciona la casa ${n}, que no existe.`);
    } else if (!real) {
      avisos.add(`Menciona "casa ${n} en ${NOMBRE_SIGNO[dicho]}", pero esta carta no tiene casas (hora desconocida).`);
    } else if (real.signo !== dicho) {
      avisos.add(`Dice "casa ${n} en ${NOMBRE_SIGNO[dicho]}", pero la cúspide de la casa ${n} está en ${NOMBRE_SIGNO[real.signo]}.`);
    }
  }

  for (const m of texto.matchAll(RETROGRADO)) {
    const p = PUNTO_POR_NOMBRE.get(m[1])!;
    if (punto(p)?.retrogrado === false) {
      avisos.add(`Dice "${nombre(p)} retrógrado", pero en esta carta está directo.`);
    }
  }

  for (const m of texto.matchAll(TEMAS_SENSIBLES)) {
    avisos.add(`Tema sensible: aparece "${m[1]}". Revisa que no sea una predicción de salud, muerte, embarazo o dinero.`);
  }

  return [...avisos];
}
