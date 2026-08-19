"use server";

import { createPendingBooking } from "@/server/bookings";
import type { CreateBookingInput, CreateBookingResult } from "@/server/bookings";

/** Server Action: crea una reserva temporal desde el wizard (componente cliente). */
export async function submitBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  return createPendingBooking(input);
}
