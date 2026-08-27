import "server-only";
import { prisma } from "@/lib/prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Notificación push nativa (app móvil, Módulo C) a TODOS los dispositivos
 * registrados de un usuario — cliente o tarotista, cualquiera de los dos
 * puede recibirlas. Usa la API pública de Expo directamente (sin el SDK de
 * servidor, un simple fetch alcanza) — mismo criterio de "nunca lanza" que
 * sendPushToTarotista (Web Push): un envío fallido no puede romper el flujo
 * que lo dispara.
 */
export async function sendExpoPushToUser(userId: string, payload: ExpoPushPayload): Promise<void> {
  const tokens = await prisma.expoPushToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        tokens.map((t) => ({
          to: t.token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        })),
      ),
    });

    const result = await res.json().catch(() => null);
    const tickets: { status: string; details?: { error?: string } }[] = result?.data ?? [];

    await Promise.all(
      tickets.map(async (ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          await prisma.expoPushToken.delete({ where: { id: tokens[i].id } }).catch(() => {});
        }
      }),
    );
  } catch (err) {
    console.error("[expo-push] error enviando notificación:", err);
  }
}

export interface SaveExpoPushTokenResult {
  error?: string;
}

/** Registra (o re-vincula) el token de push nativo del dispositivo actual a la cuenta logueada. */
export async function saveExpoPushToken(userId: string, token: string): Promise<SaveExpoPushTokenResult> {
  if (!token) return { error: "Token inválido." };

  await prisma.expoPushToken.upsert({
    where: { token },
    update: { userId },
    create: { userId, token },
  });
  return {};
}
