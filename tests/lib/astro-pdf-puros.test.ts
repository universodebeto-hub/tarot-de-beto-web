import { describe, expect, it } from "vitest";
import { descripcionHora, formatearFechaLarga, formatearGrado } from "@/lib/astro/formato";
import { parsearInline, parsearMarkdown } from "@/lib/astro/markdown";
import { anguloRueda, normalizar, puntoPolar, sectorAnular, separarGlifos } from "@/lib/astro/rueda";
import { SIMBOLO_PUNTO, SIMBOLO_SIGNO } from "@/lib/astro/simbolos";

describe("formatearGrado", () => {
  it("redondea al minuto y rellena con cero", () => {
    expect(formatearGrado(23.3833)).toBe("23°23'");
    expect(formatearGrado(0)).toBe("0°00'");
    expect(formatearGrado(5.05)).toBe("5°03'");
  });

  it("no muestra 60 minutos ni 30 grados", () => {
    expect(formatearGrado(10.9999)).toBe("11°00'");
    expect(formatearGrado(29.9999)).toBe("29°59'");
  });
});

describe("formatearFechaLarga y descripcionHora", () => {
  it("escribe la fecha en español", () => {
    expect(formatearFechaLarga("1992-09-20")).toBe("20 de septiembre de 1992");
    expect(formatearFechaLarga("2001-01-05")).toBe("5 de enero de 2001");
    expect(() => formatearFechaLarga("1992-13-01")).toThrow(/inválida/);
  });

  it("indica la precisión de la hora", () => {
    expect(descripcionHora({ hora: "14:45", precision: "exacta" })).toBe("14:45");
    expect(descripcionHora({ hora: "14:45", precision: "aproximada" })).toBe("14:45 (aproximada)");
    expect(descripcionHora({ hora: "", precision: "desconocida" })).toBe("hora desconocida");
  });
});

describe("símbolos", () => {
  it("hay un glifo para cada signo y para los puntos principales", () => {
    expect(Object.values(SIMBOLO_SIGNO)).toHaveLength(12);
    expect(new Set(Object.values(SIMBOLO_SIGNO)).size).toBe(12);
    expect(SIMBOLO_PUNTO.sol).toBe("☉");
    expect(SIMBOLO_PUNTO.quiron).toBe("⚷");
    expect(SIMBOLO_PUNTO.ascendente).toBe("AC");
  });
});

describe("geometría de la rueda", () => {
  it("el Ascendente queda a la izquierda y el zodíaco avanza en sentido antihorario", () => {
    expect(anguloRueda(120, 120)).toBe(180);
    expect(anguloRueda(150, 120)).toBe(210); // 30° después del Ascendente: hacia abajo
    expect(anguloRueda(90, 120)).toBe(150); // 30° antes: hacia arriba (casas 12, 11...)
    expect(anguloRueda(120 + 359, 120)).toBe(179); // casi una vuelta: queda justo encima del Ascendente
    const izquierda = puntoPolar(250, 250, 100, 180);
    expect(izquierda.x).toBeCloseTo(150, 6);
    expect(izquierda.y).toBeCloseTo(250, 6);
    const abajo = puntoPolar(250, 250, 100, 270);
    expect(abajo.x).toBeCloseTo(250, 6);
    expect(abajo.y).toBeCloseTo(350, 6); // en pantalla "abajo" es y mayor
  });

  it("normaliza ángulos", () => {
    expect(normalizar(-30)).toBe(330);
    expect(normalizar(725)).toBe(5);
  });

  it("el sector anular es una ruta cerrada con dos arcos", () => {
    const d = sectorAnular(250, 250, 100, 200, 180, 210);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect((d.match(/ A /g) ?? []).length).toBe(2);
  });
});

describe("separarGlifos", () => {
  const separacionMinima = (angulos: number[]) => {
    const orden = [...angulos].map(normalizar).sort((a, b) => a - b);
    let minimo = 360;
    for (let i = 0; i < orden.length; i++) {
      const siguiente = i === orden.length - 1 ? orden[0] + 360 : orden[i + 1];
      minimo = Math.min(minimo, siguiente - orden[i]);
    }
    return minimo;
  };

  it("no mueve nada si ya hay espacio", () => {
    const res = separarGlifos([10, 50, 120, 200, 300], 8);
    expect(res.map((x) => Math.round(x * 1000) / 1000)).toEqual([10, 50, 120, 200, 300]);
  });

  it("abre un grupo apretado respetando la separación mínima y el orden", () => {
    const entrada = [100, 101, 102, 103, 104, 105, 106];
    const res = separarGlifos(entrada, 8);
    expect(separacionMinima(res)).toBeGreaterThanOrEqual(8 - 1e-6);
    for (let i = 1; i < res.length; i++) expect(res[i]).toBeGreaterThan(res[i - 1]);
    // El grupo se abre alrededor de su centro (103°): nadie se aleja de más.
    for (let i = 0; i < res.length; i++) expect(Math.abs(res[i] - entrada[i])).toBeLessThan(26);
  });

  it("funciona cuando el grupo cruza 0° de Aries", () => {
    const res = separarGlifos([358, 359, 1, 2], 8);
    expect(separacionMinima(res)).toBeGreaterThanOrEqual(8 - 1e-6);
  });

  it("devuelve cada ángulo en la posición del punto original, aunque la entrada venga desordenada", () => {
    const res = separarGlifos([200, 10, 105, 12], 8);
    expect(res).toHaveLength(4);
    expect(Math.abs(res[0] - 200)).toBeLessThan(1); // sin vecinos cerca
    expect(Math.abs(res[2] - 105)).toBeLessThan(1);
    expect(Math.abs(res[1] - res[3])).toBeGreaterThanOrEqual(8 - 1e-6); // los dos cercanos se separan
  });

  it("falla si no caben", () => {
    expect(() => separarGlifos(Array.from({ length: 50 }, (_, i) => i), 8)).toThrow(/No caben/);
  });
});

describe("parsearMarkdown", () => {
  it("reconoce subtítulos, párrafos (uniendo líneas) y separa por líneas en blanco", () => {
    const bloques = parsearMarkdown("### Tu esencia\nPrimera línea\nsegunda línea.\n\nOtro párrafo.");
    expect(bloques).toEqual([
      { tipo: "subtitulo", texto: "Tu esencia" },
      { tipo: "parrafo", texto: "Primera línea segunda línea." },
      { tipo: "parrafo", texto: "Otro párrafo." },
    ]);
  });

  it("agrupa listas numeradas y con viñetas", () => {
    const bloques = parsearMarkdown("1. Uno\n2. Dos\n3) Tres\n\n- A\n* B");
    expect(bloques).toEqual([
      { tipo: "lista", ordenada: true, items: ["Uno", "Dos", "Tres"] },
      { tipo: "lista", ordenada: false, items: ["A", "B"] },
    ]);
  });

  it("une la continuación con sangría al ítem anterior y acepta saltos de línea de Windows", () => {
    const bloques = parsearMarkdown("1. Primero\r\n   sigue aquí\r\n2. Segundo");
    expect(bloques).toEqual([{ tipo: "lista", ordenada: true, items: ["Primero sigue aquí", "Segundo"] }]);
  });

  it("trata cualquier nivel de título como subtítulo e ignora las líneas separadoras", () => {
    const bloques = parsearMarkdown("# Uno\n---\n## Dos\nTexto");
    expect(bloques.map((b) => b.tipo)).toEqual(["subtitulo", "subtitulo", "parrafo"]);
  });

  it("un texto vacío no genera bloques", () => {
    expect(parsearMarkdown("  \n\n ")).toEqual([]);
  });
});

describe("parsearInline", () => {
  it("separa negrita y cursiva", () => {
    expect(parsearInline("Una **fuerza** que *fluye* sola")).toEqual([
      { texto: "Una " },
      { texto: "fuerza", negrita: true },
      { texto: " que " },
      { texto: "fluye", cursiva: true },
      { texto: " sola" },
    ]);
  });

  it("deja tal cual lo que no cierra, y los asteriscos sueltos", () => {
    expect(parsearInline("2 * 3 y **sin cerrar")).toEqual([{ texto: "2 * 3 y **sin cerrar" }]);
  });

  it("un texto sin marcas es un solo segmento", () => {
    expect(parsearInline("Hola")).toEqual([{ texto: "Hola" }]);
  });
});
