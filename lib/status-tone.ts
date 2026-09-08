import type { BookingStatus, PaymentStatus, TarotistaStatus } from "@prisma/client";

/**
 * Reutiliza los 4 tonos semánticos ya establecidos en el sitio (ver
 * app/globals.css, comentario sobre `--color-emerald`): emerald=éxito,
 * gold=en curso/atención, ember=negativo, ash=neutral. A propósito no se
 * agregan colores nuevos.
 */
export type Tone = "success" | "warning" | "danger" | "neutral";

export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  EXPIRED: "danger",
  RESCHEDULE_REQUESTED: "warning",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  UNPAID: "neutral",
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
};

/** Mismo mapeo semántico que TAROTISTA_STATUS_DOT_CLASS (lib/tarotista-status.ts), para reusar StatusBadge en el panel admin sin tocar ese archivo compartido con la ficha pública. */
export const TAROTISTA_STATUS_TONE: Record<TarotistaStatus, Tone> = {
  DISPONIBLE: "success",
  EN_CONSULTA: "warning",
  EN_REPOSO: "neutral",
  DESCONECTADO: "danger",
};
