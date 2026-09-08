"use server";

import { revalidatePath } from "next/cache";
import { cleanupIncompleteBookings } from "@/server/admin/bookings";

export async function cleanupIncompleteBookingsAction(): Promise<{ deleted?: number; error?: string }> {
  const result = await cleanupIncompleteBookings();
  revalidatePath("/admin");
  revalidatePath("/admin/reservas");
  return result;
}
