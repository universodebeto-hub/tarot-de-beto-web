"use server";

import { revalidatePath } from "next/cache";
import {
  upsertAvailabilityRange,
  deleteAvailabilityRange,
  toggleAvailabilityActive,
  createBlockedTimeAdmin,
  deleteBlockedTimeAdmin,
  toggleQuickBlock,
} from "@/server/admin/schedule";
import type { AdminFormState } from "@/server/admin/services";

export async function upsertAvailabilityAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await upsertAvailabilityRange(_prev, formData);
  revalidatePath("/admin/calendario");
  return result;
}

export async function deleteAvailabilityAction(id: string): Promise<void> {
  await deleteAvailabilityRange(id);
  revalidatePath("/admin/calendario");
}

export async function toggleAvailabilityAction(id: string): Promise<void> {
  await toggleAvailabilityActive(id);
  revalidatePath("/admin/calendario");
}

export async function createBlockAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await createBlockedTimeAdmin(_prev, formData);
  revalidatePath("/admin/calendario");
  revalidatePath("/agenda");
  return result;
}

export async function deleteBlockAction(id: string): Promise<void> {
  await deleteBlockedTimeAdmin(id);
  revalidatePath("/admin/calendario");
  revalidatePath("/agenda");
}

export async function toggleQuickBlockAction(date: string, startMinute: number): Promise<void> {
  await toggleQuickBlock(date, startMinute);
  revalidatePath("/admin/calendario");
  revalidatePath("/agenda");
}
