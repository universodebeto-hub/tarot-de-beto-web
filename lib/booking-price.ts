/**
 * Recargo de videollamada -- el cliente puede pedir expresamente
 * videollamada al reservar (ver Booking.videoRequested en el schema) y
 * eso sube el precio del servicio un 20%. Este archivo NO usa "server-only"
 * a propósito: se importa tanto desde el servidor (server/consultations.ts,
 * server/paypal-orders.ts, para calcular/verificar el monto real) como
 * desde componentes cliente (ConsultationForm.tsx) para mostrar el precio
 * en vivo mientras el usuario tilda o destilda el checkbox.
 */
export const VIDEO_SURCHARGE_MULTIPLIER = 1.2;

export function effectivePrice(basePrice: number, videoRequested: boolean): number {
  if (!videoRequested) return basePrice;
  return Math.round(basePrice * VIDEO_SURCHARGE_MULTIPLIER * 100) / 100;
}
