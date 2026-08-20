import { describe, it, expect, beforeEach, vi } from "vitest";

const paypalMocks = vi.hoisted(() => ({
  isPaypalConfigured: vi.fn(() => true),
  verifyPaypalWebhookSignature: vi.fn(async () => true),
}));

vi.mock("@/lib/paypal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paypal")>();
  return {
    ...actual,
    isPaypalConfigured: paypalMocks.isPaypalConfigured,
    verifyPaypalWebhookSignature: paypalMocks.verifyPaypalWebhookSignature,
  };
});

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/paypal/webhook/route";
import { resetDb } from "../helpers/db";

function webhookRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/paypal/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "paypal-transmission-id": "t1",
      "paypal-transmission-time": "2026-01-01T00:00:00Z",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-transmission-sig": "sig",
      ...headers,
    },
  });
}

// Evento que la ruta no intenta capturar (evita depender del flujo completo
// de captura, ya mockeado/probado indirectamente en otros tests) — sirve
// para aislar específicamente la lógica de idempotencia del webhook.
const event = { id: "WH-EVENT-1", event_type: "PAYMENT.CAPTURE.DENIED" };

describe("POST /api/paypal/webhook", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.PAYPAL_WEBHOOK_ID = "test-webhook-id";
    paypalMocks.isPaypalConfigured.mockReturnValue(true);
    paypalMocks.verifyPaypalWebhookSignature.mockResolvedValue(true);
  });

  it("responde 503 si PayPal no está configurado", async () => {
    paypalMocks.isPaypalConfigured.mockReturnValue(false);
    const res = await POST(webhookRequest(event));
    expect(res.status).toBe(503);
  });

  it("responde 400 si faltan cabeceras de verificación", async () => {
    const req = new Request("http://localhost/api/paypal/webhook", {
      method: "POST",
      body: JSON.stringify(event),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("responde 400 si la firma no verifica", async () => {
    paypalMocks.verifyPaypalWebhookSignature.mockResolvedValue(false);
    const res = await POST(webhookRequest(event));
    expect(res.status).toBe(400);
  });

  it("procesa un evento nuevo y lo registra", async () => {
    const res = await POST(webhookRequest(event));
    expect(res.status).toBe(200);
    const stored = await prisma.paypalWebhookEvent.findUnique({ where: { eventId: event.id } });
    expect(stored).toBeTruthy();
  });

  it("un evento repetido (mismo id) se detecta como duplicado y no se reprocesa", async () => {
    const first = await POST(webhookRequest(event));
    expect(first.status).toBe(200);
    expect((await first.json()).duplicate).toBeUndefined();

    const second = await POST(webhookRequest(event));
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.duplicate).toBe(true);

    const count = await prisma.paypalWebhookEvent.count({ where: { eventId: event.id } });
    expect(count).toBe(1);
  });
});
