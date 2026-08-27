import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { businessLocalToUtc, formatMinutes } from "@/lib/timezone";
import type { CurrentUser } from "@/lib/auth/session";

export async function listAvailabilityAdmin() {
  return prisma.availability.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] });
}

export async function listBlockedTimesAdmin() {
  return prisma.blockedTime.findMany({ orderBy: { startsAt: "desc" }, take: 100 });
}

export interface AdminFormState {
  error?: string;
  success?: boolean;
}

function timeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  active: z.coerce.boolean().default(true),
});

export async function upsertAvailabilityRange(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = availabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  const startMinute = timeToMinutes(parsed.data.startTime);
  const endMinute = timeToMinutes(parsed.data.endTime);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) {
    return { error: "El horario de inicio debe ser antes que el de fin." };
  }

  const row = await prisma.availability.create({
    data: { dayOfWeek: parsed.data.dayOfWeek, startMinute, endMinute, active: parsed.data.active },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "availability.created",
    targetType: "Availability",
    targetId: row.id,
    details: `día ${parsed.data.dayOfWeek} ${parsed.data.startTime}-${parsed.data.endTime}`,
  });

  return { success: true };
}

export async function deleteAvailabilityRange(id: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.availability.delete({ where: { id } });
  await logAdminAction({ adminId: admin.id, action: "availability.deleted", targetType: "Availability", targetId: id });
}

export async function toggleAvailabilityActive(id: string): Promise<void> {
  const admin = await requireAdmin();
  const row = await prisma.availability.findUniqueOrThrow({ where: { id } });
  await prisma.availability.update({ where: { id }, data: { active: !row.active } });
  await logAdminAction({
    adminId: admin.id,
    action: row.active ? "availability.deactivated" : "availability.activated",
    targetType: "Availability",
    targetId: id,
  });
}

const blockSchema = z.object({
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().trim().max(200).optional(),
});

export async function createBlockedTimeAdmin(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = blockSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success || !parsed.data.date) return { error: "Fecha inválida." };

  const hasRange = parsed.data.startTime && parsed.data.endTime;
  let startMinute = 0;
  let endMinute = 24 * 60;

  if (hasRange) {
    const s = timeToMinutes(parsed.data.startTime!);
    const e = timeToMinutes(parsed.data.endTime!);
    if (s === null || e === null || e <= s) {
      return { error: "El horario de inicio debe ser antes que el de fin." };
    }
    startMinute = s;
    endMinute = e;
  }

  const startsAt = businessLocalToUtc(parsed.data.date, startMinute);
  const endsAt = businessLocalToUtc(parsed.data.date, endMinute);

  const row = await prisma.blockedTime.create({
    data: { startsAt, endsAt, reason: parsed.data.reason },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "blocked_time.created",
    targetType: "BlockedTime",
    targetId: row.id,
    details: `${parsed.data.date}${hasRange ? ` ${parsed.data.startTime}-${parsed.data.endTime}` : " (día completo)"}`,
  });

  return { success: true };
}

export async function deleteBlockedTimeAdmin(id: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.blockedTime.delete({ where: { id } });
  await logAdminAction({ adminId: admin.id, action: "blocked_time.deleted", targetType: "BlockedTime", targetId: id });
}

/**
 * Bloquea o libera un único bloque de 15 min desde el calendario visual del
 * admin (clic directo sobre una celda) — atajo rápido sobre el mismo modelo
 * `BlockedTime` que usa `createBlockedTimeAdmin`/`deleteBlockedTimeAdmin`
 * para bloqueos por rango; este solo cubre el caso de una celda exacta.
 */
export async function toggleQuickBlock(
  date: string,
  startMinute: number,
  currentUser?: CurrentUser | null,
): Promise<void> {
  const admin = await requireAdmin(currentUser);
  const startsAt = businessLocalToUtc(date, startMinute);
  const endsAt = businessLocalToUtc(date, startMinute + 15);

  const existing = await prisma.blockedTime.findFirst({ where: { startsAt, endsAt } });
  if (existing) {
    await prisma.blockedTime.delete({ where: { id: existing.id } });
    await logAdminAction({
      adminId: admin.id,
      action: "blocked_time.deleted",
      targetType: "BlockedTime",
      targetId: existing.id,
      details: `${date} ${formatMinutes(startMinute)} (calendario)`,
    });
  } else {
    const row = await prisma.blockedTime.create({ data: { startsAt, endsAt } });
    await logAdminAction({
      adminId: admin.id,
      action: "blocked_time.created",
      targetType: "BlockedTime",
      targetId: row.id,
      details: `${date} ${formatMinutes(startMinute)} (calendario)`,
    });
  }
}
