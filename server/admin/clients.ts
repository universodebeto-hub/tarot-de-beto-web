import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";
import type { AdminFormState } from "@/server/admin/services";
import { isClientActive } from "@/lib/client-activity";

export async function listClientsAdmin(q?: string, range?: { from?: Date; to?: Date }) {
  // Cada palabra buscada por separado (AND entre palabras, OR entre campos
  // por palabra) -- así "victor bracho" encuentra a alguien con
  // firstName="Victor" y lastName="Bracho" en filas distintas, que un solo
  // `contains` de la frase completa nunca hubiera encontrado.
  const words = q?.trim().split(/\s+/).filter(Boolean) ?? [];

  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      createdAt: range?.from || range?.to ? { gte: range?.from, lte: range?.to } : undefined,
      AND: words.map((word) => ({
        OR: [
          { firstName: { contains: word, mode: "insensitive" } },
          { lastName: { contains: word, mode: "insensitive" } },
          { email: { contains: word, mode: "insensitive" } },
        ],
      })),
    },
    include: {
      bookings: { include: { service: true }, orderBy: { startsAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return users.map((u) => {
    const lastPaidConsultationAt = u.bookings.find((b) => b.paymentStatus === "PAID")?.startsAt ?? null;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      bookingsCount: u.bookings.length,
      lastBookingAt: u.bookings[0]?.startsAt ?? null,
      lastPaidConsultationAt,
      isActive: isClientActive(lastPaidConsultationAt),
      totalSpent: u.bookings
        .filter((b) => b.paymentStatus === "PAID")
        .reduce((sum, b) => sum + Number(b.service.price), 0),
    };
  });
}

export async function getClientAdminById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id, role: "CLIENT" },
    include: {
      bookings: { include: { service: true, tarotista: true }, orderBy: { startsAt: "desc" } },
    },
  });
  if (!user) return null;

  const lastPaidConsultationAt = user.bookings.find((b) => b.paymentStatus === "PAID")?.startsAt ?? null;
  return { ...user, lastPaidConsultationAt, isActive: isClientActive(lastPaidConsultationAt) };
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

interface RegisterGuestAsClientResult {
  error?: string;
  userId?: string;
}

/**
 * Convierte una reserva de invitado (sin cuenta, `userId` null) en un
 * cliente registrado -- para cuando Beto ya tiene el correo/datos por
 * PayPal y quiere que la persona aparezca en Clientes, con notas de
 * seguimiento y bolsa de minutos, sin esperar a que se registre sola. La
 * cuenta se crea SIN contraseña (`passwordHash: null`) -- queda "sin
 * reclamar" hasta que el cliente se registre con el mismo correo (toma
 * posesión, ver server/user-auth.ts::registerAccount) o pida "olvidé mi
 * contraseña" (ya funciona igual para estas cuentas, sin cambios).
 * De paso, vincula cualquier OTRA reserva de invitado con el mismo correo
 * -- si ya había comprado antes sin registrarse, todo ese historial queda
 * junto en la misma cuenta nueva.
 */
export async function registerGuestAsClient(
  bookingId: string,
  input: z.infer<typeof clientInfoSchema>,
  currentUser?: CurrentUser | null,
): Promise<RegisterGuestAsClientResult> {
  const admin = await requireAdmin(currentUser);

  const parsed = clientInfoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.userId) return { error: "Esta reserva ya está vinculada a un cliente." };

  const { firstName, lastName, email, phone, country } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  let userId: string;

  if (existing) {
    if (existing.passwordHash) {
      return { error: "Ese correo ya pertenece a una cuenta registrada -- vinculá la reserva a ese cliente en vez de crear uno nuevo." };
    }
    // Ya existe una cuenta sin reclamar con este correo (de otra reserva de
    // invitado registrada antes) -- se reutiliza en vez de duplicar.
    await prisma.user.update({ where: { id: existing.id }, data: { firstName, lastName, phone, country } });
    userId = existing.id;
  } else {
    const created = await prisma.user.create({
      data: { firstName, lastName, email, phone, country, passwordHash: null, role: "CLIENT" },
    });
    userId = created.id;
  }

  // Se vincula tanto la reserva puntual que se estaba editando (por si el
  // admin corrigió el correo en el formulario, puede ya no coincidir con
  // guestEmail) como cualquier otra reserva de invitado con este correo.
  await prisma.booking.updateMany({
    where: {
      userId: null,
      OR: [{ id: bookingId }, { guestEmail: { equals: email, mode: "insensitive" } }],
    },
    data: { userId, guestName: null, guestEmail: null, guestPhone: null },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "client.registered_from_guest_booking",
    targetType: "User",
    targetId: userId,
    details: `${email} · reserva ${booking.bookingNumber}`,
  });

  return { userId };
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

/**
 * Borra la cuenta de un cliente por completo -- solo si nunca tuvo ninguna
 * reserva (igual que deleteServiceAdmin: la base de datos rechazaría el
 * borrado de todos modos, esto solo da un mensaje claro antes). Pensado
 * para cuentas duplicadas o de prueba, nunca para clientes con historial
 * real de consultas.
 */
export async function deleteClientAdmin(userId: string, currentUser?: CurrentUser | null): Promise<AdminFormState> {
  const admin = await requireAdmin(currentUser);

  const user = await prisma.user.findUnique({ where: { id: userId, role: "CLIENT" } });
  if (!user) return { error: "Cliente no encontrado." };

  const bookingsCount = await prisma.booking.count({ where: { userId } });
  if (bookingsCount > 0) {
    return {
      error: `No se puede eliminar: ya tiene ${bookingsCount} reserva(s) asociada(s). Esta cuenta queda como parte del historial.`,
    };
  }

  await prisma.user.delete({ where: { id: userId } });
  await logAdminAction({
    adminId: admin.id,
    action: "client.deleted",
    targetType: "User",
    targetId: userId,
    details: user.email,
  });

  return {};
}
