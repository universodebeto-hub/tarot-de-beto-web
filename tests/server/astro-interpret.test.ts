import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = { create };
    constructor(public opciones: unknown) {}
  }
  return { default: Anthropic };
});

import { calcularCarta } from "@/server/astro/engine";
import {
  PROMPT_SISTEMA,
  SECCIONES,
  construirPeticion,
  crearLlamadaAnthropic,
  estimarCostoUSD,
  redactarInforme,
  redactarSeccion,
  seccionesAplicables,
  type LlamarIA,
  type PeticionIA,
} from "@/server/astro/interpret";
import type { DatosNacimiento, Lugar } from "@/lib/astro/types";

/** Persona FICTICIA con datos reconocibles, para comprobar que NADA de esto llega a la IA. */
const LUGAR: Lugar = { nombreMostrado: "Villanueva del Sinsonte, Prueba", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" };
const DATOS: DatosNacimiento = {
  nombre: "Zulema Quintanilla",
  fecha: "1992-09-20",
  hora: "14:45",
  precision: "exacta",
  ciudad: "Villanueva del Sinsonte",
  pais: "Pais Inventado",
};
const carta = calcularCarta(DATOS, LUGAR);
const cartaSinHora = calcularCarta({ ...DATOS, precision: "desconocida" }, LUGAR);
const cartaAproximada = calcularCarta({ ...DATOS, precision: "aproximada" }, LUGAR);

const USO = { entrada: 100, salida: 50, cacheLeido: 0, cacheEscrito: 0 };

function iaFalsa(texto: string) {
  const peticiones: PeticionIA[] = [];
  const llamar: LlamarIA = async (p) => {
    peticiones.push(p);
    return { texto, uso: USO, modelo: "claude-opus-5-5" };
  };
  return { llamar, peticiones };
}

describe("qué ve la IA (privacidad)", () => {
  const secciones = seccionesAplicables(carta);

  it("ninguna sección recibe nombre, fecha, hora, lugar, zona horaria ni coordenadas", () => {
    for (const id of secciones) {
      const { system, user } = construirPeticion(id, carta);
      const todo = `${system}\n${user}`;
      for (const privado of [
        "Zulema",
        "Quintanilla",
        "Villanueva",
        "Sinsonte",
        "Pais Inventado",
        "1992-09-20",
        "14:45",
        carta.utc,
        "America/Bogota",
        "4.711",
        "74.0721",
      ]) {
        expect(todo, `${id} filtra "${privado}"`).not.toContain(privado);
      }
    }
  });

  it("la sección de la tríada incluye solo los textos base de los signos de esa carta", () => {
    const { user } = construirPeticion("triada", carta);
    expect(user).toContain("Sol en Virgo");
    expect(user).toContain("Luna en Cáncer");
    expect(user).toContain("Ascendente en Capricornio");
    expect(user).not.toContain("Sol en Leo");
    expect(user).not.toContain("Ascendente en Aries");
  });

  it("las secciones sin textos base lo dicen y redactan solo con los datos", () => {
    expect(construirPeticion("personales", carta).user).toContain("No hay textos base para esta sección");
  });

  it("las posiciones que recibe la IA coinciden con la carta", () => {
    const { user } = construirPeticion("personales", carta);
    const datos = JSON.parse(user.split("```json")[1].split("```")[0]);
    const venus = carta.puntos.find((p) => p.punto === "venus")!;
    const enviado = datos.puntos.find((p: { punto: string }) => p.punto === "Venus");
    expect(enviado).toMatchObject({ signo: "Libra", casa: venus.casa, retrogrado: venus.retrogrado });
  });

  it("el prompt de sistema es siempre el mismo (se cachea) y fija las reglas clave", () => {
    for (const id of secciones) expect(construirPeticion(id, carta).system).toBe(PROMPT_SISTEMA);
    expect(PROMPT_SISTEMA).toContain("EXCLUSIVAMENTE los datos");
    expect(PROMPT_SISTEMA).toContain("predicciones sobre salud, muerte, embarazos ni dinero");
    expect(PROMPT_SISTEMA).toContain("segunda persona");
  });

  it("los aspectos enviados son como máximo 12 y vienen del más exacto al menos exacto", () => {
    const { user } = construirPeticion("aspectos", carta);
    const { aspectos } = JSON.parse(user.split("```json")[1].split("```")[0]);
    expect(aspectos.length).toBeLessThanOrEqual(12);
    const orbes = aspectos.map((a: { orbe: number }) => a.orbe);
    expect(orbes).toEqual([...orbes].sort((a: number, b: number) => a - b));
  });
});

describe("según la hora de nacimiento", () => {
  it("con hora desconocida no hay sección de casas y la tríada no incluye el Ascendente", () => {
    expect(seccionesAplicables(cartaSinHora)).not.toContain("casas");
    expect(seccionesAplicables(carta)).toContain("casas");
    expect(() => construirPeticion("casas", cartaSinHora)).toThrow(/requiere la hora/);
    const { user } = construirPeticion("triada", cartaSinHora);
    expect(user).toContain("hora desconocida");
    expect(user).not.toContain('"punto": "Ascendente"');
    expect(user).not.toContain("Ascendente en");
  });

  it("con hora aproximada se le pide a la IA avisarlo", () => {
    expect(construirPeticion("triada", cartaAproximada).user).toContain("hora aproximada");
  });

  it("con hora exacta están las 8 secciones", () => {
    expect(seccionesAplicables(carta)).toHaveLength(SECCIONES.length);
  });
});

describe("redactarSeccion y redactarInforme", () => {
  it("devuelve el texto con título, uso y sin avisos si todo coincide", async () => {
    const { llamar } = iaFalsa("Tu Sol en Virgo y tu Luna en Cáncer conviven.");
    const s = await redactarSeccion("triada", carta, llamar);
    expect(s).toMatchObject({ id: "triada", titulo: "Tu Gran Tríada", advertencias: [], uso: USO });
    expect(s.markdown).toContain("Sol en Virgo");
  });

  it("adjunta avisos si la IA contradice la carta", async () => {
    const { llamar } = iaFalsa("Tu Venus en Géminis es muy comunicativa.");
    const s = await redactarSeccion("personales", carta, llamar);
    expect(s.advertencias[0]).toContain("Venus en Géminis");
  });

  it("redacta todas las secciones aplicables, suma el uso y estima el costo", async () => {
    const { llamar, peticiones } = iaFalsa("Texto de prueba sin datos.");
    const informe = await redactarInforme(carta, llamar);
    expect(informe.secciones.map((s) => s.id)).toEqual(SECCIONES.map((s) => s.id));
    expect(peticiones).toHaveLength(8);
    expect(informe.usoTotal).toEqual({ entrada: 800, salida: 400, cacheLeido: 0, cacheEscrito: 0 });
    // 800 × $4/M + 400 × $20/M
    expect(informe.costoUSD).toBeCloseTo(0.0112, 6);
  });

  it("se puede regenerar una sola sección", async () => {
    const { llamar, peticiones } = iaFalsa("Texto.");
    await redactarInforme(carta, llamar, ["sintesis"]);
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].user).toContain("Síntesis y consejos");
  });
});

describe("estimarCostoUSD", () => {
  it("cuenta por separado lo que sale de la caché y lo que se escribe en ella", () => {
    const costo = estimarCostoUSD({ entrada: 1_000_000, salida: 1_000_000, cacheLeido: 1_000_000, cacheEscrito: 1_000_000 }, "claude-opus-5-5");
    expect(costo).toBeCloseTo(4 + 20 + 0.2 + 5, 6);
  });

  it("devuelve null para un modelo sin tarifa registrada", () => {
    expect(estimarCostoUSD(USO, "modelo-desconocido")).toBeNull();
  });
});

describe("crearLlamadaAnthropic (cliente real, con el SDK simulado)", () => {
  const respuestaOk = {
    stop_reason: "end_turn",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: "  Texto redactado  " }],
    usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: null, cache_creation_input_tokens: 3 },
  };

  beforeEach(() => {
    create.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
    vi.stubEnv("ASTRO_MODEL", "");
    vi.stubEnv("ASTRO_EFFORT", "");
  });

  it("falla con un mensaje claro si falta la clave", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => crearLlamadaAnthropic()).toThrow(/Falta ANTHROPIC_API_KEY/);
  });

  it("usa el modelo por defecto, esfuerzo medio, sistema con caché y ningún parámetro retirado de la API", async () => {
    create.mockResolvedValue(respuestaOk);
    const r = await crearLlamadaAnthropic()({ system: "SISTEMA", user: "USUARIO", maxTokens: 1234 });

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(1234);
    expect(params.system).toEqual([{ type: "text", text: "SISTEMA", cache_control: { type: "ephemeral" } }]);
    expect(params.output_config).toEqual({ effort: "medium" });
    expect(params.messages).toEqual([{ role: "user", content: "USUARIO" }]);
    // Parámetros que esta familia de modelos rechaza con error 400.
    for (const prohibido of ["temperature", "top_p", "top_k", "budget_tokens", "thinking"]) {
      expect(params, prohibido).not.toHaveProperty(prohibido);
    }
    expect(r).toEqual({
      texto: "Texto redactado",
      modelo: "claude-opus-5-5",
      uso: { entrada: 10, salida: 5, cacheLeido: 0, cacheEscrito: 3 },
    });
  });

  it("respeta ASTRO_MODEL y ASTRO_EFFORT, y 'off' quita el esfuerzo", async () => {
    create.mockResolvedValue(respuestaOk);
    vi.stubEnv("ASTRO_MODEL", "claude-sonnet-5-5");
    vi.stubEnv("ASTRO_EFFORT", "low");
    await crearLlamadaAnthropic()({ system: "s", user: "u", maxTokens: 10 });
    expect(create.mock.calls[0][0]).toMatchObject({ model: "claude-sonnet-5-5", output_config: { effort: "low" } });

    vi.stubEnv("ASTRO_EFFORT", "off");
    await crearLlamadaAnthropic()({ system: "s", user: "u", maxTokens: 10 });
    expect(create.mock.calls[1][0]).not.toHaveProperty("output_config");
  });

  it("falla si la IA se niega, si el texto queda cortado o si responde vacío", async () => {
    const llamar = crearLlamadaAnthropic();
    create.mockResolvedValueOnce({ ...respuestaOk, stop_reason: "refusal" });
    await expect(llamar({ system: "s", user: "u", maxTokens: 10 })).rejects.toThrow(/se negó/);
    create.mockResolvedValueOnce({ ...respuestaOk, stop_reason: "max_tokens" });
    await expect(llamar({ system: "s", user: "u", maxTokens: 10 })).rejects.toThrow(/cortado/);
    create.mockResolvedValueOnce({ ...respuestaOk, content: [] });
    await expect(llamar({ system: "s", user: "u", maxTokens: 10 })).rejects.toThrow(/vacía/);
  });
});
