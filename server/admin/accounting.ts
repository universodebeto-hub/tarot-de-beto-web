import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { getSetting } from "@/server/settings";
import { effectivePrice } from "@/lib/booking-price";
import type { CurrentUser } from "@/lib/auth/session";
import type { Prisma } from "@prisma/client";

/** UVT 2026 (DIAN, Resolución 000238 de 2025-12-15). Cambia cada año -- revisar en enero. */
export const UVT_VALUE_COP = 52374;
/** Tope de ingresos brutos anuales (en UVT) para no ser responsable de IVA como persona natural. */
export const IVA_THRESHOLD_UVT = 3500;

const USD_TO_COP_SETTING_KEY = "usd_to_cop_rate";
const DEFAULT_USD_TO_COP_RATE = 3126;

export async function getUsdToCopRate(): Promise<number> {
  return getSetting<number>(USD_TO_COP_SETTING_KEY, DEFAULT_USD_TO_COP_RATE);
}

export async function setUsdToCopRate(rate: number, currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  if (!Number.isFinite(rate) || rate <= 0) return { error: "Ingresá una tasa válida." };

  await prisma.setting.upsert({
    where: { key: USD_TO_COP_SETTING_KEY },
    update: { value: JSON.stringify(rate) },
    create: { key: USD_TO_COP_SETTING_KEY, value: JSON.stringify(rate) },
  });
  await logAdminAction({ adminId: admin.id, action: "accounting.usd_rate_updated", targetType: "Setting", targetId: USD_TO_COP_SETTING_KEY });
  return {};
}

export interface AccountingRow {
  bookingId: string;
  bookingNumber: string;
  paidAt: Date;
  clientName: string;
  serviceName: string;
  paymentMethodLabel: string;
  grossUsd: number;
  feeUsd: number;
  netUsd: number;
}

export interface AccountingReport {
  rows: AccountingRow[];
  totalGrossUsd: number;
  totalFeeUsd: number;
  totalNetUsd: number;
  totalExpensesUsd: number;
  profitUsd: number;
  /** Ingresos brutos del año calendario en curso (siempre, sin importar el filtro de fecha pedido) -- para el medidor de tope de IVA. */
  yearToDateGrossUsd: number;
  usdToCopRate: number;
  uvtValueCop: number;
  ivaThresholdUvt: number;
  ivaThresholdCop: number;
}

/**
 * Informe de contabilidad -- solo cuenta reservas que de verdad se pagaron
 * (CONFIRMED/COMPLETED + PAID), nunca canceladas/vencidas/expiradas (esas
 * ya se borran solas, ver server/availability.ts), y nunca Cortesía
 * (regalo, ingreso real $0). Usa `paidAt` (momento real del pago), no
 * `startsAt` (fecha de la solicitud) -- así un informe de "septiembre"
 * refleja lo que de verdad entró ese mes.
 */
export async function getAccountingReport(range?: { from?: Date; to?: Date }): Promise<AccountingReport> {
  await requireAdmin();

  const baseWhere: Prisma.BookingWhereInput = {
    paymentStatus: "PAID",
    status: { in: ["CONFIRMED", "COMPLETED"] },
    paymentMethod: { not: "CORTESIA" },
  };

  const [bookings, expenses, yearBookings, usdToCopRate] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...baseWhere,
        paidAt: { gte: range?.from, lte: range?.to },
      },
      include: { service: true, user: true, transactions: true },
      orderBy: { paidAt: "desc" },
    }),
    prisma.businessExpense.findMany({
      where: { incurredAt: { gte: range?.from, lte: range?.to } },
    }),
    prisma.booking.findMany({
      where: {
        ...baseWhere,
        paidAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
      include: { service: true },
    }),
    getUsdToCopRate(),
  ]);

  const rows: AccountingRow[] = bookings.map((b) => {
    const gross = effectivePrice(Number(b.service.price), b.videoRequested);
    const paypalTx = b.paymentMethod === "PAYPAL" ? b.transactions.find((t) => t.status === "COMPLETED") : null;
    const fee = paypalTx?.paypalFeeAmount ? Number(paypalTx.paypalFeeAmount) : 0;
    return {
      bookingId: b.id,
      bookingNumber: b.bookingNumber,
      paidAt: b.paidAt ?? b.startsAt,
      clientName: b.user ? `${b.user.firstName} ${b.user.lastName ?? ""}`.trim() : (b.guestName ?? "Invitado"),
      serviceName: b.service.name,
      paymentMethodLabel: b.manualPaymentMethodLabel ?? b.paymentMethod ?? "—",
      grossUsd: gross,
      feeUsd: fee,
      netUsd: gross - fee,
    };
  });

  const totalGrossUsd = rows.reduce((sum, r) => sum + r.grossUsd, 0);
  const totalFeeUsd = rows.reduce((sum, r) => sum + r.feeUsd, 0);
  const totalNetUsd = rows.reduce((sum, r) => sum + r.netUsd, 0);
  const totalExpensesUsd = expenses.reduce((sum, e) => sum + Number(e.amountUsd), 0);
  const yearToDateGrossUsd = yearBookings.reduce(
    (sum, b) => sum + effectivePrice(Number(b.service.price), b.videoRequested),
    0,
  );

  return {
    rows,
    totalGrossUsd,
    totalFeeUsd,
    totalNetUsd,
    totalExpensesUsd,
    profitUsd: totalNetUsd - totalExpensesUsd,
    yearToDateGrossUsd,
    usdToCopRate,
    uvtValueCop: UVT_VALUE_COP,
    ivaThresholdUvt: IVA_THRESHOLD_UVT,
    ivaThresholdCop: UVT_VALUE_COP * IVA_THRESHOLD_UVT,
  };
}

export interface ExpenseInput {
  description: string;
  amountUsd: number;
  category?: string;
  incurredAt?: Date;
}

export async function listExpenses(range?: { from?: Date; to?: Date }) {
  await requireAdmin();
  return prisma.businessExpense.findMany({
    where: { incurredAt: { gte: range?.from, lte: range?.to } },
    orderBy: { incurredAt: "desc" },
  });
}

export async function addExpense(input: ExpenseInput, currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  if (!input.description.trim()) return { error: "Agregá una descripción." };
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) return { error: "Ingresá un monto válido." };

  await prisma.businessExpense.create({
    data: {
      description: input.description.trim(),
      amountUsd: input.amountUsd,
      category: input.category?.trim() || null,
      incurredAt: input.incurredAt ?? new Date(),
    },
  });
  await logAdminAction({ adminId: admin.id, action: "expense.added", targetType: "BusinessExpense", targetId: "new", details: input.description });
  return {};
}

export async function deleteExpense(id: string, currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  const expense = await prisma.businessExpense.findUnique({ where: { id } });
  if (!expense) return { error: "Gasto no encontrado." };

  await prisma.businessExpense.delete({ where: { id } });
  await logAdminAction({ adminId: admin.id, action: "expense.deleted", targetType: "BusinessExpense", targetId: id, details: expense.description });
  return {};
}
