"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  setBookingStatus,
  addBookingNote,
  setCreditPaid,
  deleteBookingPermanently,
  setManualMinutesAdjustment,
} from "@/server/admin/bookings";
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

export async function setCreditPaidFormAction(bookingId: string, paid: boolean): Promise<void> {
  await setCreditPaid(bookingId, paid);
  revalidatePath(`/admin/reservas/${bookingId}`);
}

/** Borra la reserva de una y redirige al listado -- ya no queda página de detalle que mostrar. */
export async function deleteBookingAction(bookingId: string): Promise<AdminFormState> {
  const result = await deleteBookingPermanently(bookingId);
  if (result.error) return result;
  revalidatePath("/admin/reservas");
  redirect("/admin/reservas");
}

/** Misma acción, pero para usarla desde una fila del listado (sin redirigir, solo refresca la lista). */
export async function deleteBookingFromListAction(bookingId: string): Promise<AdminFormState> {
  const result = await deleteBookingPermanently(bookingId);
  if (!result.error) revalidatePath("/admin/reservas");
  return result;
}

export async function setManualMinutesAdjustmentAction(
  bookingId: string,
  minutes: number,
): Promise<{ error?: string }> {
  const result = await setManualMinutesAdjustment(bookingId, minutes);
  if (!result.error) {
    revalidatePath(`/admin/reservas/${bookingId}`);
    revalidatePath("/admin/consumo");
  }
  return result;
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
