import "server-only";
import { prisma } from "@/lib/prisma";
import { intakeADatosNacimiento } from "@/lib/astro/intake";
import type { CartaNatal, DatosNacimiento, Lugar } from "@/lib/astro/types";
import { calcularCarta } from "./engine";
import { geocodificar } from "./geocode";
import {
  crearLlamadaIA,
  estimarCostoUSD,
  redactarSeccion,
  seccionesAplicables,
  sumarUso,
  USO_VACIO,
  type LlamarIA,
  type SeccionId,
  type UsoIA,
} from "./interpret";

/**
 * Pipeline del informe de carta astral, UN paso por llamada (cada paso es una petición corta):
 *   PENDIENTE --carta--> CALCULADO --una sección por paso--> REDACTADO --(Beto)--> ENTREGADO
 * Un fallo no cambia el estado: se guarda en `lastError` y el mismo paso se puede reintentar.
 */

export const SLUG_CARTA_ASTRAL = "carta-astral";

export type EstadoInforme = "PENDIENTE" | "CALCULADO" | "REDACTADO" | "ENTREGADO";

export interface SeccionGuardada {
  id: SeccionId;
  titulo: string;
  markdown: string;
  advertencias: string[];
  modelo: string;
  /** true si Beto la modificó a mano. */
  editada: boolean;
}

export interface UsoGuardado extends UsoIA {
  costoUSD: number | null;
}

export interface ResultadoPaso {
  estado: EstadoInforme;
  /** Qué hizo este paso: "carta", el id de la sección redactada, o null si no había nada pendiente. */
  paso: "carta" | SeccionId | null;
  /** Quedan pasos por ejecutar. */
  quedanPasos: boolean;
  error?: string;
}

/** Crea el informe (en PENDIENTE) de cada reserva de carta astral pagada que aún no lo tiene. */
export async function asegurarInformesPagados(): Promise<number> {
  const sinInforme = await prisma.booking.findMany({
    where: { paymentStatus: "PAID", service: { slug: SLUG_CARTA_ASTRAL }, astroReport: null },
    select: { id: true },
  });
  if (sinInforme.length === 0) return 0;
  const { count } = await prisma.astroReport.createMany({
    data: sinInforme.map((b) => ({ bookingId: b.id })),
    skipDuplicates: true,
  });
  return count;
}

function comoJson<T>(valor: unknown): T | null {
  return valor && typeof valor === "object" ? (valor as T) : null;
}

/** Ejecuta el siguiente paso pendiente del informe. Nunca lanza: los fallos quedan en `lastError`. */
export async function avanzarInforme(informeId: string, llamar?: LlamarIA): Promise<ResultadoPaso> {
  const informe = await prisma.astroReport.findUnique({
    where: { id: informeId },
    include: { booking: { select: { guestName: true, user: { select: { firstName: true, lastName: true } }, intakeData: true } } },
  });
  if (!informe) return { estado: "PENDIENTE", paso: null, quedanPasos: false, error: "El informe no existe." };

  const estado = informe.status as EstadoInforme;
  const falla = async (mensaje: string): Promise<ResultadoPaso> => {
    await prisma.astroReport.update({ where: { id: informeId }, data: { lastError: mensaje } });
    return { estado, paso: null, quedanPasos: true, error: mensaje };
  };

  try {
    if (estado === "ENTREGADO") return { estado, paso: null, quedanPasos: false };

    /* Paso 1: datos -> lugar -> carta */
    if (estado === "PENDIENTE") {
      const u = informe.booking.user;
      const nombreCliente = u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : (informe.booking.guestName ?? "");
      const intake = comoJson<Record<string, unknown>>(informe.booking.intakeData);
      const convertido = intakeADatosNacimiento(intake, nombreCliente);
      if ("error" in convertido) return await falla(convertido.error);
      const datos: DatosNacimiento = convertido.datos;

      const geo = await geocodificar(datos.ciudad, datos.pais, { region: datos.region });
      const carta = calcularCarta(datos, geo.lugar);
      await prisma.astroReport.update({
        where: { id: informeId },
        data: {
          status: "CALCULADO",
          input: datos as object,
          place: geo.lugar as object,
          placeWarnings: geo.advertencias as object,
          chartJson: carta as unknown as object,
          lastError: null,
        },
      });
      return { estado: "CALCULADO", paso: "carta", quedanPasos: seccionesAplicables(carta).length > 0 };
    }

    /* Pasos siguientes: una sección por llamada */
    const carta = comoJson<CartaNatal>(informe.chartJson);
    if (!carta) return await falla("El informe no tiene la carta calculada.");
    const hechas = (comoJson<SeccionGuardada[]>(informe.sections) ?? []) as SeccionGuardada[];
    const faltantes = seccionesAplicables(carta).filter((id) => !hechas.some((s) => s.id === id));

    if (faltantes.length === 0) {
      if (estado !== "REDACTADO") await prisma.astroReport.update({ where: { id: informeId }, data: { status: "REDACTADO" } });
      return { estado: "REDACTADO", paso: null, quedanPasos: false };
    }

    const id = faltantes[0];
    const generada = await redactarSeccion(id, carta, llamar ?? crearLlamadaIA());
    const uso = comoJson<UsoGuardado>(informe.usage);
    const total = sumarUso(uso ?? USO_VACIO, generada.uso);
    const usoNuevo: UsoGuardado = { ...total, costoUSD: estimarCostoUSD(total, generada.modelo) };
    const secciones: SeccionGuardada[] = [
      ...hechas,
      { id, titulo: generada.titulo, markdown: generada.markdown, advertencias: generada.advertencias, modelo: generada.modelo, editada: false },
    ];
    const termino = faltantes.length === 1;
    await prisma.astroReport.update({
      where: { id: informeId },
      data: { sections: secciones as unknown as object, usage: usoNuevo as unknown as object, status: termino ? "REDACTADO" : "CALCULADO", lastError: null },
    });
    return { estado: termino ? "REDACTADO" : "CALCULADO", paso: id, quedanPasos: !termino };
  } catch (e) {
    return await falla(e instanceof Error ? e.message : "Error desconocido.");
  }
}

export type { Lugar };
