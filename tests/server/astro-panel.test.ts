import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/server/astro/geocode", () => ({
  geocodificar: vi.fn(async () => ({
    lugar: { nombreMostrado: "Bogotá, Colombia", lat: 4.711, lon: -74.0721, zonaHoraria: "America/Bogota" },
    alternativas: [],
    advertencias: [],
  })),
}));

import { prisma } from "@/lib/prisma";
import { loadCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { avanzarInforme } from "@/server/astro/informes";
import { seccionesAplicables, type LlamarIA } from "@/server/astro/interpret";
import {
  avanzarInformeAdmin,
  corregirLugar,
  generarPdfDeInforme,
  guardarFirma,
  guardarSeccion,
  hayFirma,
  listarInformes,
  marcarEntregado,
  obtenerInforme,
  quitarFirma,
} from "@/server/admin/informes";
import type { CartaNatal } from "@/lib/astro/types";
import { resetDb, createTestService, createTestUser } from "../helpers/db";

const llamarFalso: LlamarIA = async () => ({
  texto: "### Idea\n\nTexto de prueba sobre tu Sol en Virgo.",
  modelo: "claude-opus-5-5",
  uso: { entrada: 100, salida: 50, cacheLeido: 0, cacheEscrito: 0 },
});

// PNG mínimo válido (1x1 transparente).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let admin: CurrentUser;
let informeId: string;

async function crearInformeRedactado(): Promise<string> {
  const service = await createTestService({ slug: "carta-astral" });
  const reserva = await prisma.booking.create({
    data: {
      bookingNumber: `T-${Math.random().toString(36).slice(2, 8)}`,
      guestName: "Zulema Quintanilla",
      serviceId: service.id,
      startsAt: new Date(),
      endsAt: new Date(),
      paymentDeadline: new Date(Date.now() + 3_600_000),
      paymentStatus: "PAID",
      status: "CONFIRMED",
      intakeData: { fechaNacimiento: "1992-09-20", horaNacimiento: "14:45", ciudadNacimiento: "Bogotá", paisNacimiento: "Colombia" },
    },
  });
  const informe = await prisma.astroReport.create({ data: { bookingId: reserva.id } });
  await avanzarInforme(informe.id, llamarFalso);
  const carta = (await prisma.astroReport.findUniqueOrThrow({ where: { id: informe.id } })).chartJson as unknown as CartaNatal;
  for (let i = 0; i < seccionesAplicables(carta).length; i++) await avanzarInforme(informe.id, llamarFalso);
  return informe.id;
}

describe("panel de informes de carta astral", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.astroReport.deleteMany();
    const u = await createTestUser({ role: "ADMIN" });
    admin = (await loadCurrentUser({ userId: u.id, role: "ADMIN" }))!;
    informeId = await crearInformeRedactado();
  });

  it("todas las funciones rechazan a quien no es administrador", async () => {
    const cliente = await createTestUser({ role: "CLIENT" });
    const noAdmin = (await loadCurrentUser({ userId: cliente.id, role: "CLIENT" }))!;
    await expect(listarInformes(noAdmin)).rejects.toThrow("No autorizado.");
    await expect(obtenerInforme(informeId, noAdmin)).rejects.toThrow("No autorizado.");
    await expect(avanzarInformeAdmin(informeId, noAdmin)).rejects.toThrow("No autorizado.");
    await expect(guardarSeccion(informeId, "triada", "x", noAdmin)).rejects.toThrow("No autorizado.");
    await expect(marcarEntregado(informeId, noAdmin)).rejects.toThrow("No autorizado.");
    await expect(generarPdfDeInforme(informeId, noAdmin)).rejects.toThrow("No autorizado.");
    await expect(guardarFirma(PNG_1X1, noAdmin)).rejects.toThrow("No autorizado.");
    await expect(corregirLugar(informeId, { ciudad: "X" }, noAdmin)).rejects.toThrow("No autorizado.");
  });

  it("lista y detalla el informe con lo que escribió el cliente y lo que interpretó el sistema", async () => {
    const lista = await listarInformes(admin);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ cliente: "Zulema Quintanilla", estado: "REDACTADO" });
    const d = (await obtenerInforme(informeId, admin))!;
    expect(d.intakeCrudo.ciudadNacimiento).toBe("Bogotá");
    expect(d.lugar?.zonaHoraria).toBe("America/Bogota");
    expect(d.carta?.utc).toContain("1992-09-20T18:45"); // Bogotá tuvo horario de verano en 1992 (UTC−4)
    expect(d.faltantes).toEqual([]);
  });

  it("guardar una sección la marca editada y vuelve a validarla contra la carta", async () => {
    const ok = await guardarSeccion(informeId, "triada", "### Idea\n\nTu Sol en Virgo pide orden.", admin);
    expect(ok.error).toBeUndefined();
    const d = (await obtenerInforme(informeId, admin))!;
    const s = d.secciones.find((x) => x.id === "triada")!;
    expect(s.editada).toBe(true);
    expect(s.markdown).toContain("pide orden");

    const mal = await guardarSeccion(informeId, "triada", "Tu Sol en Aries lo cambia todo.", admin);
    expect(mal.advertencias?.length).toBeGreaterThan(0);

    expect((await guardarSeccion(informeId, "triada", "   ", admin)).error).toMatch(/vacía/);
    expect((await guardarSeccion(informeId, "no-existe", "x", admin)).error).toMatch(/no existe/);
  });

  it("corregir el lugar con coordenadas a mano recalcula la carta y descarta los textos", async () => {
    const mal = await corregirLugar(informeId, { lat: 200, lon: 0, zonaHoraria: "America/Bogota" }, admin);
    expect(mal.error).toMatch(/coordenadas/);
    const malZona = await corregirLugar(informeId, { lat: 10, lon: 10, zonaHoraria: "Marte/Olimpo" }, admin);
    expect(malZona.error).toMatch(/zona horaria/);

    const r = await corregirLugar(informeId, { lat: 40.4168, lon: -3.7038, zonaHoraria: "Europe/Madrid" }, admin);
    expect(r.error).toBeUndefined();
    const d = (await obtenerInforme(informeId, admin))!;
    expect(d.estado).toBe("CALCULADO");
    expect(d.secciones).toEqual([]);
    expect(d.faltantes.length).toBeGreaterThan(0);
    expect(d.lugar?.zonaHoraria).toBe("Europe/Madrid");
    expect(d.carta?.utc).toContain("1992-09-20T12:45"); // 14:45 en Madrid (horario de verano) = 12:45 UTC
  });

  it("corregir buscando de nuevo usa la ciudad nueva", async () => {
    const r = await corregirLugar(informeId, { ciudad: "Medellín", pais: "Colombia", region: "Antioquia" }, admin);
    expect(r.error).toBeUndefined();
    const d = (await obtenerInforme(informeId, admin))!;
    expect(d.datos).toMatchObject({ ciudad: "Medellín", region: "Antioquia" });
  });

  it("entregar solo si está completo; deja la reserva completada y el informe cerrado", async () => {
    await corregirLugar(informeId, { lat: 4.7, lon: -74, zonaHoraria: "America/Bogota" }, admin);
    expect((await marcarEntregado(informeId, admin)).error).toMatch(/todavía no está completo/);

    // Se completa de nuevo y se entrega.
    const carta = (await obtenerInforme(informeId, admin))!.carta!;
    for (let i = 0; i < seccionesAplicables(carta).length; i++) await avanzarInforme(informeId, llamarFalso);
    expect((await marcarEntregado(informeId, admin)).error).toBeUndefined();

    const d = (await obtenerInforme(informeId, admin))!;
    expect(d.estado).toBe("ENTREGADO");
    expect(d.entregado).toBeInstanceOf(Date);
    const reserva = await prisma.booking.findUniqueOrThrow({ where: { id: d.bookingId } });
    expect(reserva.status).toBe("COMPLETED");

    // Cerrado: ya no se edita.
    expect((await guardarSeccion(informeId, "triada", "otro texto", admin)).error).toMatch(/ya fue entregado/);
    expect((await corregirLugar(informeId, { ciudad: "X" }, admin)).error).toMatch(/ya fue entregado/);
  });

  it("la firma solo acepta PNG pequeños y vive en la base de datos", async () => {
    expect(await hayFirma(admin)).toBe(false);
    expect((await guardarFirma(Buffer.from("no soy un png"), admin)).error).toMatch(/PNG/);
    expect((await guardarFirma(Buffer.concat([PNG_1X1, Buffer.alloc(400 * 1024)]), admin)).error).toMatch(/pesa demasiado/);
    expect((await guardarFirma(PNG_1X1, admin)).error).toBeUndefined();
    expect(await hayFirma(admin)).toBe(true);
    await quitarFirma(admin);
    expect(await hayFirma(admin)).toBe(false);
  });

  it("genera el PDF al vuelo con la firma subida y no lo guarda", async () => {
    await guardarFirma(PNG_1X1, admin);
    const r = (await generarPdfDeInforme(informeId, admin))!;
    expect(r.pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(r.nombreArchivo).toBe("Carta-Astral-Zulema-Quintanilla.pdf");
  }, 60_000);
});
