import { prisma } from "@/lib/prisma";
import type { Service, ServiceModality } from "@/types/content";

const MODALITY_LABEL: Record<string, ServiceModality> = {
  VIDEOLLAMADA: "Videollamada",
  LLAMADA: "Llamada",
  PRESENCIAL: "Presencial",
};

function toService(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: unknown;
  currency: string;
  available: boolean;
  modality: string;
  category: string;
}): Service {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    currency: row.currency,
    available: row.available,
    modality: MODALITY_LABEL[row.modality] ?? "Videollamada",
    category: row.category,
  };
}

/** Todos los servicios (disponibles y no disponibles), en el orden definido por el admin. */
export async function getServices(): Promise<Service[]> {
  const rows = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(toService);
}

/** Servicios disponibles, para bloques destacados (ej. home). */
export async function getFeaturedServices(limit = 3): Promise<Service[]> {
  const rows = await prisma.service.findMany({
    where: { available: true },
    orderBy: { sortOrder: "asc" },
    take: limit,
  });
  return rows.map(toService);
}

/** Un servicio por id, o null si no existe. */
export async function getServiceById(id: string): Promise<Service | null> {
  const row = await prisma.service.findUnique({ where: { id } });
  return row ? toService(row) : null;
}
