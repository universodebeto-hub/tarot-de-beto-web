import "server-only";
import { prisma } from "@/lib/prisma";

/** Métodos manuales activos, para mostrar como opción de pago -- usado por ManualPaymentPanel además de los fijos (Pago Móvil/Zelle/...). */
export async function listActiveManualPaymentMethods() {
  return prisma.manualPaymentMethod.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
}

/** Mapa method -> logoUrl para todos los overrides guardados -- para resolver de una el logo efectivo de cada método fijo sin una consulta por método. */
export async function getPaymentMethodLogoOverrides(): Promise<Record<string, string>> {
  const rows = await prisma.paymentMethodLogo.findMany();
  return Object.fromEntries(rows.map((r) => [r.method, r.logoUrl]));
}
