import { describe, it, expect } from "vitest";
import { calcularCarta } from "@/server/astro/engine";
import { validarTexto } from "@/server/astro/validate";
import type { DatosNacimiento, Lugar } from "@/lib/astro/types";

/**
 * Carta de referencia FICTICIA (Bogotá, 20-sep-1992 14:45, hora exacta). Lo que dice la
 * carta, verificado en las pruebas del motor: Sol Virgo (casa 9), Luna Cáncer (6),
 * Mercurio y Venus Libra (9), Marte Cáncer (6), Saturno Acuario retrógrado (1),
 * Ascendente Capricornio, cúspide de la casa 7 en Cáncer, Nodo Norte Sagitario, Nodo Sur Géminis.
 */
const BOGOTA: Lugar = { nombreMostrado: "Bogotá", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" };
const datos: DatosNacimiento = { nombre: "Persona de prueba", fecha: "1992-09-20", hora: "14:45", precision: "exacta", ciudad: "Bogotá", pais: "Colombia" };
const carta = calcularCarta(datos, BOGOTA);
const cartaSinHora = calcularCarta({ ...datos, precision: "desconocida" }, BOGOTA);

describe("validarTexto — coincide con la carta", () => {
  it("un texto correcto no genera avisos", () => {
    const texto = `Tu Sol en Virgo y tu Luna en Cáncer se complementan. Saturno retrógrado en Acuario, en la casa 1, te pide madurez.
    Venus en la casa 9 y Mercurio en Libra hablan de tu forma de comunicar. La casa 7 en Cáncer habla de tus vínculos.
    Tu Ascendente en Capricornio, con el Nodo Sur en Géminis y el Nodo Norte en Sagitario.`;
    expect(validarTexto(texto, carta)).toEqual([]);
  });

  it("no distingue mayúsculas ni tildes", () => {
    expect(validarTexto("SOL EN VIRGO, luna en cancer, jupiter en virgo", carta)).toEqual([]);
  });

  it("el signo Cáncer no se confunde con una enfermedad", () => {
    expect(validarTexto("Tu Luna en Cáncer y Marte en Cáncer.", carta)).toEqual([]);
  });
});

describe("validarTexto — detecta contradicciones", () => {
  it("planeta en un signo equivocado", () => {
    const avisos = validarTexto("Tu Venus en Géminis te hace coqueto.", carta);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("Venus en Géminis");
    expect(avisos[0]).toContain("Libra");
  });

  it("planeta en una casa equivocada", () => {
    const avisos = validarTexto("Tu Marte en la casa 3 busca acción.", carta);
    expect(avisos[0]).toContain("casa 6");
  });

  it("cúspide en un signo equivocado", () => {
    const avisos = validarTexto("La casa 7 en Piscis habla de tus relaciones.", carta);
    expect(avisos[0]).toContain("casa 7");
    expect(avisos[0]).toContain("Cáncer");
  });

  it("casa inexistente", () => {
    expect(validarTexto("La casa 14 en Aries.", carta)[0]).toContain("no existe");
  });

  it("retrogradación equivocada", () => {
    const avisos = validarTexto("Con Mercurio retrógrado piensas más despacio.", carta);
    expect(avisos[0]).toContain("Mercurio");
    expect(avisos[0]).toContain("directo");
  });

  it("el Nodo Norte y el Nodo Sur no se intercambian", () => {
    const avisos = validarTexto("Tu Nodo Norte en Géminis marca tu camino.", carta);
    expect(avisos[0]).toContain("Nodo Norte");
    expect(avisos[0]).toContain("Sagitario");
  });
});

describe("validarTexto — hora desconocida", () => {
  it("avisa si menciona Ascendente o casas que la carta no tiene", () => {
    const avisos = validarTexto("Tu Ascendente en Capricornio y tu Sol en la casa 9.", cartaSinHora);
    expect(avisos.some((a) => a.includes("Ascendente en Capricornio") && a.includes("no existe"))).toBe(true);
    expect(avisos.some((a) => a.includes("no tiene casas"))).toBe(true);
  });

  it("explicar que no se calcula el Ascendente NO es un error", () => {
    expect(validarTexto("Sin la hora de nacimiento no se puede calcular tu Ascendente ni tus casas.", cartaSinHora)).toEqual([]);
  });
});

describe("validarTexto — temas sensibles", () => {
  it("marca palabras de salud, muerte, embarazo o dinero para revisión", () => {
    for (const frase of [
      "Habrá una muerte en tu familia.",
      "Te anuncia una enfermedad grave.",
      "Vas a quedar embarazada pronto.",
      "Ganarás una fortuna.",
    ]) {
      expect(validarTexto(frase, carta).some((a) => a.startsWith("Tema sensible")), frase).toBe(true);
    }
  });

  it("no repite el mismo aviso", () => {
    const avisos = validarTexto("La muerte y otra vez la muerte.", carta);
    expect(avisos).toHaveLength(1);
  });
});
