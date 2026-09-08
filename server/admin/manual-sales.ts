import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { nextBookingNumber } from "@/server/booking-number";
import { isReportOnlyService } from "@/lib/service-fulfillment";
import { fundMinutesWalletIfApplicable } from "@/server/wallet";
import type { CurrentUser } from "@/lib/auth/session";
import type { PaymentMethod } from "@prisma/client";

export interface RegisterManualSaleInput {
  /** Cliente ya registrado -- si no viene, hay que pasar guestName/guestEmail. */
  clientId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  serviceId: string;
  tarotistaId?: string | null;
  paymentMethod: PaymentMethod;
  /** Solo si paymentMethod = OTRO -- id de un ManualPaymentMethod agregado por el admin. */
  manualPaymentMethodId?: string;
  reference?: string;
}

export interface RegisterManualSaleResult {
  error?: string;
  bookingId?: string;
}

/**
 * Registra una venta que ocurrió fuera de la web (efectivo, en persona,
 * transferencia directa sin pasar por el formulario) -- crea la reserva ya
 * CONFIRMED + PAID, igual que si el cliente la hubiera pagado acá, para
 * que sume a ingresos, historial e informe de minutos. A diferencia de
 * "Regalar consulta" (server/admin/gifts.ts, paymentMethod CORTESIA y
 * gratis), esto es un cobro real con un método de pago real.
 */
export async function registerManualSale(
  input: RegisterManualSaleInput,
  currentUser?: CurrentUser | null,
): Promise<RegisterManualSaleResult> {
  const admin = await requireAdmin(currentUser);

  if (input.paymentMethod === "CORTESIA") {
    return { error: "Para una consulta gratis, usá \"Regalar consulta\" en vez de esto." };
  }

  let clientLabel: string;
  if (input.clientId) {
    const client = await prisma.user.findUnique({ where: { id: input.clientId, role: "CLIENT" } });
    if (!client) return { error: "Cliente no encontrado." };
    clientLabel = client.email;
  } else {
    if (!input.guestName?.trim() || !input.guestEmail?.trim()) {
      return { error: "Si no es un cliente registrado, ingresá nombre y correo." };
    }
    clientLabel = input.guestEmail.trim();
  }

  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) return { error: "Servicio no encontrado." };

  const isReport = isReportOnlyService(service.slug);
  if (!isReport) {
    if (!input.tarotistaId) return { error: "Elegí un tarotista para atender la consulta." };
    const tarotista = await prisma.tarotista.findUnique({ where: { id: input.tarotistaId } });
    if (!tarotista) return { error: "Tarotista no encontrado." };
  }

  let manualPaymentMethodLabel: string | null = null;
  if (input.paymentMethod === "OTRO") {
    if (!input.manualPaymentMethodId) return { error: "Elegí qué método de pago usó." };
    const method = await prisma.manualPaymentMethod.findUnique({ where: { id: input.manualPaymentMethodId } });
    if (!method) return { error: "Método de pago no encontrado." };
    manualPaymentMethodLabel = method.name;
  }

  const now = new Date();
  const endsAt = isReport ? now : new Date(now.getTime() + service.durationMinutes * 60_000);
  const bookingNumber = await nextBookingNumber();

  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      userId: input.clientId ?? null,
      guestName: input.clientId ? null : input.guestName!.trim(),
      guestEmail: input.clientId ? null : input.guestEmail!.trim(),
      guestPhone: input.clientId ? null : input.guestPhone?.trim() || null,
      serviceId: input.serviceId,
      tarotistaId: isReport ? null : input.tarotistaId,
      startsAt: now,
      endsAt,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paidAt: now,
      paymentMethod: input.paymentMethod,
      manualPaymentMethodId: input.paymentMethod === "OTRO" ? input.manualPaymentMethodId : null,
      manualPaymentMethodLabel,
      manualPaymentReference: input.reference?.trim() || null,
      paymentDeadline: now,
    },
    include: { service: true, user: true },
  });

  await fundMinutesWalletIfApplicable(booking);

  await logAdminAction({
    adminId: admin.id,
    action: "booking.manual_sale_registered",
    targetType: "Booking",
    targetId: booking.id,
    details: `${clientLabel} · ${service.name} · ${manualPaymentMethodLabel ?? input.paymentMethod}`,
  });

  return { bookingId: booking.id };
}
