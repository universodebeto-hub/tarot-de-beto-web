/**
 * Datos adicionales que algunos servicios de la categoría "Otros" exigen
 * para poder realizarse (Numerología, Carta Astral) — se piden en el paso
 * de "Tus datos" del wizard de reserva (`components/booking/BookingWizard.tsx`)
 * y se validan también en el servidor (`server/bookings.ts`) antes de crear
 * la reserva, para que no se pueda saltar el formulario del cliente.
 *
 * Clave por `Service.slug` (ver `prisma/seed.ts`) — si un slug no aparece
 * acá, ese servicio no pide nada adicional.
 */

export type IntakeFieldType = "text" | "date" | "time";

export interface IntakeFieldDef {
  key: string;
  label: string;
  type: IntakeFieldType;
}

export const SERVICE_INTAKE_FIELDS: Record<string, IntakeFieldDef[]> = {
  "informe-numerologico": [
    { key: "nombreCompletoNacimiento", label: "Nombre completo de nacimiento", type: "text" },
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date" },
  ],
  "carta-astral": [
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date" },
    { key: "horaNacimiento", label: "Hora exacta de nacimiento", type: "time" },
    { key: "ciudadNacimiento", label: "Ciudad de nacimiento", type: "text" },
    { key: "paisNacimiento", label: "País de nacimiento", type: "text" },
  ],
};

export function intakeFieldsFor(serviceSlug: string): IntakeFieldDef[] {
  return SERVICE_INTAKE_FIELDS[serviceSlug] ?? [];
}

/** true si `data` trae un valor no vacío para cada campo requerido del servicio. */
export function hasRequiredIntakeData(serviceSlug: string, data: Record<string, string> | undefined): boolean {
  const fields = intakeFieldsFor(serviceSlug);
  if (fields.length === 0) return true;
  if (!data) return false;
  return fields.every((f) => data[f.key]?.trim());
}
