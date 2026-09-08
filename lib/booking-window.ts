/**
 * Minutos que tiene un cliente para completar el pago antes de que la
 * reserva se elimine sola (ver server/availability.ts::expireStaleBookings).
 * Fijo en el código a propósito -- ya no se lee de `Setting` en la base de
 * datos, porque cambiarlo ahí requiere el editor JSON crudo de
 * /admin/configuracion, que no es un lugar pensado para que Beto lo toque.
 * Si algún día hay que cambiar el número, es un cambio de código (avisale a
 * Claude), no un dato editable desde el panel.
 */
export const PAYMENT_WINDOW_MINUTES = 30;
