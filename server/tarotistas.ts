import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Perfiles públicos de tarotistas (Fase 2 de la reestructuración de
 * agenda) — reemplaza conceptualmente la sección "Agenda" del sitio.
 * Solo perfiles activos, en el orden que decide el admin (`sortOrder`).
 */
export async function getActiveTarotistas() {
  return prisma.tarotista.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getTarotistaBySlug(slug: string) {
  return prisma.tarotista.findUnique({ where: { slug } });
}
