import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { siteConfig } from "@/config/site";
import { setBookingStatus } from "@/server/admin/bookings";
import { calcularCarta } from "@/server/astro/engine";
import { geocodificar } from "@/server/astro/geocode";
import {
  asegurarInformesPagados,
  avanzarInforme,
  type EstadoInforme,
  type ResultadoPaso,
  type SeccionGuardada,
} from "@/server/astro/informes";
import { crearLlamadaAnthropic, redactarSeccion, SECCIONES, type SeccionId } from "@/server/astro/interpret";
import { validarTexto } from "@/server/astro/validate";
import { generarInformePdf, type FirmaPdf } from "@/server/astro/pdf";
import type { CartaNatal, DatosNacimiento, Lugar } from "@/lib/astro/types";
import type { CurrentUser } from "@/lib/auth/session";

/** Panel de informes de carta astral (Fase 6). Cada función exige administrador. */

const CLAVE_FIRMA = "astro_firma_png";
const MAX_FIRMA_BYTES = 300 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface FilaInforme {
  id: string;
  bookingId: string;
  bookingNumber: string;
  cliente: string;
  estado: EstadoInforme;
  error: string | null;
  seccionesHechas: number;
  creado: Date;
  entregado: Date | null;
}

function nombreCliente(
  u: { firstName: string; lastName: string | null } | null,
  invitado: string | null,
): string {
  return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : (invitado ?? "—");
}

export async function listarInformes(currentUser?: CurrentUser | null): Promise<FilaInforme[]> {
  await requireAdmin(currentUser);
  await asegurarInformesPagados();
  const informes = await prisma.astroReport.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      booking: { select: { bookingNumber: true, guestName: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });
  return informes.map((i) => ({
    id: i.id,
    bookingId: i.bookingId,
    bookingNumber: i.booking.bookingNumber,
    cliente: nombreCliente(i.booking.user, i.booking.guestName),
    estado: i.status as EstadoInforme,
    error: i.lastError,
    seccionesHechas: Array.isArray(i.sections) ? i.sections.length : 0,
    creado: i.createdAt,
    entregado: i.deliveredAt,
  }));
}

export interface DetalleInforme {
  id: string;
  bookingId: string;
  bookingNumber: string;
  cliente: string;
  email: string | null;
  estado: EstadoInforme;
  error: string | null;
  /** Lo que escribió el cliente al reservar, tal cual. */
  intakeCrudo: Record<string, string>;
  datos: DatosNacimiento | null;
  lugar: Lugar | null;
  avisosLugar: string[];
  carta: CartaNatal | null;
  secciones: SeccionGuardada[];
  /** Ids de las secciones que corresponden a esta carta y todavía no se redactaron. */
  faltantes: SeccionId[];
  uso: { entrada: number; salida: number; costoUSD: number | null } | null;
  entregado: Date | null;
}

export async function obtenerInforme(id: string, currentUser?: CurrentUser | null): Promise<DetalleInforme | null> {
  await requireAdmin(currentUser);
  const i = await prisma.astroReport.findUnique({
    where: { id },
    include: {
      booking: { select: { bookingNumber: true, guestName: true, guestEmail: true, intakeData: true, user: true } },
    },
  });
  if (!i) return null;
  const carta = (i.chartJson as unknown as CartaNatal | null) ?? null;
  const secciones = (Array.isArray(i.sections) ? i.sections : []) as unknown as SeccionGuardada[];
  const aplicables = carta ? SECCIONES.filter((s) => !s.requiereHora || carta.casas.length > 0).map((s) => s.id) : [];
  const intake = i.booking.intakeData;
  return {
    id: i.id,
    bookingId: i.bookingId,
    bookingNumber: i.booking.bookingNumber,
    cliente: nombreCliente(i.booking.user, i.booking.guestName),
    email: i.booking.user?.email ?? i.booking.guestEmail,
    estado: i.status as EstadoInforme,
    error: i.lastError,
    intakeCrudo: intake && typeof intake === "object" && !Array.isArray(intake) ? (intake as Record<string, string>) : {},
    datos: (i.input as unknown as DatosNacimiento | null) ?? null,
    lugar: (i.place as unknown as Lugar | null) ?? null,
    avisosLugar: Array.isArray(i.placeWarnings) ? (i.placeWarnings as string[]) : [],
    carta,
    secciones,
    faltantes: aplicables.filter((sid) => !secciones.some((s) => s.id === sid)),
    uso: (i.usage as DetalleInforme["uso"]) ?? null,
    entregado: i.deliveredAt,
  };
}

/** Un paso del borrador (carta o una sección). El panel lo llama en bucle, mostrando el avance. */
export async function avanzarInformeAdmin(id: string, currentUser?: CurrentUser | null): Promise<ResultadoPaso> {
  await requireAdmin(currentUser);
  return avanzarInforme(id);
}

async function cargarEditable(id: string) {
  const informe = await prisma.astroReport.findUnique({ where: { id } });
  if (!informe) return { error: "El informe no existe." as const };
  if (informe.status === "ENTREGADO") return { error: "El informe ya fue entregado: no se puede modificar." as const };
  return { informe };
}

export async function guardarSeccion(
  id: string,
  seccionId: string,
  markdown: string,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string; advertencias?: string[] }> {
  const admin = await requireAdmin(currentUser);
  const r = await cargarEditable(id);
  if ("error" in r) return { error: r.error };
  const texto = markdown.trim();
  if (!texto) return { error: "La sección no puede quedar vacía." };
  if (texto.length > 20_000) return { error: "El texto es demasiado largo." };
  const carta = r.informe.chartJson as unknown as CartaNatal | null;
  const secciones = (r.informe.sections ?? []) as unknown as SeccionGuardada[];
  const idx = secciones.findIndex((s) => s.id === seccionId);
  if (!carta || idx < 0) return { error: "La sección no existe." };
  const advertencias = validarTexto(texto, carta);
  secciones[idx] = { ...secciones[idx], markdown: texto, advertencias, editada: true };
  await prisma.astroReport.update({ where: { id }, data: { sections: secciones as unknown as object } });
  await logAdminAction({
    adminId: admin.id,
    action: "astro.section_edited",
    targetType: "AstroReport",
    targetId: id,
    details: seccionId,
  });
  return { advertencias };
}

export async function regenerarSeccion(
  id: string,
  seccionId: string,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  const r = await cargarEditable(id);
  if ("error" in r) return { error: r.error };
  const carta = r.informe.chartJson as unknown as CartaNatal | null;
  const secciones = (r.informe.sections ?? []) as unknown as SeccionGuardada[];
  const idx = secciones.findIndex((s) => s.id === seccionId);
  if (!carta || idx < 0) return { error: "La sección no existe." };
  try {
    const g = await redactarSeccion(secciones[idx].id, carta, crearLlamadaAnthropic());
    secciones[idx] = {
      id: g.id,
      titulo: g.titulo,
      markdown: g.markdown,
      advertencias: g.advertencias,
      modelo: g.modelo,
      editada: false,
    };
    await prisma.astroReport.update({
      where: { id },
      data: { sections: secciones as unknown as object, lastError: null },
    });
    await logAdminAction({
      adminId: admin.id,
      action: "astro.section_regenerated",
      targetType: "AstroReport",
      targetId: id,
      details: seccionId,
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo regenerar la sección." };
  }
}

export interface CorreccionLugar {
  /** Si se dan, se vuelve a buscar la ciudad con estos textos. */
  ciudad?: string;
  pais?: string;
  region?: string;
  /** Si se dan lat y lon, se usan tal cual (sin buscar). */
  lat?: number;
  lon?: number;
  zonaHoraria?: string;
}

function zonaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/**
 * Corrige el lugar (nueva búsqueda o coordenadas a mano), recalcula la carta y descarta las
 * secciones ya redactadas: dependen de la carta y hay que volver a generarlas.
 */
export async function corregirLugar(
  id: string,
  correccion: CorreccionLugar,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  const r = await cargarEditable(id);
  if ("error" in r) return { error: r.error };
  const datosActuales = r.informe.input as unknown as DatosNacimiento | null;
  if (!datosActuales) return { error: "Primero hay que generar la carta." };

  try {
    let datos = datosActuales;
    let lugar: Lugar;
    let avisos: string[] = [];
    if (correccion.lat !== undefined || correccion.lon !== undefined) {
      const { lat, lon, zonaHoraria } = correccion;
      if (
        lat === undefined ||
        lon === undefined ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      ) {
        return { error: "Las coordenadas no son válidas." };
      }
      if (!zonaHoraria || !zonaValida(zonaHoraria)) {
        return { error: "La zona horaria no es válida (ejemplo: America/Bogota)." };
      }
      lugar = {
        nombreMostrado: `${datos.ciudad}, ${datos.pais} (coordenadas corregidas a mano)`,
        lat,
        lon,
        zonaHoraria,
      };
    } else {
      datos = {
        ...datos,
        ciudad: correccion.ciudad?.trim() || datos.ciudad,
        pais: correccion.pais?.trim() || datos.pais,
        ...(correccion.region?.trim() ? { region: correccion.region.trim() } : {}),
      };
      const geo = await geocodificar(datos.ciudad, datos.pais, { region: datos.region });
      lugar = geo.lugar;
      avisos = geo.advertencias;
    }
    const carta = calcularCarta(datos, lugar);
    await prisma.astroReport.update({
      where: { id },
      data: {
        status: "CALCULADO",
        input: datos as object,
        place: lugar as object,
        placeWarnings: avisos as object,
        chartJson: carta as unknown as object,
        sections: [],
        lastError: null,
      },
    });
    await logAdminAction({
      adminId: admin.id,
      action: "astro.place_corrected",
      targetType: "AstroReport",
      targetId: id,
      details: lugar.nombreMostrado,
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo corregir el lugar." };
  }
}

/** Marca el informe como entregado y, si corresponde, deja la reserva en COMPLETED. */
export async function marcarEntregado(id: string, currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  const r = await cargarEditable(id);
  if ("error" in r) return { error: r.error };
  if (r.informe.status !== "REDACTADO") {
    return { error: "El informe todavía no está completo: falta generar o redactar secciones." };
  }
  await prisma.astroReport.update({ where: { id }, data: { status: "ENTREGADO", deliveredAt: new Date() } });
  const reserva = await prisma.booking.findUnique({ where: { id: r.informe.bookingId }, select: { status: true } });
  if (reserva?.status === "CONFIRMED") await setBookingStatus(r.informe.bookingId, "COMPLETED", admin);
  await logAdminAction({ adminId: admin.id, action: "astro.delivered", targetType: "AstroReport", targetId: id });
  return {};
}

/* ───────────────────────────── Firma (privada, en la base de datos) ───────────────────────────── */

export async function obtenerFirmaPng(): Promise<Buffer | null> {
  const fila = await prisma.setting.findUnique({ where: { key: CLAVE_FIRMA } });
  return fila ? Buffer.from(fila.value, "base64") : null;
}

export async function hayFirma(currentUser?: CurrentUser | null): Promise<boolean> {
  await requireAdmin(currentUser);
  return (await prisma.setting.count({ where: { key: CLAVE_FIRMA } })) > 0;
}

export async function guardarFirma(png: Buffer, currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  if (png.length > MAX_FIRMA_BYTES) return { error: "La imagen pesa demasiado (máximo 300 KB)." };
  if (!PNG_MAGIC.every((b, i) => png[i] === b)) {
    return { error: "La firma debe ser un archivo PNG (con fondo transparente)." };
  }
  const value = png.toString("base64");
  await prisma.setting.upsert({ where: { key: CLAVE_FIRMA }, update: { value }, create: { key: CLAVE_FIRMA, value } });
  await logAdminAction({ adminId: admin.id, action: "astro.signature_saved", targetType: "Setting", targetId: CLAVE_FIRMA });
  return {};
}

export async function quitarFirma(currentUser?: CurrentUser | null): Promise<void> {
  const admin = await requireAdmin(currentUser);
  await prisma.setting.deleteMany({ where: { key: CLAVE_FIRMA } });
  await logAdminAction({ adminId: admin.id, action: "astro.signature_removed", targetType: "Setting", targetId: CLAVE_FIRMA });
}

/* ───────────────────────────── PDF ───────────────────────────── */

/** Genera el PDF en memoria (nunca se guarda). `null` si el informe no tiene carta aún. */
export async function generarPdfDeInforme(
  id: string,
  currentUser?: CurrentUser | null,
): Promise<{ pdf: Buffer; nombreArchivo: string } | null> {
  await requireAdmin(currentUser);
  const i = await prisma.astroReport.findUnique({ where: { id } });
  const carta = i?.chartJson as unknown as CartaNatal | null | undefined;
  if (!i || !carta) return null;
  const png = await obtenerFirmaPng();
  const firma: FirmaPdf | undefined = png ? { tipo: "imagen", png } : undefined;
  const secciones = ((i.sections ?? []) as unknown as SeccionGuardada[]).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    markdown: s.markdown,
  }));
  const pdf = await generarInformePdf({
    carta,
    secciones,
    firma,
    contacto: {
      sitio: siteConfig.siteUrl,
      whatsapp: siteConfig.contact.whatsappNumber || undefined,
      email: siteConfig.contact.email || undefined,
    },
    fechaElaboracion: i.deliveredAt ?? new Date(),
  });
  const limpio = carta.datos.nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { pdf, nombreArchivo: `Carta-Astral-${limpio || "informe"}.pdf` };
}
