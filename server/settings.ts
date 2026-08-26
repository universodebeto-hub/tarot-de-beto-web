import { prisma } from "@/lib/prisma";
import { faqItems as defaultFaqItems } from "@/lib/sample-data";
import type { FaqItem } from "@/types/content";

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

/** FAQ editable por el admin (setting `faq_items`, JSON); cae al listado por defecto si no está configurado. */
export async function getFaqItems(): Promise<FaqItem[]> {
  return getSetting<FaqItem[]>("faq_items", defaultFaqItems);
}

export interface ManualPaymentInstructions {
  pagoMovil: { telefono: string; cedula: string; banco: string };
  zelle: { correo: string; nombre: string };
  binance: { id: string; correo: string };
}

const DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS: ManualPaymentInstructions = {
  pagoMovil: { telefono: "", cedula: "", banco: "" },
  zelle: { correo: "", nombre: "" },
  binance: { id: "", correo: "" },
};

/** Datos de contacto para Pago Móvil/Zelle/Binance (setting `manual_payment_instructions`, JSON), editable en /admin/configuracion. */
export async function getManualPaymentInstructions(): Promise<ManualPaymentInstructions> {
  return getSetting<ManualPaymentInstructions>(
    "manual_payment_instructions",
    DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS,
  );
}
