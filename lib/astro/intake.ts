import type { DatosNacimiento, PrecisionHora } from "./types";

/**
 * Convierte lo que el cliente escribió al reservar (Booking.intakeData) en los datos de
 * nacimiento que usa el motor. Devuelve un texto de error claro si algo no sirve, para
 * mostrarlo en el panel en vez de fallar a mitad del cálculo.
 */
export function intakeADatosNacimiento(
  intake: Record<string, unknown> | null | undefined,
  nombreCliente: string,
): { datos: DatosNacimiento } | { error: string } {
  const texto = (k: string) => (typeof intake?.[k] === "string" ? (intake[k] as string).trim() : "");

  const fecha = texto("fechaNacimiento");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))) {
    return { error: `La fecha de nacimiento no es válida: "${fecha}".` };
  }
  const anio = Number(fecha.slice(0, 4));
  if (anio < 1800 || anio > new Date().getUTCFullYear()) return { error: `El año de nacimiento no es creíble: ${anio}.` };

  const crudaPrecision = texto("precisionHora");
  const precision: PrecisionHora =
    crudaPrecision === "aproximada" || crudaPrecision === "desconocida" ? crudaPrecision : "exacta";

  let hora = texto("horaNacimiento");
  if (precision === "desconocida") hora = "12:00";
  else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { error: `La hora de nacimiento no es válida: "${hora}".` };

  const ciudad = texto("ciudadNacimiento");
  const pais = texto("paisNacimiento");
  if (!ciudad || !pais) return { error: "Faltan la ciudad o el país de nacimiento." };

  const nombre = texto("nombreInforme") || nombreCliente.trim();
  if (!nombre) return { error: "Falta el nombre para el informe." };

  const region = texto("regionNacimiento") || undefined;
  return { datos: { nombre, fecha, hora, precision, ciudad, pais, ...(region ? { region } : {}) } };
}
