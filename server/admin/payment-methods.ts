import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";
import type { PaymentMethod } from "@prisma/client";

/** Todos (activos e inactivos), para /admin/configuracion. */
export async function listManualPaymentMethodsAdmin() {
  return prisma.manualPaymentMethod.findMany({ orderBy: { sortOrder: "asc" } });
}

export interface PaymentMethodFormResult {
  error?: string;
}

/** Agrega un método de pago nuevo -- el logo ya debe estar subido (ver /api/uploads/payment-method-logo) antes de llamar a esto. */
export async function createManualPaymentMethod(
  input: { name: string; instructions: string; logoUrl: string },
  currentUser?: CurrentUser | null,
): Promise<PaymentMethodFormResult> {
  const admin = await requireAdmin(currentUser);
  if (!input.name.trim()) return { error: "Ponele un nombre al método." };
  if (!input.instructions.trim()) return { error: "Agregá las instrucciones que va a leer el cliente." };
  if (!input.logoUrl) return { error: "Subí un logo para el método." };

  const maxSort = await prisma.manualPaymentMethod.aggregate({ _max: { sortOrder: true } });

  const method = await prisma.manualPaymentMethod.create({
    data: {
      name: input.name.trim(),
      instructions: input.instructions.trim(),
      logoUrl: input.logoUrl,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "payment_method.created",
    targetType: "ManualPaymentMethod",
    targetId: method.id,
    details: method.name,
  });

  return {};
}

export async function updateManualPaymentMethod(
  id: string,
  input: { name: string; instructions: string; logoUrl?: string },
  currentUser?: CurrentUser | null,
): Promise<PaymentMethodFormResult> {
  const admin = await requireAdmin(currentUser);
  if (!input.name.trim()) return { error: "Ponele un nombre al método." };
  if (!input.instructions.trim()) return { error: "Agregá las instrucciones que va a leer el cliente." };

  const existing = await prisma.manualPaymentMethod.findUnique({ where: { id } });
  if (!existing) return { error: "Método no encontrado." };

  await prisma.manualPaymentMethod.update({
    where: { id },
    data: {
      name: input.name.trim(),
      instructions: input.instructions.trim(),
      logoUrl: input.logoUrl || undefined,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "payment_method.updated",
    targetType: "ManualPaymentMethod",
    targetId: id,
  });

  return {};
}

export async function toggleManualPaymentMethodActive(
  id: string,
  currentUser?: CurrentUser | null,
): Promise<PaymentMethodFormResult> {
  const admin = await requireAdmin(currentUser);
  const existing = await prisma.manualPaymentMethod.findUnique({ where: { id } });
  if (!existing) return { error: "Método no encontrado." };

  await prisma.manualPaymentMethod.update({ where: { id }, data: { active: !existing.active } });
  await logAdminAction({
    adminId: admin.id,
    action: existing.active ? "payment_method.deactivated" : "payment_method.activated",
    targetType: "ManualPaymentMethod",
    targetId: id,
  });

  return {};
}

/** Solo se puede borrar si nunca se usó en ninguna reserva -- mismo patrón que servicios/clientes. */
export async function deleteManualPaymentMethod(
  id: string,
  currentUser?: CurrentUser | null,
): Promise<PaymentMethodFormResult> {
  const admin = await requireAdmin(currentUser);
  const existing = await prisma.manualPaymentMethod.findUnique({ where: { id } });
  if (!existing) return { error: "Método no encontrado." };

  const bookingsCount = await prisma.booking.count({ where: { manualPaymentMethodId: id } });
  if (bookingsCount > 0) {
    return { error: `No se puede eliminar: ya se usó en ${bookingsCount} reserva(s). Usá "Desactivar" en su lugar.` };
  }

  await prisma.$transaction([
    prisma.paymentMethodLogo.deleteMany({ where: { method: id } }),
    prisma.manualPaymentMethod.delete({ where: { id } }),
  ]);

  await logAdminAction({
    adminId: admin.id,
    action: "payment_method.deleted",
    targetType: "ManualPaymentMethod",
    targetId: id,
    details: existing.name,
  });

  return {};
}

/** Cambia el logo de CUALQUIER método -- uno fijo del enum (`methodKey` = "ZELLE", etc.) o uno de ManualPaymentMethod (`methodKey` = su id). */
export async function setPaymentMethodLogo(
  methodKey: PaymentMethod | string,
  logoUrl: string,
  currentUser?: CurrentUser | null,
): Promise<PaymentMethodFormResult> {
  const admin = await requireAdmin(currentUser);
  if (!logoUrl) return { error: "Subí una imagen." };

  await prisma.paymentMethodLogo.upsert({
    where: { method: methodKey },
    update: { logoUrl },
    create: { method: methodKey, logoUrl },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "payment_method.logo_changed",
    targetType: "PaymentMethodLogo",
    targetId: methodKey,
  });

  return {};
}
