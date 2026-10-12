import { describe, it, expect, beforeAll } from "vitest";
import * as mupdf from "mupdf";
import { calcularCarta } from "@/server/astro/engine";
import { generarInformePdf, type DatosPdf } from "@/server/astro/pdf";
import { SECCIONES } from "@/server/astro/interpret";
import type { DatosNacimiento, Lugar } from "@/lib/astro/types";

/** Persona FICTICIA: el repo es público. */
const BOGOTA: Lugar = { nombreMostrado: "Bogotá", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" };
const NACIMIENTO: DatosNacimiento = {
  nombre: "Zulema Quintanilla",
  fecha: "1992-09-20",
  hora: "14:45",
  precision: "exacta",
  ciudad: "Bogotá",
  pais: "Colombia",
};

const PARRAFO = "Tu **Sol** en Virgo busca orden y servicio. ".repeat(18);
const secciones = SECCIONES.map((s) => ({
  id: s.id,
  titulo: s.titulo,
  markdown: `### Idea principal\n\n${PARRAFO}\n\n- Primer punto de la lectura\n- Segundo punto de la lectura\n\n### Para integrar\n\n${PARRAFO}`,
}));

function base(carta = calcularCarta(NACIMIENTO, BOGOTA)): DatosPdf {
  return {
    carta,
    secciones,
    firma: { tipo: "texto", texto: "Alberto Arango" },
    contacto: { sitio: "https://www.tarotdebeto.com", whatsapp: "+573000000000", email: "contacto@example.com" },
    fechaElaboracion: new Date("2026-10-12T12:00:00Z"),
  };
}

function textos(pdf: Buffer): string[] {
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  return Array.from({ length: doc.countPages() }, (_, i) => doc.loadPage(i).toStructuredText("preserve-whitespace").asText());
}

/** El texto con letras espaciadas (letter-spacing) se extrae letra por letra: se compara sin espacios. */
const compacto = (t: string) => t.replace(/\s+/g, "");

describe("informe en PDF", () => {
  let paginas: string[];
  let pdf: Buffer;

  beforeAll(async () => {
    pdf = await generarInformePdf(base());
    paginas = textos(pdf);
  }, 60_000);

  it("es un PDF válido con varias páginas", () => {
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(paginas.length).toBeGreaterThan(8);
  });

  it("la portada lleva el nombre, el título y los datos de nacimiento", () => {
    expect(paginas[0]).toContain("Carta Astral");
    expect(paginas[0]).toContain("Zulema Quintanilla");
    expect(paginas[0]).toContain("20 de septiembre de 1992");
  });

  it("ninguna página interior queda en blanco", () => {
    for (const [i, texto] of paginas.slice(1).entries()) {
      const util = compacto(texto).replace(/TAROTDEBETO|CARTAASTRAL·ZULEMAQUINTANILLA|Página\d+de\d+/gi, "");
      expect(util.length, `la página ${i + 2} está vacía`).toBeGreaterThan(20);
    }
  });

  it("cada página interior lleva encabezado y numeración", () => {
    for (const [i, texto] of paginas.slice(1).entries()) {
      expect(compacto(texto), `encabezado en la página ${i + 2}`).toContain("TAROTDEBETO");
      expect(compacto(texto)).toContain(`Página${i + 2}de${paginas.length}`);
    }
  });

  it("incluye la rueda, las tablas y cómo leer el informe", () => {
    const todo = paginas.join("\n");
    expect(todo).toContain("La rueda de tu carta");
    expect(todo).toContain("Tabla técnica");
    expect(todo).toContain("Cómo leer este informe");
  });

  it("el cierre trae la firma, el aviso y los datos de contacto", () => {
    const ultima = paginas[paginas.length - 1];
    expect(ultima).toContain("Un último mensaje");
    expect(ultima).toContain("Alberto Arango");
    expect(ultima).toContain("www.tarotdebeto.com");
    expect(ultima).toContain("+573000000000");
  });

  it("sin hora de nacimiento genera el informe y lo advierte en la rueda", async () => {
    const carta = calcularCarta({ ...NACIMIENTO, hora: "12:00", precision: "desconocida" }, BOGOTA);
    const sinHora = textos(await generarInformePdf(base(carta)));
    expect(sinHora.join("\n")).toContain("SIN HORA DE NACIMIENTO");
  }, 60_000);
});
