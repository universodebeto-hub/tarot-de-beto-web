import type { BookingStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

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

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PAYPAL: "PayPal",
  PAGO_MOVIL: "Pago Móvil",
  ZELLE: "Zelle",
  BINANCE: "Binance Pay",
  REMITLY: "Remitly",
  WESTERN_UNION: "Western Union",
  MONEYGRAM: "MoneyGram",
};

/** Nombre del archivo en public/assets/payment-logos/<slug>.png para cada método. */
export const PAYMENT_METHOD_LOGO_SLUG: Record<PaymentMethod, string> = {
  PAYPAL: "paypal",
  PAGO_MOVIL: "pago-movil",
  ZELLE: "zelle",
  BINANCE: "binance",
  REMITLY: "remitly",
  WESTERN_UNION: "western-union",
  MONEYGRAM: "moneygram",
};
