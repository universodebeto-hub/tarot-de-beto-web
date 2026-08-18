import { prisma } from "@/lib/prisma";

/** Lee un valor de configuración (tabla `Setting`, editable por el admin en la Fase 7). */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
