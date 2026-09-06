import { NextResponse } from "next/server";
import { getManualPaymentInstructions } from "@/server/settings";

/** Datos de cuenta para cada método de pago manual (Pago Móvil, Zelle, Binance, Remitly, Western Union, MoneyGram, Bancolombia) + el WhatsApp de Beto, para el botón de respaldo cuando falla la subida del comprobante. */
export async function GET() {
  const instructions = await getManualPaymentInstructions();
  return NextResponse.json({ instructions, whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "" });
}
