import { NextResponse } from "next/server";
import { getManualPaymentInstructions } from "@/server/settings";

/** Datos de cuenta para cada método de pago manual (Pago Móvil, Zelle, Binance, Remitly, Western Union, MoneyGram). */
export async function GET() {
  const instructions = await getManualPaymentInstructions();
  return NextResponse.json({ instructions });
}
