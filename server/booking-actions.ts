"use server";

import { createPendingBooking, createReportRequest } from "@/server/bookings";
import type { CreateBookingInput, CreateBookingResult, CreateReportRequestInput } from "@/server/bookings";

/** Server Action: crea una reserva temporal desde el wizard (componente cliente). */
export async function submitBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  return createPendingBooking(input);
}

/** Server Action: crea una solicitud de informe (Numerología, Carta Astral) — sin agenda. */
export async function submitReportRequest(input: CreateReportRequestInput): Promise<CreateBookingResult> {
  return createReportRequest(input);
}
