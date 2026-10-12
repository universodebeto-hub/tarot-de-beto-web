import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ANIO_HORA_POCO_CONFIABLE } from "./config";

const FORMATO_LOCAL = "yyyy-MM-dd'T'HH:mm:ss";
const UNA_HORA_MS = 3_600_000;

export interface HoraConvertida {
  utc: Date;
  /** Avisos para quien revisa: hora inexistente, hora repetida, año con husos poco confiables. */
  advertencias: string[];
}

/**
 * Convierte la hora local de nacimiento a UTC usando las reglas HISTÓRICAS de la
 * zona IANA (nunca un desfase fijo: Colombia tuvo horario de verano en 1992–93,
 * Venezuela estuvo en UTC−4:30 entre 2007 y 2016, etc.).
 *
 * @param fecha AAAA-MM-DD
 * @param hora HH:MM, 24 h
 * @param zona zona IANA, ej. "America/Bogota"
 */
export function horaLocalAUtc(fecha: string, hora: string, zona: string): HoraConvertida {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error(`Fecha inválida: "${fecha}" (se espera AAAA-MM-DD).`);
  if (!/^\d{2}:\d{2}$/.test(hora)) throw new Error(`Hora inválida: "${hora}" (se espera HH:MM).`);

  const local = `${fecha}T${hora}:00`;
  const utc = fromZonedTime(local, zona);
  if (Number.isNaN(utc.getTime())) throw new Error(`No se pudo convertir ${fecha} ${hora} en la zona ${zona}.`);

  const advertencias: string[] = [];

  // Hora que no existió: al "adelantar" el reloj, el instante resultante muestra otra hora local.
  if (formatInTimeZone(utc, zona, FORMATO_LOCAL) !== local) {
    advertencias.push(
      `La hora ${hora} no existió el ${fecha} en ${zona} (cambio de horario ese día). Se usó el instante más cercano; conviene confirmar la hora con el cliente.`,
    );
  } else {
    // Hora repetida: existe otro instante, una hora antes o después, con la misma hora local.
    const otro = [utc.getTime() - UNA_HORA_MS, utc.getTime() + UNA_HORA_MS].find(
      (t) => formatInTimeZone(new Date(t), zona, FORMATO_LOCAL) === local,
    );
    if (otro !== undefined) {
      advertencias.push(
        `La hora ${hora} ocurrió dos veces el ${fecha} en ${zona} (fin del horario de verano). Se usó la primera; el Ascendente puede variar según cuál sea la correcta.`,
      );
    }
  }

  if (Number(fecha.slice(0, 4)) < ANIO_HORA_POCO_CONFIABLE) {
    advertencias.push(
      `Antes de ${ANIO_HORA_POCO_CONFIABLE} los husos horarios históricos son poco confiables (hora solar local, cambios de país); conviene verificar la hora oficial de nacimiento.`,
    );
  }

  return { utc, advertencias };
}

/** Siguiente día calendario (AAAA-MM-DD → AAAA-MM-DD), sin depender de zonas horarias. */
export function diaSiguiente(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
