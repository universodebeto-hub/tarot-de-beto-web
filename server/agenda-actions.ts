"use server";

import { getAvailableSlots, getDayAgenda } from "@/server/availability";
import type { TimeSlot, DayAgenda } from "@/server/availability";

/** Server Action: permite pedir horarios disponibles desde un componente cliente. */
export async function fetchAvailableSlots(serviceId: string, date: string): Promise<TimeSlot[]> {
  return getAvailableSlots({ serviceId, date });
}

/** Server Action: estado de los 96 bloques de 15 min de un día, para pintar el calendario de columnas. */
export async function fetchDayAgenda(date: string): Promise<DayAgenda> {
  return getDayAgenda(date);
}
