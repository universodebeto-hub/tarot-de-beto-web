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

export type IntakeFieldType = "text" | "date" | "time" | "select";

export interface IntakeFieldDef {
  key: string;
  label: string;
  type: IntakeFieldType;
  /** Solo para `select`: opciones { valor, texto }. */
  options?: { value: string; label: string }[];
  /** No obligatorio (por defecto sí). */
  optional?: boolean;
  /** Texto de ayuda bajo el campo. */
  hint?: string;
  /** Si existe, el campo solo es obligatorio cuando devuelve true (ej. la hora, salvo que no se sepa). */
  requiredWhen?: (data: Record<string, string>) => boolean;
}

export const SERVICE_INTAKE_FIELDS: Record<string, IntakeFieldDef[]> = {
  "informe-numerologico": [
    { key: "nombreCompletoNacimiento", label: "Nombre completo de nacimiento", type: "text" },
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date" },
  ],
  "carta-astral": [
    {
      key: "nombreInforme",
      label: "Nombre para el informe (si es para otra persona)",
      type: "text",
      optional: true,
      hint: "Si lo dejas vacío usamos tu nombre.",
    },
    { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date" },
    {
      key: "precisionHora",
      label: "¿Qué tan segura es la hora?",
      type: "select",
      optional: true,
      options: [
        { value: "exacta", label: "Es exacta (acta de nacimiento o dato confiable)" },
        { value: "aproximada", label: "Es aproximada" },
        { value: "desconocida", label: "No sé la hora" },
      ],
      hint: "Sin la hora exacta no se pueden calcular el Ascendente ni las casas; el informe lo avisará.",
    },
    {
      key: "horaNacimiento",
      label: "Hora de nacimiento",
      type: "time",
      requiredWhen: (data) => data.precisionHora !== "desconocida",
    },
    { key: "ciudadNacimiento", label: "Ciudad de nacimiento", type: "text" },
    { key: "paisNacimiento", label: "País de nacimiento", type: "text" },
    {
      key: "regionNacimiento",
      label: "Estado o departamento de nacimiento",
      type: "text",
      optional: true,
      hint: "Ayuda a encontrar la ciudad correcta si hay varias con el mismo nombre.",
    },
  ],
};

export function intakeFieldsFor(serviceSlug: string): IntakeFieldDef[] {
  return SERVICE_INTAKE_FIELDS[serviceSlug] ?? [];
}

/** ¿Este campo es obligatorio con los datos que lleva el formulario ahora mismo? */
export function intakeFieldRequired(field: IntakeFieldDef, data: Record<string, string> | undefined): boolean {
  if (field.requiredWhen) return field.requiredWhen(data ?? {});
  return !field.optional;
}

/** true si `data` trae un valor no vacío para cada campo obligatorio del servicio. */
export function hasRequiredIntakeData(serviceSlug: string, data: Record<string, string> | undefined): boolean {
  const fields = intakeFieldsFor(serviceSlug);
  if (fields.length === 0) return true;
  if (!data) return false;
  return fields.every((f) => !intakeFieldRequired(f, data) || data[f.key]?.trim());
}
