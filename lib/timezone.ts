import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { siteConfig } from "@/config/site";

export const BUSINESS_TIMEZONE = siteConfig.timezone;

/** Día de la semana (0=domingo..6=sábado) de una fecha, en la zona horaria del negocio. */
export function businessDayOfWeek(date: Date): number {
  return toZonedTime(date, BUSINESS_TIMEZONE).getDay();
}

/** "Ahora" expresado como componentes locales del negocio. */
export function nowInBusinessTz(): Date {
  return toZonedTime(new Date(), BUSINESS_TIMEZONE);
}

/**
 * Construye el instante UTC correspondiente a una fecha calendario
 * (yyyy-mm-dd) + minutos desde medianoche, interpretados en la zona
 * horaria del negocio.
 */
export function businessLocalToUtc(dateStr: string, minutesFromMidnight: number): Date {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const localIso = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  return fromZonedTime(localIso, BUSINESS_TIMEZONE);
}

/** Minutos desde medianoche (hora del negocio) de un instante UTC dado. */
export function minutesInBusinessDay(date: Date): number {
  const zoned = toZonedTime(date, BUSINESS_TIMEZONE);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Fecha calendario (yyyy-MM-dd) de un instante, en la zona horaria del negocio. */
export function businessDateString(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Las próximas `count` fechas calendario (yyyy-MM-dd) del negocio, empezando
 * hoy. Nota: asume una zona horaria de offset fijo (como América/Bogotá,
 * sin horario de verano) — si el negocio cambia a una zona con DST, sumar
 * "24h en milisegundos" para avanzar un día calendario dejaría de ser exacto.
 */
export function nextBusinessDates(count: number, from: Date = new Date()): string[] {
  const startMidnightUtc = businessLocalToUtc(businessDateString(from), 0);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const shifted = new Date(startMidnightUtc.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(businessDateString(shifted));
  }
  return dates;
}
