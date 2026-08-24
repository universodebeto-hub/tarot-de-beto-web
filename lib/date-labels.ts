/** Helpers de formato de fecha en español, seguros para usar en cliente (sin tocar el servidor). */

export function dayLabel(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(d).replace(".", "");
  const day = new Intl.DateTimeFormat("es-CO", { day: "numeric" }).format(d);
  return { weekday, day };
}

/** Encabezado de columna del calendario de agenda, ej. "Lunes 24". */
export function dayColumnLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "long" }).format(d);
  const day = new Intl.DateTimeFormat("es-CO", { day: "numeric" }).format(d);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}`;
}

export function fullDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

/**
 * Hora local del negocio (hardcodeada a América/Bogotá, no leída de env)
 * para un instante UTC — evita importar config/site.ts en un componente
 * cliente (ver nota sobre el bug de hidratación con NEXT_PUBLIC_ en
 * componentes cliente anidados, Next.js 16 + Turbopack).
 */
export function formatBusinessTime(isoUtc: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  }).format(new Date(isoUtc));
}
