import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderForBooking } from "@/server/paypal-orders";

const bodySchema = z.object({ bookingId: z.string().min(1) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const result = await createOrderForBooking(parsed.data.bookingId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ orderId: result.orderId });
}
