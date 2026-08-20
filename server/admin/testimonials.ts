import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { TestimonialStatus } from "@prisma/client";

export async function listTestimonialsAdmin(status?: TestimonialStatus) {
  return prisma.testimonial.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });
}

export async function setTestimonialStatus(id: string, status: TestimonialStatus): Promise<void> {
  const admin = await requireAdmin();
  await prisma.testimonial.update({ where: { id }, data: { status } });
  await logAdminAction({
    adminId: admin.id,
    action: "testimonial.status_change",
    targetType: "Testimonial",
    targetId: id,
    details: status,
  });
}
