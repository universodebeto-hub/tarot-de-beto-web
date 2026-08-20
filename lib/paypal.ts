import "server-only";

/**
 * Cliente mínimo de la API REST de PayPal (Orders v2). Todo esto corre
 * solo en el servidor — PAYPAL_CLIENT_SECRET nunca debe llegar al cliente.
 * Requiere NEXT_PUBLIC_PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y
 * PAYPAL_ENVIRONMENT ("sandbox" o "production") configurados. Si faltan,
 * las funciones lanzan un error explícito — el llamador decide cómo
 * degradar (ver server/paypal-orders.ts, que revisa `isPaypalConfigured()`
 * primero). El Client ID es público a propósito (PayPal lo diseñó así
 * para cargar el botón en el navegador); solo el Secret es sensible.
 */

function paypalApiBase(): string {
  const env = process.env.PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";
  return env === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPaypalConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function requireCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal no está configurado (faltan NEXT_PUBLIC_PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).");
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = requireCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo autenticar con PayPal (${res.status}).`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function paypalFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalApiBase()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const body = await res.json();
  if (!res.ok) {
    const message = typeof body === "object" && body && "message" in body ? String(body.message) : res.statusText;
    throw new Error(`Error de PayPal (${res.status}): ${message}`);
  }
  return body as T;
}

export interface PaypalOrder {
  id: string;
  status: string;
  purchase_units?: Array<{
    amount?: { value: string; currency_code: string };
    payments?: {
      captures?: Array<{ id: string; status: string; amount?: { value: string; currency_code: string } }>;
    };
  }>;
}

/** Crea una orden PayPal por el monto exacto del servicio reservado. */
export async function createPaypalOrder(params: {
  amount: number;
  currency: string;
  bookingId: string;
  bookingNumber: string;
}): Promise<PaypalOrder> {
  return paypalFetch<PaypalOrder>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.bookingId,
          custom_id: params.bookingId,
          invoice_id: params.bookingNumber,
          description: `Reserva ${params.bookingNumber}`,
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
    }),
  });
}

export async function getPaypalOrder(orderId: string): Promise<PaypalOrder> {
  return paypalFetch<PaypalOrder>(`/v2/checkout/orders/${orderId}`, { method: "GET" });
}

/** Captura el pago de una orden ya aprobada por el comprador. */
export async function capturePaypalOrder(orderId: string): Promise<PaypalOrder> {
  return paypalFetch<PaypalOrder>(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
}

export interface WebhookVerificationInput {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId: string;
  webhookEvent: unknown;
}

/** Verifica la firma de un evento de webhook contra la API de PayPal (nunca confiar en el payload sin verificar). */
export async function verifyPaypalWebhookSignature(input: WebhookVerificationInput): Promise<boolean> {
  const result = await paypalFetch<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: input.transmissionId,
      transmission_time: input.transmissionTime,
      cert_url: input.certUrl,
      auth_algo: input.authAlgo,
      transmission_sig: input.transmissionSig,
      webhook_id: input.webhookId,
      webhook_event: input.webhookEvent,
    }),
  });
  return result.verification_status === "SUCCESS";
}
