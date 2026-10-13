import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ELEMENTO_DE_SIGNO, MODALIDAD_DE_SIGNO } from "@/lib/astro/config";
import { NOMBRE_ASPECTO, NOMBRE_PUNTO, NOMBRE_SIGNO } from "@/lib/astro/nombres";
import type { CartaNatal, PosicionPunto, Punto } from "@/lib/astro/types";
import { textoAscendente, textoPlanetaEnSigno, type TextoBase } from "./textos";
import { validarTexto } from "./validate";

/**
 * Redacción del informe (Fase 3). Modelo híbrido (docs/carta-astral/03-interpretaciones.md):
 * la carta ya viene calculada por el motor y los textos base son la voz de la marca; la IA
 * solo los combina en prosa. Una llamada por sección, así se puede regenerar una sola.
 *
 * PRIVACIDAD: a la IA solo le llegan posiciones ya calculadas (signo, grado, casa, aspectos).
 * Nunca el nombre, la fecha, la hora, el lugar ni las coordenadas de la persona.
 */

export type SeccionId =
  | "triada"
  | "balance"
  | "personales"
  | "sociales"
  | "casas"
  | "aspectos"
  | "nodos-quiron"
  | "sintesis";

export interface DefinicionSeccion {
  id: SeccionId;
  titulo: string;
  /** Extensión objetivo, en palabras. */
  palabras: string;
  /** Se omite si no hay casas (hora desconocida). */
  requiereHora: boolean;
  instrucciones: string;
}

export const SECCIONES: readonly DefinicionSeccion[] = [
  {
    id: "triada",
    titulo: "Tu Gran Tríada",
    palabras: "500 a 700",
    requiereHora: false,
    instrucciones:
      "Presenta el Sol (tu esencia), la Luna (tus emociones) y el Ascendente (cómo te ven; omítelo si no aparece en los datos) y cierra explicando cómo se combinan entre sí (elementos, modalidades y fase lunar si aportan).",
  },
  {
    id: "balance",
    titulo: "Balance de energías",
    palabras: "250 a 350",
    requiereHora: false,
    instrucciones:
      "Explica qué elementos y modalidades abundan o faltan, según las lecturas ya calculadas en los datos (no recalcules los conteos), y qué significa eso para la persona en el día a día.",
  },
  {
    id: "personales",
    titulo: "Planetas personales",
    palabras: "500 a 700",
    requiereHora: false,
    instrucciones:
      "Interpreta Mercurio (mente y comunicación), Venus (amor y valores) y Marte (acción y deseo): para cada uno su signo, su casa si existe y si está retrógrado.",
  },
  {
    id: "sociales",
    titulo: "Planetas sociales y generacionales",
    palabras: "450 a 600",
    requiereHora: false,
    instrucciones:
      "Desarrolla Júpiter (crecimiento) y Saturno (responsabilidad) con más detalle. Urano, Neptuno y Plutón van en breve, como influencias generacionales, centrándote en la casa donde caen si existe.",
  },
  {
    id: "casas",
    titulo: "Las 12 casas",
    palabras: "800 a 1100",
    requiereHora: true,
    instrucciones:
      "Recorre las 12 casas en orden: el área de vida que representa, el signo de su cúspide y los planetas que contiene. Las casas sin planetas se describen brevemente por el signo de su cúspide.",
  },
  {
    id: "aspectos",
    titulo: "Aspectos principales",
    palabras: "500 a 800",
    requiereHora: false,
    instrucciones:
      "Interpreta los aspectos listados (ya ordenados del más exacto al menos exacto). Explica el orbe como intensidad (menor orbe, aspecto más marcado) y si es aplicativo (se está formando) o separativo (ya pasó el punto exacto).",
  },
  {
    id: "nodos-quiron",
    titulo: "Nodos lunares y Quirón",
    palabras: "350 a 500",
    requiereHora: false,
    instrucciones:
      "Interpreta el Nodo Norte (hacia dónde crecer), el Nodo Sur (talentos que ya traes) y Quirón (la herida que, al sanarse, se convierte en don), con su signo y casa si existe.",
  },
  {
    id: "sintesis",
    titulo: "Síntesis y consejos",
    palabras: "350 a 500",
    requiereHora: false,
    instrucciones:
      "Resume las fortalezas y los retos principales de la carta, conectando los factores más importantes (tríada, balance y aspectos más exactos). Presenta los retos como oportunidades de crecimiento. Cierra con exactamente 5 consejos prácticos, numerados.",
  },
];

const DEFINICIONES = new Map(SECCIONES.map((s) => [s.id, s]));

export const PROMPT_SISTEMA = `Eres el redactor de informes de carta astral natal de «Universo de Beto» (Tarot de Beto). Escribes en español neutro, en segunda persona («tú»), con un tono cálido, cercano y de autoconocimiento.

REGLAS:
1. La carta ya está calculada. Usa EXCLUSIVAMENTE los datos del bloque DATOS. Nunca calcules ni supongas posiciones; si un dato no aparece (por ejemplo el Ascendente o una casa), no lo menciones como si existiera.
2. Cada vez que cites una posición («Venus en Libra», «Marte en la casa 4») debe coincidir exactamente con los datos.
3. No recibes ni debes inventar nombres, fechas ni lugares de la persona.
4. Nada de predicciones sobre salud, muerte, embarazos ni dinero garantizado, ni afirmaciones médicas, legales o financieras. Presenta los retos como oportunidades de crecimiento, sin fatalismo.
5. Los textos base son la voz de la marca: intégralos con tus propias palabras, combinándolos con los demás factores de la carta. No los copies literalmente ni repitas la misma estructura en cada párrafo.
6. Formato Markdown: sin título principal (el título de la sección lo pone el sistema), subtítulos con ###, párrafos de 3 a 5 líneas, sin emojis.
7. Si la hora de nacimiento es aproximada, di en una frase que el Ascendente y las casas pueden variar. Si es desconocida, explica en una frase que sin la hora no se calculan el Ascendente ni las casas.
8. Responde solo con el texto de la sección, sin comentarios sobre tu trabajo.`;

const redondear = (n: number, decimales = 1) => {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
};

function puntoParaIA(p: PosicionPunto) {
  return {
    punto: NOMBRE_PUNTO[p.punto],
    signo: NOMBRE_SIGNO[p.signo],
    grado: redondear(p.grado),
    casa: p.casa,
    retrogrado: p.retrogrado,
    elemento: ELEMENTO_DE_SIGNO[p.signo],
    modalidad: MODALIDAD_DE_SIGNO[p.signo],
  };
}

function puntos(carta: CartaNatal, ...ids: Punto[]): PosicionPunto[] {
  return ids.map((id) => carta.puntos.find((p) => p.punto === id)).filter((p): p is PosicionPunto => p !== undefined);
}

function lecturaBalance(carta: CartaNatal) {
  const abundan = (conteos: Record<string, number>, minimo: number) =>
    Object.entries(conteos).filter(([, n]) => n >= minimo).map(([k, n]) => `${k} (${n})`);
  const faltan = (conteos: Record<string, number>) => Object.entries(conteos).filter(([, n]) => n === 0).map(([k]) => k);
  return {
    elementos: carta.balance.elementos,
    modalidades: carta.balance.modalidades,
    elementosQueAbundan: abundan(carta.balance.elementos, 4),
    elementosQueFaltan: faltan(carta.balance.elementos),
    modalidadesQueAbundan: abundan(carta.balance.modalidades, 5),
    modalidadesQueFaltan: faltan(carta.balance.modalidades),
  };
}

function aspectosParaIA(carta: CartaNatal, maximo: number) {
  return carta.aspectos.slice(0, maximo).map((a) => ({
    entre: `${NOMBRE_PUNTO[a.a]} y ${NOMBRE_PUNTO[a.b]}`,
    aspecto: NOMBRE_ASPECTO[a.tipo],
    orbe: a.orbe,
    aplicativo: a.aplicativo,
  }));
}

/** Solo los datos que cada sección necesita (menos tokens y menos riesgo de que la IA se desvíe). */
function datosSeccion(id: SeccionId, carta: CartaNatal): unknown {
  switch (id) {
    case "triada":
      return {
        puntos: puntos(carta, "sol", "luna", "ascendente").map(puntoParaIA),
        faseLunar: carta.faseLunar,
        balance: lecturaBalance(carta),
      };
    case "balance":
      return lecturaBalance(carta);
    case "personales":
      return { puntos: puntos(carta, "mercurio", "venus", "marte").map(puntoParaIA) };
    case "sociales":
      return { puntos: puntos(carta, "jupiter", "saturno", "urano", "neptuno", "pluton").map(puntoParaIA) };
    case "casas":
      return {
        sistemaCasas: carta.configuracion.sistemaCasas,
        casas: carta.casas.map((c) => ({
          casa: c.casa,
          signoDeLaCuspide: NOMBRE_SIGNO[c.signo],
          grado: redondear(c.grado),
          planetasDentro: carta.puntos
            .filter((p) => p.casa === c.casa && p.punto !== "ascendente" && p.punto !== "medioCielo")
            .map((p) => NOMBRE_PUNTO[p.punto]),
        })),
      };
    case "aspectos":
      return { aspectos: aspectosParaIA(carta, 12) };
    case "nodos-quiron":
      return { puntos: puntos(carta, "nodoNorte", "nodoSur", "quiron").map(puntoParaIA) };
    case "sintesis":
      return {
        puntos: puntos(carta, "sol", "luna", "ascendente", "mercurio", "venus", "marte").map(puntoParaIA),
        faseLunar: carta.faseLunar,
        balance: lecturaBalance(carta),
        aspectosMasExactos: aspectosParaIA(carta, 5),
      };
  }
}

function textosBaseSeccion(id: SeccionId, carta: CartaNatal): TextoBase[] {
  if (id !== "triada" && id !== "sintesis") return [];
  const sol = puntos(carta, "sol")[0];
  const luna = puntos(carta, "luna")[0];
  const asc = puntos(carta, "ascendente")[0];
  return [
    sol && textoPlanetaEnSigno("sol", sol.signo),
    luna && textoPlanetaEnSigno("luna", luna.signo),
    asc && textoAscendente(asc.signo),
  ].filter((t): t is TextoBase => Boolean(t));
}

function formatearTextoBase(t: TextoBase): string {
  return `### ${t.titulo}\n${t.esencia}\nLuz: ${t.luz.join(", ")}. Sombra: ${t.sombra.join(", ")}.\nConsejo: ${t.consejo}`;
}

function contextoHora(carta: CartaNatal): string {
  switch (carta.datos.precision) {
    case "exacta":
      return "hora exacta (el Ascendente y las casas son confiables).";
    case "aproximada":
      return "hora aproximada (el Ascendente y las casas pueden variar: dilo en una frase).";
    case "desconocida":
      return "hora desconocida (carta sin Ascendente ni casas: explícalo en una frase).";
  }
}

export interface PeticionIA {
  system: string;
  user: string;
  maxTokens: number;
}

/** Margen amplio: el modelo puede gastar parte en pensar antes de escribir (una sección ronda 1.500 tokens). */
const MAX_TOKENS = 12000;

/** Arma lo que se le envía a la IA para una sección. Es una función pura: sirve para revisar exactamente qué ve la IA. */
export function construirPeticion(id: SeccionId, carta: CartaNatal): PeticionIA {
  const def = DEFINICIONES.get(id);
  if (!def) throw new Error(`Sección desconocida: ${id}`);
  if (def.requiereHora && carta.casas.length === 0) {
    throw new Error(`La sección "${def.titulo}" requiere la hora de nacimiento (esta carta no tiene casas).`);
  }

  const bases = textosBaseSeccion(id, carta);
  const user = [
    `SECCIÓN: ${def.titulo}`,
    `EXTENSIÓN OBJETIVO: ${def.palabras} palabras.`,
    `HORA DE NACIMIENTO: ${contextoHora(carta)}`,
    `INSTRUCCIONES DE LA SECCIÓN: ${def.instrucciones}`,
    "",
    "DATOS DE LA CARTA (única fuente de verdad):",
    "```json",
    JSON.stringify(datosSeccion(id, carta), null, 2),
    "```",
    "",
    bases.length > 0
      ? `TEXTOS BASE DE LA MARCA (voz a respetar; reescríbelos con tus palabras e intégralos, no los copies):\n\n${bases.map(formatearTextoBase).join("\n\n")}`
      : "No hay textos base para esta sección: redacta solo a partir de los datos.",
  ].join("\n");

  return { system: PROMPT_SISTEMA, user, maxTokens: MAX_TOKENS };
}

/* ───────────────────────────── Llamada a la IA ───────────────────────────── */

export interface UsoIA {
  entrada: number;
  salida: number;
  cacheLeido: number;
  cacheEscrito: number;
}

export interface RespuestaIA {
  texto: string;
  uso: UsoIA;
  modelo: string;
}

export type LlamarIA = (peticion: PeticionIA) => Promise<RespuestaIA>;

const MODELO_POR_DEFECTO = "claude-opus-5-5";

/** USD por millón de tokens (tarifas publicadas; sirven para estimar el costo por informe). */
const PRECIOS_USD_POR_MTOK: Record<string, { entrada: number; salida: number; cacheLeido: number; cacheEscrito: number }> = {
  "claude-opus-5-5": { entrada: 4, salida: 20, cacheLeido: 0.2, cacheEscrito: 5 },
  "claude-sonnet-5-5": { entrada: 2, salida: 10, cacheLeido: 0.2, cacheEscrito: 2.5 },
  // Gemini (tarifa hasta 200 mil tokens por petición; el "pensar" cuenta como salida).
  "gemini-2.5-pro": { entrada: 1.25, salida: 10, cacheLeido: 0.31, cacheEscrito: 0 },
  "gemini-2.5-flash": { entrada: 0.3, salida: 2.5, cacheLeido: 0.075, cacheEscrito: 0 },
  "gemini-3.6-flash": { entrada: 0.75, salida: 3.75, cacheLeido: 0.075, cacheEscrito: 0 },
  "gemini-3.8-flash": { entrada: 0.75, salida: 3.75, cacheLeido: 0.075, cacheEscrito: 0 },
  "gemini-3.1-pro-preview": { entrada: 2, salida: 12, cacheLeido: 0.2, cacheEscrito: 0 },
};

export function estimarCostoUSD(uso: UsoIA, modelo: string): number | null {
  const p = PRECIOS_USD_POR_MTOK[modelo];
  if (!p) return null;
  return (uso.entrada * p.entrada + uso.salida * p.salida + uso.cacheLeido * p.cacheLeido + uso.cacheEscrito * p.cacheEscrito) / 1_000_000;
}

export function sumarUso(a: UsoIA, b: UsoIA): UsoIA {
  return {
    entrada: a.entrada + b.entrada,
    salida: a.salida + b.salida,
    cacheLeido: a.cacheLeido + b.cacheLeido,
    cacheEscrito: a.cacheEscrito + b.cacheEscrito,
  };
}

export const USO_VACIO: UsoIA = { entrada: 0, salida: 0, cacheLeido: 0, cacheEscrito: 0 };

type Esfuerzo = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Cliente real (API de Claude). Configuración por variables de entorno:
 * - `ANTHROPIC_API_KEY` (obligatoria)
 * - `ASTRO_MODEL` (opcional, por defecto claude-opus-5-5)
 * - `ASTRO_EFFORT` (opcional: low | medium | high | xhigh | max | off; por defecto medium)
 * El prompt de sistema va con caché: es idéntico en todas las secciones de todos los informes.
 */
export function crearLlamadaAnthropic(): LlamarIA {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY: agrégala en las variables de entorno para redactar informes con IA.");

  const client = new Anthropic({ apiKey });
  const modelo = process.env.ASTRO_MODEL?.trim() || MODELO_POR_DEFECTO;
  const esfuerzo = process.env.ASTRO_EFFORT?.trim() || "medium";

  return async ({ system, user, maxTokens }) => {
    const respuesta = await client.messages.create({
      model: modelo,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      ...(esfuerzo === "off" ? {} : { output_config: { effort: esfuerzo as Esfuerzo } }),
      messages: [{ role: "user", content: user }],
    });

    if (respuesta.stop_reason === "refusal") {
      throw new Error("La IA se negó a redactar esta sección. Regenérala o escríbela a mano.");
    }
    if (respuesta.stop_reason === "max_tokens") {
      throw new Error("La IA se quedó sin espacio y el texto quedó cortado. Regenera la sección.");
    }

    const texto = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();
    if (!texto) throw new Error("La IA devolvió una respuesta vacía. Regenera la sección.");

    return {
      texto,
      modelo: respuesta.model,
      uso: {
        entrada: respuesta.usage.input_tokens,
        salida: respuesta.usage.output_tokens,
        cacheLeido: respuesta.usage.cache_read_input_tokens ?? 0,
        cacheEscrito: respuesta.usage.cache_creation_input_tokens ?? 0,
      },
    };
  };
}

const MODELO_GEMINI_POR_DEFECTO = "gemini-3.1-pro-preview";
const TIMEOUT_GEMINI_MS = 55_000;

interface RespuestaGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number };
  modelVersion?: string;
  error?: { message?: string };
}

/**
 * Cliente de Gemini (API REST de Google, sin dependencias nuevas). Variables de entorno:
 * - `GEMINI_API_KEY` (obligatoria)
 * - `ASTRO_MODEL` (opcional, por defecto gemini-3.1-pro-preview)
 * Solo se le envían posiciones astrales: nunca nombre, fecha, hora, lugar ni coordenadas.
 */
export function crearLlamadaGemini(fetchImpl: typeof fetch = fetch): LlamarIA {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY: agrégala en las variables de entorno para redactar informes con IA.");
  const modelo = process.env.ASTRO_MODEL?.trim() || MODELO_GEMINI_POR_DEFECTO;

  return async ({ system, user, maxTokens }) => {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(TIMEOUT_GEMINI_MS),
    });
    const datos = (await res.json().catch(() => ({}))) as RespuestaGemini;
    if (!res.ok) throw new Error(`Gemini respondió ${res.status}: ${datos.error?.message ?? "error desconocido"}.`);
    if (datos.promptFeedback?.blockReason) throw new Error("La IA se negó a redactar esta sección. Regenérala o escríbela a mano.");

    const candidato = datos.candidates?.[0];
    if (candidato?.finishReason === "MAX_TOKENS") throw new Error("La IA se quedó sin espacio y el texto quedó cortado. Regenera la sección.");
    if (candidato?.finishReason === "SAFETY" || candidato?.finishReason === "PROHIBITED_CONTENT") {
      throw new Error("La IA se negó a redactar esta sección. Regenérala o escríbela a mano.");
    }
    const texto = (candidato?.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join("")
      .trim();
    if (!texto) throw new Error("La IA devolvió una respuesta vacía. Regenera la sección.");

    const u = datos.usageMetadata ?? {};
    const cacheado = u.cachedContentTokenCount ?? 0;
    return {
      texto,
      modelo,
      uso: {
        entrada: Math.max(0, (u.promptTokenCount ?? 0) - cacheado),
        // El "pensar" de Gemini se cobra como salida.
        salida: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
        cacheLeido: cacheado,
        cacheEscrito: 0,
      },
    };
  };
}

/**
 * Elige la IA: `ASTRO_PROVIDER` = "gemini" | "anthropic"; si no está, usa Gemini cuando hay
 * `GEMINI_API_KEY` y, si no, Claude.
 */
export function crearLlamadaIA(): LlamarIA {
  const proveedor = process.env.ASTRO_PROVIDER?.trim().toLowerCase();
  if (proveedor === "gemini") return crearLlamadaGemini();
  if (proveedor === "anthropic") return crearLlamadaAnthropic();
  if (proveedor) throw new Error(`ASTRO_PROVIDER no válido: "${proveedor}" (usa "gemini" o "anthropic").`);
  return process.env.GEMINI_API_KEY?.trim() ? crearLlamadaGemini() : crearLlamadaAnthropic();
}

/* ───────────────────────────── API del módulo ───────────────────────────── */

export interface SeccionGenerada {
  id: SeccionId;
  titulo: string;
  markdown: string;
  /** Avisos de la validación anti-invento y de temas sensibles; vacío si no hay nada que señalar. */
  advertencias: string[];
  uso: UsoIA;
  modelo: string;
}

/** Las secciones que corresponden a esta carta (sin las que necesitan una hora que no se tiene). */
export function seccionesAplicables(carta: CartaNatal): SeccionId[] {
  return SECCIONES.filter((s) => !s.requiereHora || carta.casas.length > 0).map((s) => s.id);
}

export async function redactarSeccion(id: SeccionId, carta: CartaNatal, llamar: LlamarIA): Promise<SeccionGenerada> {
  const def = DEFINICIONES.get(id)!;
  const respuesta = await llamar(construirPeticion(id, carta));
  return {
    id,
    titulo: def.titulo,
    markdown: respuesta.texto,
    advertencias: validarTexto(respuesta.texto, carta),
    uso: respuesta.uso,
    modelo: respuesta.modelo,
  };
}

export interface InformeRedactado {
  secciones: SeccionGenerada[];
  usoTotal: UsoIA;
  /** Estimación en USD; null si el modelo no tiene tarifa registrada. */
  costoUSD: number | null;
}

/** Redacta todas las secciones aplicables, una por una (el panel usará `redactarSeccion` paso a paso). */
export async function redactarInforme(carta: CartaNatal, llamar: LlamarIA, ids: SeccionId[] = seccionesAplicables(carta)): Promise<InformeRedactado> {
  const secciones: SeccionGenerada[] = [];
  let usoTotal = USO_VACIO;
  for (const id of ids) {
    const seccion = await redactarSeccion(id, carta, llamar);
    secciones.push(seccion);
    usoTotal = sumarUso(usoTotal, seccion.uso);
  }
  const modelo = secciones[0]?.modelo;
  return { secciones, usoTotal, costoUSD: modelo ? estimarCostoUSD(usoTotal, modelo) : null };
}
