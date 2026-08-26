import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails("mailto:soporte@tarotdebeto.local", publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Envía una notificación push a TODAS las suscripciones activas de un
 * tarotista (puede tener varias: teléfono, laptop...). Sin proveedor
 * externo — Web Push estándar (ver public/sw.js para el lado del
 * navegador). Nunca lanza: un envío fallido no puede romper el flujo que
 * lo dispara (llega una solicitud, se confirma un pago), mismo criterio
 * que el resto de notificaciones del proyecto (ver server/notifications/send.ts).
 */
export async function sendPushToTarotista(tarotistaId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { tarotistaId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Suscripción vencida/revocada del lado del navegador -- se limpia sola.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[push] error enviando notificación:", err);
        }
      }
    }),
  );
}

export interface SaveSubscriptionInput {
  tarotistaId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(input: SaveSubscriptionInput): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { tarotistaId: input.tarotistaId, p256dh: input.p256dh, auth: input.auth },
    create: input,
  });
}
