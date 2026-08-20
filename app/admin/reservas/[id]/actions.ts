"use server";

import { revalidatePath } from "next/cache";
import { setBookingStatus, addBookingNote } from "@/server/admin/bookings";
import type { AdminFormState } from "@/server/admin/services";
import type { BookingStatus } from "@prisma/client";

/** Usada con `useActionState` si algún día se necesita mostrar el error inline. */
export async function changeBookingStatusAction(
  bookingId: string,
  status: BookingStatus,
): Promise<AdminFormState> {
  const result = await setBookingStatus(bookingId, status);
  revalidatePath(`/admin/reservas/${bookingId}`);
  revalidatePath("/admin/reservas");
  return result;
}

/** Variante que devuelve `void` — la que usan los `<form action>` planos, que no aceptan un valor de retorno. */
export async function changeBookingStatusFormAction(bookingId: string, status: BookingStatus): Promise<void> {
  await changeBookingStatusAction(bookingId, status);
}

export async function addBookingNoteAction(
  bookingId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const result = await addBookingNote(bookingId, String(formData.get("note") ?? ""));
  revalidatePath(`/admin/reservas/${bookingId}`);
  return result;
}
