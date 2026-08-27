import { NextRequest, NextResponse } from "next/server";
import { submitManualPaymentProof } from "@/server/manual-payments";
import type { PaymentMethod } from "@prisma/client";

const VALID_METHODS: PaymentMethod[] = ["PAGO_MOVIL", "ZELLE", "BINANCE", "REMITLY", "WESTERN_UNION", "MONEYGRAM"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const bookingId = String(body?.bookingId ?? "");
  const method = body?.method as PaymentMethod;
  const reference = String(body?.reference ?? "");
  const proofUrl = String(body?.proofUrl ?? "");

  if (!bookingId || !VALID_METHODS.includes(method)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const result = await submitManualPaymentProof(bookingId, method, reference, proofUrl);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
