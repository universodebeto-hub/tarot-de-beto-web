import { describe, it, expect } from "vitest";
import {
  calcularAspectos,
  calcularBalance,
  casaDeLongitud,
  faseLunarDeElongacion,
  gradoEnSigno,
  normalizar360,
  signoDeLongitud,
  type PuntoConVelocidad,
} from "@/lib/astro/utils";
import type { Cuspide, Punto, Signo } from "@/lib/astro/types";

const p = (punto: Punto, longitud: number, velocidad = 0): PuntoConVelocidad => ({ punto, longitud, velocidad });

describe("signos y grados", () => {
  it("asigna el signo por tramos de 30° y normaliza ángulos fuera de rango", () => {
    expect(signoDeLongitud(0)).toBe("aries");
    expect(signoDeLongitud(29.99)).toBe("aries");
    expect(signoDeLongitud(30)).toBe("tauro");
    expect(signoDeLongitud(359.9)).toBe("piscis");
    expect(signoDeLongitud(-10)).toBe("piscis");
    expect(signoDeLongitud(370)).toBe("aries");
  });

  it("calcula el grado dentro del signo", () => {
    expect(gradoEnSigno(45.5)).toBeCloseTo(15.5, 10);
    expect(gradoEnSigno(0)).toBe(0);
    expect(normalizar360(-1)).toBe(359);
  });
});

describe("casaDeLongitud", () => {
  // Casas iguales de 30°, la primera empieza en 100°.
  const iguales: Cuspide[] = Array.from({ length: 12 }, (_, i) => {
    const longitud = normalizar360(100 + i * 30);
    return { casa: i + 1, signo: signoDeLongitud(longitud), grado: gradoEnSigno(longitud), longitud };
  });

  it("incluye el inicio de la casa y excluye el de la siguiente", () => {
    expect(casaDeLongitud(100, iguales)).toBe(1);
    expect(casaDeLongitud(129.9, iguales)).toBe(1);
    expect(casaDeLongitud(130, iguales)).toBe(2);
  });

  it("maneja el cruce por 0° de Aries", () => {
    // Cúspides: 100, 130, 160, 190, 220, 250, 280, 310, 340, 10 (casa 10), 40, 70.
    expect(casaDeLongitud(99.9, iguales)).toBe(12);
    expect(casaDeLongitud(5, iguales)).toBe(9);
    expect(casaDeLongitud(10, iguales)).toBe(10);
  });

  it("funciona con casas de distinto tamaño (como Placidus, con cúspides opuestas a 180°)", () => {
    const desiguales: Cuspide[] = [10, 35, 65, 100, 135, 160, 190, 215, 245, 280, 315, 340].map((longitud, i) => ({
      casa: i + 1,
      signo: signoDeLongitud(longitud),
      grado: gradoEnSigno(longitud),
      longitud,
    }));
    expect(casaDeLongitud(20, desiguales)).toBe(1);
    expect(casaDeLongitud(70, desiguales)).toBe(3);
    expect(casaDeLongitud(99.9, desiguales)).toBe(3);
    expect(casaDeLongitud(100, desiguales)).toBe(4);
    expect(casaDeLongitud(350, desiguales)).toBe(12);
    expect(casaDeLongitud(5, desiguales)).toBe(12);
  });
});

describe("fase lunar", () => {
  it.each([
    [0, "Luna nueva"],
    [350, "Luna nueva"],
    [45, "Luna creciente"],
    [90, "Cuarto creciente"],
    [135, "Gibosa creciente"],
    [180, "Luna llena"],
    [225, "Gibosa menguante"],
    [270, "Cuarto menguante"],
    [315, "Luna menguante"],
  ])("elongación %i° → %s", (elongacion, nombre) => {
    expect(faseLunarDeElongacion(100, 100 + elongacion)).toBe(nombre);
  });
});

describe("calcularAspectos", () => {
  it("detecta una conjunción con orbe ampliado por luminar (Sol a 7,5°: límite 10°)", () => {
    const [a] = calcularAspectos([p("sol", 10), p("luna", 17.5)]);
    expect(a).toMatchObject({ a: "sol", b: "luna", tipo: "conjuncion", orbe: 7.5 });
  });

  it("sin luminares el orbe es el base: 7,5° no alcanza para un trígono (límite 7°)", () => {
    expect(calcularAspectos([p("venus", 0), p("jupiter", 127.5)])).toHaveLength(0);
  });

  it("con un luminar ese mismo trígono sí entra (límite 9°)", () => {
    const res = calcularAspectos([p("sol", 0), p("jupiter", 127.5)]);
    expect(res).toHaveLength(1);
    expect(res[0].tipo).toBe("trigono");
  });

  it("mide la distancia por el camino corto, cruzando 0° de Aries", () => {
    expect(calcularAspectos([p("mercurio", 358), p("venus", 4)])[0]).toMatchObject({ tipo: "conjuncion", orbe: 6 });
    // 355° y 5° están a 10°: fuera del orbe de 8° para planetas sin luminares.
    expect(calcularAspectos([p("mercurio", 355), p("venus", 5)])).toHaveLength(0);
  });

  it("reconoce cuadratura, sextil y oposición", () => {
    const tipos = calcularAspectos([p("marte", 0), p("saturno", 94), p("urano", 58), p("pluton", 183)]).map((x) => x.tipo);
    expect(tipos).toContain("cuadratura");
    expect(tipos).toContain("sextil");
    expect(tipos).toContain("oposicion");
  });

  it("excluye el Nodo Sur y los pares Ascendente–Medio Cielo", () => {
    const res = calcularAspectos([p("nodoNorte", 10), p("nodoSur", 190), p("ascendente", 10), p("medioCielo", 280)]);
    expect(res.some((x) => x.a === "nodoSur" || x.b === "nodoSur")).toBe(false);
    expect(res.some((x) => x.a === "ascendente" && x.b === "medioCielo")).toBe(false);
    // Nodo Norte y Ascendente en la misma longitud sí hacen conjunción.
    expect(res.some((x) => x.a === "nodoNorte" && x.b === "ascendente" && x.tipo === "conjuncion")).toBe(true);
  });

  it("marca aplicativo cuando el aspecto se está cerrando, y no cuando se separa", () => {
    // Venus (rápida) a 88°, Marte (lenta) a 0°: Venus avanza hacia los 90° exactos.
    const aplicando = calcularAspectos([p("marte", 0, 0.5), p("venus", 88, 1.2)])[0];
    expect(aplicando.aplicativo).toBe(true);
    // Venus ya pasó los 90°: se aleja.
    const separando = calcularAspectos([p("marte", 0, 0.5), p("venus", 92, 1.2)])[0];
    expect(separando.aplicativo).toBe(false);
  });

  it("ordena del más exacto al menos exacto", () => {
    const res = calcularAspectos([p("marte", 0), p("venus", 5), p("jupiter", 1)]);
    const orbes = res.map((x) => x.orbe);
    expect(orbes).toEqual([...orbes].sort((x, y) => x - y));
  });
});

describe("calcularBalance", () => {
  const pos = (punto: Punto, signo: Signo) => ({ punto, signo });

  it("cuenta los 10 planetas y el Ascendente, e ignora Quirón y los nodos", () => {
    const b = calcularBalance([
      pos("sol", "aries"), // fuego, cardinal
      pos("luna", "leo"), // fuego, fija
      pos("mercurio", "tauro"), // tierra, fija
      pos("ascendente", "piscis"), // agua, mutable
      pos("quiron", "aries"),
      pos("nodoNorte", "aries"),
      pos("nodoSur", "libra"),
      pos("medioCielo", "capricornio"),
    ]);
    expect(b.elementos).toEqual({ fuego: 2, tierra: 1, aire: 0, agua: 1 });
    expect(b.modalidades).toEqual({ cardinal: 1, fija: 2, mutable: 1 });
  });
});
