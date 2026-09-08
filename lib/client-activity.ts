/**
 * "Activo" / "Inactivo" es solo una etiqueta interna del panel admin (no
 * afecta nada del sitio ni de la cuenta del cliente) para que Beto sepa a
 * quién mandarle publicidad de reactivación. Un cliente cuenta como activo
 * si tuvo al menos una consulta PAGADA dentro de los últimos 30 días.
 */
export const ACTIVE_WINDOW_DAYS = 30;

export function isClientActive(lastPaidConsultationAt: Date | null): boolean {
  if (!lastPaidConsultationAt) return false;
  const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60_000;
  return lastPaidConsultationAt.getTime() >= cutoff;
}
