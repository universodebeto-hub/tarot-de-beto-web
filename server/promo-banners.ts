import "server-only";
import { prisma } from "@/lib/prisma";

/** Banners activos, agrupados por lado -- lectura pública (sin auth) para las barras laterales del sitio. */
export async function listActivePromoBanners() {
  const banners = await prisma.promoBanner.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return {
    left: banners.filter((b) => b.position === "LEFT"),
    right: banners.filter((b) => b.position === "RIGHT"),
    all: banners,
  };
}
