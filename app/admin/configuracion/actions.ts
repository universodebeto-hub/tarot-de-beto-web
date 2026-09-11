"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { getTikTokAuthorizeUrl, disconnectTikTok } from "@/server/tiktok";
import {
  createPromoBanner,
  updatePromoBanner,
  togglePromoBannerActive,
  deletePromoBanner,
} from "@/server/admin/promo-banners";
import type { ManualPaymentInstructions } from "@/server/settings";
import type { FaqItem } from "@/types/content";
import type { PaymentMethod, PromoBannerPosition } from "@prisma/client";

export async function connectTikTokAction(): Promise<{ error?: string }> {
  const result = await getTikTokAuthorizeUrl();
  if (result.error || !result.url) return { error: result.error ?? "No se pudo iniciar la conexión." };
  redirect(result.url);
}

export async function disconnectTikTokAction(): Promise<{ error?: string }> {
  const result = await disconnectTikTok();
  if (!result.error) revalidatePath("/admin/configuracion");
  return result;
}

function revalidatePromoBannerPages() {
  revalidatePath("/admin/configuracion");
  revalidatePath("/", "layout");
}

export async function createPromoBannerAction(input: {
  imageUrl: string;
  linkUrl: string;
  position: PromoBannerPosition;
}): Promise<{ error?: string }> {
  const result = await createPromoBanner(input);
  if (!result.error) revalidatePromoBannerPages();
  return result;
}

export async function updatePromoBannerAction(
  id: string,
  input: { imageUrl?: string; linkUrl?: string; position?: PromoBannerPosition },
): Promise<{ error?: string }> {
  const result = await updatePromoBanner(id, input);
  if (!result.error) revalidatePromoBannerPages();
  return result;
}

export async function togglePromoBannerActiveAction(id: string): Promise<{ error?: string }> {
  const result = await togglePromoBannerActive(id);
  if (!result.error) revalidatePromoBannerPages();
  return result;
}

export async function deletePromoBannerAction(id: string): Promise<{ error?: string }> {
  const result = await deletePromoBanner(id);
  if (!result.error) revalidatePromoBannerPages();
  return result;
}

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
