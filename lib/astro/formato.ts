import type { DatosNacimiento } from "./types";

/** Grado dentro del signo como "23°23'" (el apóstrofo recto existe en todas las fuentes del PDF). */
export function formatearGrado(grado: number): string {
  let g = Math.floor(grado);
  let m = Math.round((grado - g) * 60);
  if (m === 60) {
    g += 1;
    m = 0;
  }
  if (g >= 30) {
    g = 29;
    m = 59;
  }
  return `${g}°${String(m).padStart(2, "0")}'`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "1992-09-20" → "20 de septiembre de 1992". */
export function formatearFechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) throw new Error(`Fecha inválida: "${fecha}"`);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** "14:45", "14:45 (aproximada)" o "hora desconocida", según la precisión de la hora de nacimiento. */
export function descripcionHora(datos: Pick<DatosNacimiento, "hora" | "precision">): string {
  if (datos.precision === "desconocida") return "hora desconocida";
  return datos.precision === "aproximada" ? `${datos.hora} (aproximada)` : datos.hora;
}
