import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";
import type { AdminFormState } from "@/server/admin/services";

export async function listClientsAdmin(q?: string) {
  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      bookings: { include: { service: true }, orderBy: { startsAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt,
    bookingsCount: u.bookings.length,
    lastBookingAt: u.bookings[0]?.startsAt ?? null,
    totalSpent: u.bookings
      .filter((b) => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + Number(b.service.price), 0),
  }));
}

export async function getClientAdminById(id: string) {
  return prisma.user.findUnique({
    where: { id, role: "CLIENT" },
    include: {
      bookings: { include: { service: true }, orderBy: { startsAt: "desc" } },
    },
  });
}

const clientInfoSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null)),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : null)),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null)),
});

interface UpdateClientInfoResult {
  error?: string;
  success?: boolean;
}

/**
 * Editar los datos básicos de una cuenta de cliente (nombre, correo,
 * WhatsApp, país) -- no existía ninguna forma de corregir un dato mal
 * escrito al registrarse (ej. un typo en el correo) salvo tocar la base a
 * mano. Solo el admin puede hacerlo, desde el detalle del cliente. Núcleo
 * compartido entre la Server Action de la web (FormData) y la ruta v1 de
 * la app (JSON) -- ver updateClientInfo/updateClientInfoFromJson abajo.
 */
async function applyClientInfoUpdate(
  userId: string,
  input: z.infer<typeof clientInfoSchema>,
  admin: CurrentUser,
): Promise<UpdateClientInfoResult> {
  const user = await prisma.user.findUnique({ where: { id: userId, role: "CLIENT" } });
  if (!user) return { error: "Cliente no encontrado." };

  if (input.email !== user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailTaken) return { error: "Ese correo ya está en uso por otra cuenta." };
  }

  await prisma.user.update({ where: { id: userId }, data: input });
  await logAdminAction({
    adminId: admin.id,
    action: "client.info_updated",
    targetType: "User",
    targetId: userId,
  });

  return { success: true };
}

export async function updateClientInfo(
  userId: string,
  _prev: AdminFormState,
  formData: FormData,
  currentUser?: CurrentUser | null,
): Promise<AdminFormState> {
  const admin = await requireAdmin(currentUser);

  const parsed = clientInfoSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country: formData.get("country"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  return applyClientInfoUpdate(userId, parsed.data, admin);
}

/** Misma validación/lógica que updateClientInfo, para el body JSON que manda la app (PATCH /api/v1/admin/clients/[id]). */
export async function updateClientInfoFromJson(
  userId: string,
  body: unknown,
  currentUser?: CurrentUser | null,
): Promise<UpdateClientInfoResult> {
  const admin = await requireAdmin(currentUser);

  const parsed = clientInfoSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  return applyClientInfoUpdate(userId, parsed.data, admin);
}

export interface SetCreditApprovalResult {
  error?: string;
}

/**
 * Habilita/deshabilita a mano que un cliente pueda pedir "Créditos Beto"
 * (atenderse ahora, pagar después) -- ver server/credit.ts. No afecta
 * ninguna reserva existente, solo si la opción aparece en las próximas.
 */
export async function setUserCreditApproval(
  userId: string,
  approved: boolean,
  currentUser?: CurrentUser | null,
): Promise<SetCreditApprovalResult> {
  const admin = await requireAdmin(currentUser);

  const user = await prisma.user.findUnique({ where: { id: userId, role: "CLIENT" } });
  if (!user) return { error: "Cliente no encontrado." };

  await prisma.user.update({ where: { id: userId }, data: { canUseCredit: approved } });
  await logAdminAction({
    adminId: admin.id,
    action: approved ? "client.credit_enabled" : "client.credit_disabled",
    targetType: "User",
    targetId: userId,
  });

  return {};
}

export interface PromoteToAdminResult {
  error?: string;
}

/**
 * Promueve una cuenta de cliente ya registrada a administrador -- hasta
 * ahora la única forma de tener un segundo admin era que yo editara la
 * base de datos directamente. A propósito no hay una acción para
 * "quitarle" el rol de admin desde acá (bajar al último admin por error
 * dejaría el panel sin nadie que pueda entrar) -- si hace falta revertir
 * un ascenso, es una operación manual aparte, deliberada.
 */
export async function promoteToAdmin(userId: string, currentUser?: CurrentUser | null): Promise<PromoteToAdminResult> {
  const admin = await requireAdmin(currentUser);

  const user = await prisma.user.findUnique({ where: { id: userId, role: "CLIENT" } });
  if (!user) return { error: "Cliente no encontrado." };

  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  await logAdminAction({
    adminId: admin.id,
    action: "client.promoted_to_admin",
    targetType: "User",
    targetId: userId,
    details: user.email,
  });

  return {};
}
