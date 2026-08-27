"use server";

import { createReportRequest } from "@/server/bookings";
import type { CreateBookingResult, CreateReportRequestInput } from "@/server/bookings";

/** Server Action: crea una solicitud de informe (Numerología, Carta Astral). */
export async function submitReportRequest(input: CreateReportRequestInput): Promise<CreateBookingResult> {
  return createReportRequest(input);
}
