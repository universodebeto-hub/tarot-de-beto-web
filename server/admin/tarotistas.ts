import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";

export async function listTarotistasAdmin() {
  return prisma.tarotista.findMany({
    orderBy: { sortOrder: "asc" },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });
}

export interface LinkResult {
  error?: string;
}

/**
 * Vincula el perfil de un tarotista a una cuenta ya existente (por email) —
 * es lo que habilita el acceso a /panel-tarotista para esa persona. Sin
 * esto, el modelo Tarotista.userId opcional (Fase 1) queda sin forma de
 * completarse: acá es donde el admin decide quién controla cada perfil.
 */
export async function linkTarotistaAccount(tarotistaId: string, email: string): Promise<LinkResult> {
  const admin = await requireAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "Ingresa el correo de la cuenta a vincular." };

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return { error: "No existe ninguna cuenta con ese correo. La persona debe registrarse primero." };

  const alreadyLinked = await prisma.tarotista.findUnique({ where: { userId: user.id } });
  if (alreadyLinked && alreadyLinked.id !== tarotistaId) {
    return { error: `Esa cuenta ya está vinculada al perfil de ${alreadyLinked.name}.` };
  }

  await prisma.tarotista.update({ where: { id: tarotistaId }, data: { userId: user.id } });
  await logAdminAction({
    adminId: admin.id,
    action: "tarotista.account_linked",
    targetType: "Tarotista",
    targetId: tarotistaId,
    details: normalizedEmail,
  });

  return {};
}

export async function unlinkTarotistaAccount(tarotistaId: string): Promise<LinkResult> {
  const admin = await requireAdmin();

  await prisma.tarotista.update({ where: { id: tarotistaId }, data: { userId: null } });
  await logAdminAction({
    adminId: admin.id,
    action: "tarotista.account_unlinked",
    targetType: "Tarotista",
    targetId: tarotistaId,
  });

  return {};
}
