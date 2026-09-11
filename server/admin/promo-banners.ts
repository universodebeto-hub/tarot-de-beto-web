import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";
import type { PromoBannerPosition } from "@prisma/client";

export async function listPromoBannersAdmin() {
  await requireAdmin();
  return prisma.promoBanner.findMany({ orderBy: [{ position: "asc" }, { sortOrder: "asc" }] });
}

export interface CreatePromoBannerResult {
  error?: string;
}

export async function createPromoBanner(
  input: { imageUrl: string; linkUrl: string; position: PromoBannerPosition },
  currentUser?: CurrentUser | null,
): Promise<CreatePromoBannerResult> {
  const admin = await requireAdmin(currentUser);
  if (!input.imageUrl.trim() || !input.linkUrl.trim()) return { error: "Faltan la imagen o el link." };

  await prisma.promoBanner.create({
    data: { imageUrl: input.imageUrl, linkUrl: input.linkUrl.trim(), position: input.position },
  });
  await logAdminAction({ adminId: admin.id, action: "promo_banner.created", targetType: "PromoBanner", targetId: "new" });
  return {};
}

export async function updatePromoBanner(
  id: string,
  input: { imageUrl?: string; linkUrl?: string; position?: PromoBannerPosition },
  currentUser?: CurrentUser | null,
): Promise<CreatePromoBannerResult> {
  const admin = await requireAdmin(currentUser);
  const banner = await prisma.promoBanner.findUnique({ where: { id } });
  if (!banner) return { error: "Banner no encontrado." };

  await prisma.promoBanner.update({
    where: { id },
    data: { imageUrl: input.imageUrl, linkUrl: input.linkUrl?.trim(), position: input.position },
  });
  await logAdminAction({ adminId: admin.id, action: "promo_banner.updated", targetType: "PromoBanner", targetId: id });
  return {};
}

export async function togglePromoBannerActive(id: string, currentUser?: CurrentUser | null): Promise<CreatePromoBannerResult> {
  const admin = await requireAdmin(currentUser);
  const banner = await prisma.promoBanner.findUnique({ where: { id } });
  if (!banner) return { error: "Banner no encontrado." };

  await prisma.promoBanner.update({ where: { id }, data: { active: !banner.active } });
  await logAdminAction({
    adminId: admin.id,
    action: banner.active ? "promo_banner.deactivated" : "promo_banner.activated",
    targetType: "PromoBanner",
    targetId: id,
  });
  return {};
}

export async function deletePromoBanner(id: string, currentUser?: CurrentUser | null): Promise<CreatePromoBannerResult> {
  const admin = await requireAdmin(currentUser);
  const banner = await prisma.promoBanner.findUnique({ where: { id } });
  if (!banner) return { error: "Banner no encontrado." };

  await prisma.promoBanner.delete({ where: { id } });
  await logAdminAction({ adminId: admin.id, action: "promo_banner.deleted", targetType: "PromoBanner", targetId: id });
  return {};
}
