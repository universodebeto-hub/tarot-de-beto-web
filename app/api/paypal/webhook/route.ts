import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaypalWebhookSignature, isPaypalConfigured } from "@/lib/paypal";
import { captureOrderForBooking } from "@/server/paypal-orders";

interface PaypalWebhookEventBody {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
}

/**
 * Recibe eventos de PayPal. Nunca confía en el payload sin verificar la
 * firma contra la API de PayPal. Idempotente vía `PaypalWebhookEvent`
 * (PayPal reintenta entregas, así que el mismo evento puede llegar más
 * de una vez). Sirve como respaldo del flujo principal (captura directa
 * desde el botón del cliente) para el caso en que el usuario cierre la
 * pestaña justo después de aprobar el pago.
 */
export async function POST(request: Request) {
  if (!isPaypalConfigured() || !process.env.PAYPAL_WEBHOOK_ID) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
  }

  const rawBody = await request.text();
  let event: PaypalWebhookEventBody;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return NextResponse.json({ error: "Faltan cabeceras de verificación." }, { status: 400 });
  }

  let verified: boolean;
  try {
    verified = await verifyPaypalWebhookSignature({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
      webhookEvent: JSON.parse(rawBody),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la firma." }, { status: 502 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  // Idempotencia: si ya procesamos este evento, respondemos 200 sin repetir nada.
  try {
    await prisma.paypalWebhookEvent.create({
      data: { eventId: event.id, eventType: event.event_type },
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" || event.event_type === "CHECKOUT.ORDER.APPROVED") {
    const orderId = event.resource?.supplementary_data?.related_ids?.order_id ?? event.resource?.id;
    if (orderId) {
      await captureOrderForBooking(orderId).catch(() => null);
    }
  }

  return NextResponse.json({ received: true });
}
