import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";

/**
 * Los 2 perfiles iniciales del proyecto (mismos datos que prisma/seed.ts).
 * Se autocompletan acá, no solo en el seed, porque el seed es un paso
 * manual que no corre solo contra producción (a propósito, para no crear
 * ahí cuentas de prueba) — así el admin no depende de poder ejecutar un
 * script aparte para que existan estos 2 perfiles ni sus datos reales.
 * Corre siempre (no solo si la tabla está vacía), para que una corrección
 * acá también se refleje en producción sin necesitar acceso directo a la
 * base de datos. Seguro por ahora porque no existe ningún formulario para
 * que el admin edite estos campos a mano todavía (Fase 6) — el día que
 * exista, esto debe pasar a tocar `update` solo en la creación inicial,
 * para no pisar una edición manual en cada visita.
 */
async function ensureInitialTarotistas(): Promise<void> {
  const alberto = {
    name: "Alberto Arango",
    bio: "Tarotista con 12 años de experiencia, dedicado a interpretar las cartas como una herramienta de orientación y claridad. Cada lectura busca ayudarte a comprender las energías de tu presente, descubrir nuevas perspectivas y encontrar respuestas para tu camino.",
    experience: "12 años de experiencia",
    photoUrl: "/assets/tarotistas/alberto-arango/photo.webp",
  };
  await prisma.tarotista.upsert({
    where: { slug: "alberto-arango" },
    update: alberto,
    create: { slug: "alberto-arango", sortOrder: 0, ...alberto },
  });

  const kaina = {
    name: "Kaina",
    bio: "Tarotista y guía espiritual con 15 años de experiencia en lecturas de Tarot. Mi propósito es ayudarte a encontrar claridad, orientación y nuevas perspectivas para comprender mejor tu camino y tomar decisiones desde la intuición y el corazón.",
    experience: "15 años de experiencia",
    photoUrl: "/assets/tarotistas/caina/photo.webp",
  };
  await prisma.tarotista.upsert({
    where: { slug: "caina" },
    update: kaina,
    create: { slug: "caina", sortOrder: 1, ...kaina },
  });
}

export async function listTarotistasAdmin() {
  await ensureInitialTarotistas();

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
