/**
 * Servicios que NO usan la agenda de llamadas — se solicitan como informe
 * personalizado, sin horario ni bloques de 15 min, con entrega dentro de un
 * plazo fijo. Mismo patrón que `SERVICE_INTAKE_FIELDS`
 * (`lib/service-intake.ts`): clave por `Service.slug`, sin tocar el schema
 * de la base de datos — si un slug no aparece acá, ese servicio sigue
 * usando la agenda normal de llamadas.
 */

export const REPORT_ONLY_SERVICE_SLUGS = ["informe-numerologico", "carta-astral"] as const;

export const REPORT_DELIVERY_TEXT = "3 a 7 días";

export function isReportOnlyService(slug: string): boolean {
  return (REPORT_ONLY_SERVICE_SLUGS as readonly string[]).includes(slug);
}
