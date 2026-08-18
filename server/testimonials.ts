import { prisma } from "@/lib/prisma";
import type { Testimonial } from "@/types/content";

/** Testimonios publicados (ya moderados), para mostrar en el sitio público. */
export async function getPublishedTestimonials(): Promise<Testimonial[]> {
  const rows = await prisma.testimonial.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    text: row.text,
    rating: Math.min(5, Math.max(1, row.rating)) as Testimonial["rating"],
    date: row.createdAt.toISOString(),
  }));
}
