import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "El slug solo puede tener minúsculas, números y guiones"),
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0),
  currency: z.string().trim().min(3).max(3).default("USD"),
  modality: z.enum(["VIDEOLLAMADA", "LLAMADA", "PRESENCIAL"]),
  category: z.string().trim().min(1, "La categoría es obligatoria"),
  sortOrder: z.coerce.number().int().default(0),
  available: z.coerce.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export interface AdminFormState {
  error?: string;
  success?: boolean;
}

export async function createServiceAdmin(
  _prev: AdminFormState,
  formData: FormData,
  currentUser?: CurrentUser | null,
): Promise<AdminFormState> {
  const admin = await requireAdmin(currentUser);

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price"),
    currency: formData.get("currency") || "USD",
    modality: formData.get("modality"),
    category: formData.get("category"),
    sortOrder: formData.get("sortOrder") || 0,
    available: formData.get("available") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const existing = await prisma.service.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { error: "Ya existe un servicio con ese slug." };

  const service = await prisma.service.create({ data: parsed.data });
  await logAdminAction({
    adminId: admin.id,
    action: "service.created",
    targetType: "Service",
    targetId: service.id,
    details: service.name,
  });

  return { success: true };
}

export async function updateServiceAdmin(
  serviceId: string,
  _prev: AdminFormState,
  formData: FormData,
  currentUser?: CurrentUser | null,
): Promise<AdminFormState> {
  const admin = await requireAdmin(currentUser);

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price"),
    currency: formData.get("currency") || "USD",
    modality: formData.get("modality"),
    category: formData.get("category"),
    sortOrder: formData.get("sortOrder") || 0,
    available: formData.get("available") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const existing = await prisma.service.findFirst({
    where: { slug: parsed.data.slug, NOT: { id: serviceId } },
  });
  if (existing) return { error: "Ya existe otro servicio con ese slug." };

  await prisma.service.update({ where: { id: serviceId }, data: parsed.data });
  await logAdminAction({
    adminId: admin.id,
    action: "service.updated",
    targetType: "Service",
    targetId: serviceId,
    details: parsed.data.name,
  });

  return { success: true };
}

export async function toggleServiceAvailability(serviceId: string, currentUser?: CurrentUser | null): Promise<void> {
  const admin = await requireAdmin(currentUser);
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  await prisma.service.update({ where: { id: serviceId }, data: { available: !service.available } });
  await logAdminAction({
    adminId: admin.id,
    action: service.available ? "service.deactivated" : "service.activated",
    targetType: "Service",
    targetId: serviceId,
  });
}
