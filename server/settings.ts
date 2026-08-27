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
  remitly: { nombre: string; pais: string; telefono: string };
  westernUnion: { nombre: string; pais: string; telefono: string };
  moneygram: { nombre: string; pais: string; telefono: string };
}

const DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS: ManualPaymentInstructions = {
  pagoMovil: { telefono: "", cedula: "", banco: "" },
  zelle: { correo: "", nombre: "" },
  binance: { id: "", correo: "" },
  remitly: { nombre: "", pais: "", telefono: "" },
  westernUnion: { nombre: "", pais: "", telefono: "" },
  moneygram: { nombre: "", pais: "", telefono: "" },
};

/** Datos de contacto para pagos manuales (setting `manual_payment_instructions`, JSON), editable en /admin/configuracion. */
export async function getManualPaymentInstructions(): Promise<ManualPaymentInstructions> {
  const stored = await getSetting<Partial<ManualPaymentInstructions>>("manual_payment_instructions", {});
  // Merge superficial con los valores por defecto -- si el admin guardó esta
  // configuración antes de que existieran los métodos nuevos (Remitly/
  // Western Union/MoneyGram), esas claves faltantes no deben romper la
  // pantalla, solo mostrarse vacías hasta que el admin las complete.
  return {
    pagoMovil: { ...DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS.pagoMovil, ...stored.pagoMovil },
    zelle: { ...DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS.zelle, ...stored.zelle },
    binance: { ...DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS.binance, ...stored.binance },
    remitly: { ...DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS.remitly, ...stored.remitly },
    westernUnion: { ...DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS.westernUnion, ...stored.westernUnion },
    moneygram: { ...DEFAULT_MANUAL_PAYMENT_INSTRUCTIONS.moneygram, ...stored.moneygram },
  };
}
