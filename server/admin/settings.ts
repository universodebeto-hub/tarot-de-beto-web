import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";
import { getPaymentMethodsEnabled } from "@/server/settings";
import type { ManualPaymentInstructions, PaymentMethodsEnabled, FixedPaymentMethodKey } from "@/server/settings";
import type { FaqItem } from "@/types/content";

export async function listSettingsAdmin() {
  return prisma.setting.findMany({ orderBy: { key: "asc" } });
}

async function saveSettingValue(key: string, value: unknown, currentUser?: CurrentUser | null): Promise<void> {
  const admin = await requireAdmin(currentUser);
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
  await logAdminAction({ adminId: admin.id, action: "setting.updated", targetType: "Setting", targetId: key });
}

/** Guarda los datos de cuenta para pago manual (setting `manual_payment_instructions`) desde el formulario con un campo por dato, sin que el admin toque JSON. */
export async function updateManualPaymentInstructions(
  data: ManualPaymentInstructions,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string }> {
  await saveSettingValue("manual_payment_instructions", data, currentUser);
  return {};
}

/** Prende/apaga un método de pago FIJO (PayPal o uno de los 7 manuales) sin tocar sus datos de cuenta ni credenciales -- setting `payment_methods_enabled`. Para los métodos agregados por el admin, ver toggleManualPaymentMethodActive() en server/admin/payment-methods.ts. */
export async function togglePaymentMethodEnabled(
  key: FixedPaymentMethodKey,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string }> {
  const current = await getPaymentMethodsEnabled();
  const next: PaymentMethodsEnabled = { ...current, [key]: !current[key] };
  await saveSettingValue("payment_methods_enabled", next, currentUser);
  return {};
}

/** Guarda la lista de preguntas frecuentes (setting `faq_items`) -- filtra pares vacíos que hayan quedado del editor. */
export async function updateFaqItems(items: FaqItem[], currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const cleaned = items.filter((i) => i.question.trim() && i.answer.trim());
  await saveSettingValue("faq_items", cleaned, currentUser);
  return {};
}

/** Guarda a cuántas horas antes de la consulta se manda cada recordatorio (setting `reminder_hours_before`). */
export async function updateReminderHours(hours: number[], currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const cleaned = hours.filter((h) => Number.isFinite(h) && h > 0);
  if (cleaned.length === 0) return { error: "Agregá al menos un recordatorio válido." };
  await saveSettingValue("reminder_hours_before", cleaned, currentUser);
  return {};
}

export interface AdminFormState {
  error?: string;
  success?: boolean;
}

/** Guarda un setting como JSON. `rawValue` es lo que el admin escribió — se intenta como JSON, y si no parsea, se guarda como string JSON-encoded. */
export async function upsertSettingAdmin(
  key: string,
  _prev: AdminFormState,
  formData: FormData,
  currentUser?: CurrentUser | null,
): Promise<AdminFormState> {
  const admin = await requireAdmin(currentUser);
  const rawValue = String(formData.get("value") ?? "");

  let value: string;
  try {
    JSON.parse(rawValue);
    value = rawValue;
  } catch {
    value = JSON.stringify(rawValue);
  }

  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "setting.updated",
    targetType: "Setting",
    targetId: key,
  });

  return { success: true };
}
