import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { sendPushToTarotista } from "@/server/push-notifications";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";
import type { MessageSenderRole, Prisma } from "@prisma/client";

type ChatBooking = Prisma.BookingGetPayload<{ include: { tarotista: true } }>;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_AUDIO_DURATION_SECONDS = 300;

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
  messages?: {
    id: string;
    senderRole: MessageSenderRole;
    senderName: string;
    type: "TEXT" | "AUDIO";
    text: string | null;
    audioUrl: string | null;
    audioDurationSeconds: number | null;
    createdAt: Date;
  }[];
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

/** Notifica a la otra parte de la conversación -- misma lógica para mensajes de texto y de audio. */
async function notifyNewMessage(
  booking: ChatBooking,
  role: MessageSenderRole,
  senderName: string,
  preview: string,
  bookingId: string,
) {
  if (role === "CLIENT" && booking.tarotistaId) {
    await sendPushToTarotista(booking.tarotistaId, {
      title: `Nuevo mensaje de ${senderName}`,
      body: preview,
      url: "/panel-tarotista",
    }).catch((err) => console.error("[push] new_message:", err));
    if (booking.tarotista?.userId) {
      await sendExpoPushToUser(booking.tarotista.userId, {
        title: `Nuevo mensaje de ${senderName}`,
        body: preview,
        data: { type: "new_message", bookingId, viewerRole: "TAROTISTA" },
      }).catch((err) => console.error("[expo-push] new_message:", err));
    }
  } else if (role === "TAROTISTA" && booking.userId) {
    await sendExpoPushToUser(booking.userId, {
      title: `Nuevo mensaje de ${senderName}`,
      body: preview,
      data: { type: "new_message", bookingId, viewerRole: "CLIENT" },
    }).catch((err) => console.error("[expo-push] new_message:", err));
  }
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
    data: { bookingId, senderRole: role, senderName, type: "TEXT", text: trimmed },
  });

  await notifyNewMessage(booking, role, senderName, trimmed.slice(0, 120), bookingId);

  return { success: true };
}

/**
 * Nota de voz: mismo acceso/gating que sendMessage (resolveChatAccess); el
 * archivo ya fue subido a Vercel Blob por el caller (ver
 * app/api/uploads/voice-message/route.ts) -- acá solo se registra el
 * mensaje y se notifica, igual que un mensaje de texto.
 */
export async function sendAudioMessage(
  bookingId: string,
  audioUrl: string,
  audioDurationSeconds: number,
  currentUser?: CurrentUser | null,
): Promise<SendMessageResult> {
  if (!audioUrl.trim()) return { error: "Falta el audio." };
  if (!Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0) {
    return { error: "Duración de audio inválida." };
  }
  if (audioDurationSeconds > MAX_AUDIO_DURATION_SECONDS) {
    return { error: "La nota de voz es demasiado larga." };
  }

  const access = await resolveChatAccess(bookingId, currentUser);
  if ("error" in access) return { error: access.error };
  const { booking, role, user } = access;

  const senderName = role === "CLIENT" ? user.firstName : booking.tarotista!.name;

  await prisma.message.create({
    data: {
      bookingId,
      senderRole: role,
      senderName,
      type: "AUDIO",
      audioUrl: audioUrl.trim(),
      audioDurationSeconds: Math.round(audioDurationSeconds),
    },
  });

  await notifyNewMessage(booking, role, senderName, "🎤 Nota de voz", bookingId);

  return { success: true };
}
