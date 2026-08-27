import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";

export async function listSettingsAdmin() {
  return prisma.setting.findMany({ orderBy: { key: "asc" } });
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
