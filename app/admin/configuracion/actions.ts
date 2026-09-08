"use server";

import { revalidatePath } from "next/cache";
import {
  updateManualPaymentInstructions,
  updateFaqItems,
  updateReminderHours,
} from "@/server/admin/settings";
import type { ManualPaymentInstructions } from "@/server/settings";
import type { FaqItem } from "@/types/content";

export async function updateManualPaymentInstructionsAction(
  data: ManualPaymentInstructions,
): Promise<{ error?: string }> {
  const result = await updateManualPaymentInstructions(data);
  revalidatePath("/admin/configuracion");
  revalidatePath("/reservas", "layout");
  return result;
}

export async function updateFaqItemsAction(items: FaqItem[]): Promise<{ error?: string }> {
  const result = await updateFaqItems(items);
  revalidatePath("/admin/configuracion");
  revalidatePath("/faq");
  revalidatePath("/");
  return result;
}

export async function updateReminderHoursAction(hours: number[]): Promise<{ error?: string }> {
  const result = await updateReminderHours(hours);
  revalidatePath("/admin/configuracion");
  return result;
}
