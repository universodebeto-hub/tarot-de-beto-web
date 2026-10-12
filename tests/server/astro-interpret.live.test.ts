import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { calcularCarta } from "@/server/astro/engine";
import { crearLlamadaAnthropic, redactarInforme } from "@/server/astro/interpret";
import type { DatosNacimiento, Lugar } from "@/lib/astro/types";

/**
 * PRUEBA REAL contra la API de Claude (gasta dinero) -- desactivada por defecto.
 * Sirve para medir tokens y costo de un informe completo y leer el resultado.
 *
 *   ANTHROPIC_API_KEY=... ASTRO_LIVE_AI=1 npx vitest run tests/server/astro-interpret.live.test.ts
 *
 * Usa una persona FICTICIA. Escribe el informe en `informe-de-prueba.md` (ignorado por git).
 */
const LUGAR: Lugar = { nombreMostrado: "Bogotá", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" };
const DATOS: DatosNacimiento = { nombre: "Persona de prueba", fecha: "1992-09-20", hora: "14:45", precision: "exacta", ciudad: "Bogotá", pais: "Colombia" };

describe.skipIf(!process.env.ASTRO_LIVE_AI)("redacción real con Claude", () => {
  it("redacta un informe completo y reporta tokens y costo", async () => {
    const carta = calcularCarta(DATOS, LUGAR);
    const informe = await redactarInforme(carta, crearLlamadaAnthropic());

    const palabras = informe.secciones.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0);
    const resumen = [
      `Secciones: ${informe.secciones.length} · Palabras: ${palabras}`,
      `Tokens: entrada ${informe.usoTotal.entrada}, salida ${informe.usoTotal.salida}, caché leída ${informe.usoTotal.cacheLeido}, caché escrita ${informe.usoTotal.cacheEscrito}`,
      `Costo estimado: ${informe.costoUSD === null ? "sin tarifa registrada" : `US$ ${informe.costoUSD.toFixed(4)}`}`,
      `Avisos de validación: ${informe.secciones.flatMap((s) => s.advertencias).length}`,
    ].join("\n");

    const cuerpo = informe.secciones
      .map((s) => `## ${s.titulo}\n\n${s.markdown}\n\n${s.advertencias.map((a) => `> AVISO: ${a}`).join("\n")}`)
      .join("\n\n");
    writeFileSync("informe-de-prueba.md", `# Informe de prueba\n\n\`\`\`\n${resumen}\n\`\`\`\n\n${cuerpo}\n`, "utf8");

    expect(informe.secciones.length).toBeGreaterThan(0);
    expect(palabras).toBeGreaterThan(1500);
  }, 600_000);
});
