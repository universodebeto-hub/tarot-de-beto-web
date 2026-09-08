"use server";

import { revalidatePath } from "next/cache";
import { setBookingStatus, deleteBookingPermanently } from "@/server/admin/bookings";

interface BulkResult {
  count: number;
  error?: string;
}

/** Aplica "Cancelar" a varias reservas de una -- sigue de largo si alguna individual falla, cuenta cuántas sí se cancelaron. */
export async function bulkCancelBookingsAction(ids: string[]): Promise<BulkResult> {
  let count = 0;
  for (const id of ids) {
    const result = await setBookingStatus(id, "CANCELLED");
    if (!result.error) count++;
  }
  revalidatePath("/admin/reservas");
  return { count };
}

/** Igual que bulkCancelBookingsAction pero eliminando el registro por completo -- ver deleteBookingPermanently. */
export async function bulkDeleteBookingsAction(ids: string[]): Promise<BulkResult> {
  let count = 0;
  for (const id of ids) {
    const result = await deleteBookingPermanently(id);
    if (!result.error) count++;
  }
  revalidatePath("/admin/reservas");
  return { count };
}
