import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { sendPushToTarotista } from "@/server/push-notifications";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";
import type { MessageSenderRole } from "@prisma/client";

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Chat de una consulta (Módulo B de la app) — habilitado SOLO cuando la
 * reserva ya está CONFIRMED + PAID, mismo criterio y misma verificación de
 * pertenencia que server/calls.ts::getCallAccess() (cliente dueño o
 * tarotista vinculado, nunca otra cuenta). Reutiliza el mismo patrón
 * `currentUser` opcional que el resto de la API v1 para no duplicar
 * lógica entre web y app.
 */
async function resolveChatAccess(bookingId: string, currentUser?: CurrentUser | null) {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." } as const;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tarotista: true },
  });
  if (!booking) return { error: "Reserva no encontrada." } as const;
  if (booking.status !== "CONFIRMED" || booking.paymentStatus !== "PAID") {
    return { error: "El chat todavía no está habilitado para esta consulta." } as const;
  }
  if (!booking.tarotistaId || !booking.tarotista) {
    return { error: "Esta reserva no tiene chat asociado." } as const;
  }

  const isClient = booking.userId === user.id;
  const isTarotista = booking.tarotista.userId === user.id;
  if (!isClient && !isTarotista) {
    return { error: "No tienes acceso a este chat." } as const;
  }

  const role: MessageSenderRole = isClient ? "CLIENT" : "TAROTISTA";
  return { booking, role, user } as const;
}

export interface GetMessagesResult {
  messages?: { id: string; senderRole: MessageSenderRole; senderName: string; text: string; createdAt: Date }[];
  error?: string;
}

/** Historial del chat, más reciente al final — marca como leídos los mensajes de la otra persona. */
export async function getMessages(bookingId: string, currentUser?: CurrentUser | null): Promise<GetMessagesResult> {
  const access = await resolveChatAccess(bookingId, currentUser);
  if ("error" in access) return { error: access.error };

  const messages = await prisma.message.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.message.updateMany({
    where: { bookingId, senderRole: { not: access.role }, readAt: null },
    data: { readAt: new Date() },
  });

  return { messages };
}

export interface SendMessageResult {
  success?: boolean;
  error?: string;
}

export async function sendMessage(
  bookingId: string,
  text: string,
  currentUser?: CurrentUser | null,
): Promise<SendMessageResult> {
  const trimmed = text.trim();
  if (!trimmed) return { error: "El mensaje no puede estar vacío." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) return { error: "El mensaje es demasiado largo." };

  const access = await resolveChatAccess(bookingId, currentUser);
  if ("error" in access) return { error: access.error };
  const { booking, role, user } = access;

  const senderName = role === "CLIENT" ? user.firstName : booking.tarotista!.name;

  await prisma.message.create({
    data: { bookingId, senderRole: role, senderName, text: trimmed },
  });

  if (role === "CLIENT" && booking.tarotistaId) {
    await sendPushToTarotista(booking.tarotistaId, {
      title: `Nuevo mensaje de ${senderName}`,
      body: trimmed.slice(0, 120),
      url: "/panel-tarotista",
    }).catch((err) => console.error("[push] new_message:", err));
    if (booking.tarotista?.userId) {
      await sendExpoPushToUser(booking.tarotista.userId, {
        title: `Nuevo mensaje de ${senderName}`,
        body: trimmed.slice(0, 120),
        data: { type: "new_message", bookingId, viewerRole: "TAROTISTA" },
      }).catch((err) => console.error("[expo-push] new_message:", err));
    }
  } else if (role === "TAROTISTA" && booking.userId) {
    await sendExpoPushToUser(booking.userId, {
      title: `Nuevo mensaje de ${senderName}`,
      body: trimmed.slice(0, 120),
      data: { type: "new_message", bookingId, viewerRole: "CLIENT" },
    }).catch((err) => console.error("[expo-push] new_message:", err));
  }

  return { success: true };
}
