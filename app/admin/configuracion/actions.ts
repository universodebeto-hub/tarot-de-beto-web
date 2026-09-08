"use server";

import { revalidatePath } from "next/cache";
import {
  updateManualPaymentInstructions,
  updateFaqItems,
  updateReminderHours,
} from "@/server/admin/settings";
import {
  createManualPaymentMethod,
  updateManualPaymentMethod,
  toggleManualPaymentMethodActive,
  deleteManualPaymentMethod,
  setPaymentMethodLogo,
} from "@/server/admin/payment-methods";
import type { ManualPaymentInstructions } from "@/server/settings";
import type { FaqItem } from "@/types/content";
import type { PaymentMethod } from "@prisma/client";

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

function revalidatePaymentPages() {
  revalidatePath("/admin/configuracion");
  revalidatePath("/reservas", "layout");
}

export async function createManualPaymentMethodAction(input: {
  name: string;
  instructions: string;
  logoUrl: string;
}): Promise<{ error?: string }> {
  const result = await createManualPaymentMethod(input);
  if (!result.error) revalidatePaymentPages();
  return result;
}

export async function updateManualPaymentMethodAction(
  id: string,
  input: { name: string; instructions: string; logoUrl?: string },
): Promise<{ error?: string }> {
  const result = await updateManualPaymentMethod(id, input);
  if (!result.error) revalidatePaymentPages();
  return result;
}

export async function toggleManualPaymentMethodActiveAction(id: string): Promise<{ error?: string }> {
  const result = await toggleManualPaymentMethodActive(id);
  if (!result.error) revalidatePaymentPages();
  return result;
}

export async function deleteManualPaymentMethodAction(id: string): Promise<{ error?: string }> {
  const result = await deleteManualPaymentMethod(id);
  if (!result.error) revalidatePaymentPages();
  return result;
}

export async function setPaymentMethodLogoAction(
  methodKey: PaymentMethod | string,
  logoUrl: string,
): Promise<{ error?: string }> {
  const result = await setPaymentMethodLogo(methodKey, logoUrl);
  if (!result.error) revalidatePaymentPages();
  return result;
}
