import type { BookingStatus, PaymentStatus } from "@prisma/client";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
  RESCHEDULE_REQUESTED: "Reprogramación solicitada",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Sin pagar",
  PENDING: "Pago en proceso",
  PAID: "Pagado",
  FAILED: "Pago fallido",
  REFUNDED: "Reembolsado",
};
