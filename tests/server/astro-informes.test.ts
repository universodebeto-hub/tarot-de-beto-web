import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/server/astro/geocode", () => ({
  geocodificar: vi.fn(async () => ({
    lugar: { nombreMostrado: "Bogotá, Colombia", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" },
    alternativas: [],
    advertencias: [],
  })),
}));

import { prisma } from "@/lib/prisma";
import { asegurarInformesPagados, avanzarInforme } from "@/server/astro/informes";
import { seccionesAplicables, type LlamarIA, type PeticionIA } from "@/server/astro/interpret";
import type { CartaNatal } from "@/lib/astro/types";
import { resetDb, createTestService } from "../helpers/db";

const intakeOk = { fechaNacimiento: "1992-09-20", horaNacimiento: "14:45", ciudadNacimiento: "Bogotá", paisNacimiento: "Colombia" };

async function crearReserva(opts: { slug?: string; pagada?: boolean; intake?: Record<string, string> } = {}) {
  const slug = opts.slug ?? "carta-astral";
  const service = (await prisma.service.findUnique({ where: { slug } })) ?? (await createTestService({ slug }));
  return prisma.booking.create({
    data: {
      bookingNumber: `T-${Math.random().toString(36).slice(2, 8)}`,
      guestName: "Zulema Quintanilla",
      guestEmail: "z@example.com",
      serviceId: service.id,
      startsAt: new Date(),
      endsAt: new Date(),
      paymentDeadline: new Date(Date.now() + 3_600_000),
      paymentStatus: opts.pagada === false ? "UNPAID" : "PAID",
      intakeData: opts.intake ?? intakeOk,
    },
  });
}

const peticiones: PeticionIA[] = [];
const llamarFalso: LlamarIA = async (p) => {
  peticiones.push(p);
  return {
    texto: "### Idea\n\nTexto de prueba.",
    modelo: "claude-opus-5-5",
    uso: { entrada: 1000, salida: 500, cacheLeido: 0, cacheEscrito: 0 },
  };
};

describe("pipeline del informe de carta astral", () => {
  beforeEach(async () => {
    await resetDb();
    peticiones.length = 0;
  });

  it("solo crea informes para reservas pagadas de carta astral, sin duplicar", async () => {
    await crearReserva();
    await crearReserva({ pagada: false });
    await crearReserva({ slug: "informe-numerologico" });
    expect(await asegurarInformesPagados()).toBe(1);
    expect(await asegurarInformesPagados()).toBe(0);
    expect(await prisma.astroReport.count()).toBe(1);
  });

  it("avanza paso a paso: carta, luego una sección por paso, hasta REDACTADO", async () => {
    await crearReserva();
    await asegurarInformesPagados();
    const informe = (await prisma.astroReport.findFirst())!;
    expect(informe.status).toBe("PENDIENTE");

    const paso1 = await avanzarInforme(informe.id, llamarFalso);
    expect(paso1).toMatchObject({ estado: "CALCULADO", paso: "carta", quedanPasos: true });
    expect(peticiones).toHaveLength(0); // calcular la carta no llama a la IA
    const calculado = (await prisma.astroReport.findUnique({ where: { id: informe.id } }))!;
    expect(calculado.input).toMatchObject({ nombre: "Zulema Quintanilla", fecha: "1992-09-20" });
    expect(calculado.place).toMatchObject({ zonaHoraria: "America/Bogota" });
    const carta = calculado.chartJson as unknown as CartaNatal;
    expect(carta.puntos.find((p) => p.punto === "sol")?.signo).toBe("virgo");

    const total = seccionesAplicables(carta).length;
    let ultimo = paso1;
    for (let i = 0; i < total; i++) ultimo = await avanzarInforme(informe.id, llamarFalso);
    expect(ultimo).toMatchObject({ estado: "REDACTADO", quedanPasos: false });
    expect(peticiones).toHaveLength(total);

    const final = (await prisma.astroReport.findUnique({ where: { id: informe.id } }))!;
    expect(final.status).toBe("REDACTADO");
    expect((final.sections as unknown[]).length).toBe(total);
    expect((final.usage as { costoUSD: number }).costoUSD).toBeGreaterThan(0);

    // Ya no hay nada más que hacer.
    expect(await avanzarInforme(informe.id, llamarFalso)).toMatchObject({ paso: null, quedanPasos: false });
  });

  it("la IA nunca recibe el nombre, la fecha, la ciudad ni las coordenadas del cliente", async () => {
    await crearReserva();
    await asegurarInformesPagados();
    const informe = (await prisma.astroReport.findFirst())!;
    await avanzarInforme(informe.id, llamarFalso);
    await avanzarInforme(informe.id, llamarFalso);
    const enviado = JSON.stringify(peticiones);
    for (const secreto of ["Zulema", "Quintanilla", "1992", "Bogotá", "Colombia", "4.711", "74.07", "z@example.com"]) {
      expect(enviado).not.toContain(secreto);
    }
  });

  it("datos inválidos: no cambia el estado y deja el error para mostrarlo", async () => {
    await crearReserva({ intake: { ...intakeOk, horaNacimiento: "99:99" } });
    await asegurarInformesPagados();
    const informe = (await prisma.astroReport.findFirst())!;
    const r = await avanzarInforme(informe.id, llamarFalso);
    expect(r.error).toMatch(/hora de nacimiento/);
    const guardado = (await prisma.astroReport.findUnique({ where: { id: informe.id } }))!;
    expect(guardado.status).toBe("PENDIENTE");
    expect(guardado.lastError).toMatch(/hora de nacimiento/);
  });

  it("si la IA falla, reintentar el paso continúa donde quedó", async () => {
    await crearReserva();
    await asegurarInformesPagados();
    const informe = (await prisma.astroReport.findFirst())!;
    await avanzarInforme(informe.id, llamarFalso);

    const rota: LlamarIA = async () => {
      throw new Error("API caída");
    };
    const fallo = await avanzarInforme(informe.id, rota);
    expect(fallo.error).toBe("API caída");
    expect((await prisma.astroReport.findUnique({ where: { id: informe.id } }))!.lastError).toBe("API caída");

    const bien = await avanzarInforme(informe.id, llamarFalso);
    expect(bien.error).toBeUndefined();
    const guardado = (await prisma.astroReport.findUnique({ where: { id: informe.id } }))!;
    expect(guardado.lastError).toBeNull();
    expect((guardado.sections as unknown[]).length).toBe(1);
  });
});
