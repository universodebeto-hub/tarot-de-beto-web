"use server";

import { requestCreditBooking } from "@/server/credit";

/** Server Action del botón "Créditos Beto" -- se resuelve por cookie (currentUser se omite), mismo patrón que el resto de la web. */
export async function requestCreditBookingAction(bookingId: string) {
  return requestCreditBooking(bookingId);
}
