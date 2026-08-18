"use server";

import { getAvailableSlots } from "@/server/availability";
import type { TimeSlot } from "@/server/availability";

/** Server Action: permite pedir horarios disponibles desde un componente cliente. */
export async function fetchAvailableSlots(serviceId: string, date: string): Promise<TimeSlot[]> {
  return getAvailableSlots({ serviceId, date });
}
