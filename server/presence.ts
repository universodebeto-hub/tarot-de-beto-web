import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";

/**
 * Estado "en línea" del proveedor (Fase 3) — Alberto es el único ADMIN, así
 * que el estado se lee/escribe sobre ese único usuario. Sin WebSockets: el
 * sitio público lo lee al cargar la página (o por polling si se agrega
 * después), y el admin lo prende/apaga a mano desde el panel.
 */

export interface ProviderPresence {
  isOnline: boolean;
  lastSeenAt: Date | null;
}

export async function getProviderPresence(): Promise<ProviderPresence> {
  const provider = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { isOnline: true, lastSeenAt: true },
    orderBy: { createdAt: "asc" },
  });
  return provider ?? { isOnline: false, lastSeenAt: null };
}

export async function toggleProviderOnline(): Promise<ProviderPresence> {
  const admin = await requireAdmin();
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: admin.id },
    select: { isOnline: true },
  });

  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: { isOnline: !current.isOnline, lastSeenAt: new Date() },
    select: { isOnline: true, lastSeenAt: true },
  });

  await logAdminAction({
    adminId: admin.id,
    action: updated.isOnline ? "presence.online" : "presence.offline",
    targetType: "User",
    targetId: admin.id,
  });

  return updated;
}
