import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createCallToken, isLiveKitConfigured } from "@/server/livekit";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";

export interface CallAccessResult {
  token?: string;
  url?: string;
  roomName?: string;
  /** Nombre de la otra persona en la llamada, para mostrar en la UI. */
  otherPartyName?: string;
  error?: string;
}

/**
 * Autoriza a la cuenta logueada actual a entrar a la sala de audio de una
 * reserva (Fase 11) — solo el cliente dueño de la reserva o el tarotista
 * vinculado a ella. Reservas de invitado (sin cuenta) quedan fuera de la
 * llamada por ahora: siguen usando el puente de WhatsApp que ya existe en
 * /reservas/[id], mismo criterio de "no automatizar lo que no se puede
 * verificar sin sesión".
 */
export async function getCallAccess(
  bookingId: string,
  currentUser?: CurrentUser | null,
): Promise<CallAccessResult> {
  if (!isLiveKitConfigured()) {
    return { error: "Las llamadas todavía no están configuradas en este entorno." };
  }

  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión para entrar a la llamada." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tarotista: true, service: true, user: true },
  });
  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status !== "CONFIRMED" || booking.paymentStatus !== "PAID") {
    return { error: "Esta consulta todavía no está habilitada." };
  }
  if (!booking.tarotistaId || !booking.tarotista) {
    return { error: "Esta reserva no tiene una llamada asociada." };
  }

  const isClient = booking.userId === user.id;
  const isTarotista = booking.tarotista.userId === user.id;
  if (!isClient && !isTarotista) {
    return { error: "No tienes acceso a esta llamada." };
  }

  const clientName = booking.user?.firstName ?? booking.guestName ?? "tu cliente";

  const identity = isClient ? `cliente-${user.id}` : `tarotista-${booking.tarotista.id}`;
  const name = isClient ? user.firstName : booking.tarotista.name;
  const otherPartyName = isClient ? booking.tarotista.name : clientName;

  const token = await createCallToken(bookingId, identity, name);

  await prisma.callLog.create({ data: { bookingId, roomName: bookingId } });

  // Aviso de "llamada entrante" a la otra parte -- mismo mecanismo ya usado
  // por getInternalCallAccess() (server/internal-calls.ts), acá faltaba
  // por completo: sin esto, la persona del otro lado nunca se entera de
  // que alguien está llamando, tiene que estar mirando la pantalla de
  // casualidad. Reservas de invitado (sin userId) se quedan sin este aviso
  // -- no tienen cuenta a la que mandarle push.
  if (isClient) {
    if (booking.tarotista.userId) {
      await sendExpoPushToUser(booking.tarotista.userId, {
        title: "Llamada entrante",
        body: `${name} te está llamando.`,
        data: { type: "incoming_call", bookingId },
        priority: "high",
        sound: "default",
        channelId: "incoming_calls",
        categoryId: "incoming_call",
      }).catch((err) => console.error("[expo-push] incoming_call:", err));
    }
  } else if (booking.userId) {
    await sendExpoPushToUser(booking.userId, {
      title: "Llamada entrante",
      body: `${booking.tarotista.name} te está llamando.`,
      data: { type: "incoming_call", bookingId },
      priority: "high",
      sound: "default",
      channelId: "incoming_calls",
      categoryId: "incoming_call",
    }).catch((err) => console.error("[expo-push] incoming_call:", err));
  }

  return { token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, roomName: bookingId, otherPartyName };
}

export interface MarkCallConnectedResult {
  success?: boolean;
  error?: string;
}

/**
 * Marca el CallLog abierto de esta reserva como realmente contestado --
 * llamado por el cliente (web/móvil) recién cuando LiveKit avisa que la
 * OTRA persona entró a la sala (RoomEvent.ParticipantConnected), nunca al
 * pedir el token. Antes de esto, `connectedAt` queda null y ese tramo de
 * "timbrando sin que contesten" no cuenta como minutos consumidos (ver
 * server/admin/call-usage.ts). Idempotente: si ya estaba marcado, no hace nada.
 */
export async function markCallConnected(
  bookingId: string,
  currentUser?: CurrentUser | null,
): Promise<MarkCallConnectedResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { tarotista: true } });
  if (!booking) return { error: "Reserva no encontrada." };

  const isClient = booking.userId === user.id;
  const isTarotista = booking.tarotista?.userId === user.id;
  if (!isClient && !isTarotista) return { error: "No tienes acceso a esta llamada." };

  const openLog = await prisma.callLog.findFirst({
    where: { bookingId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (openLog && !openLog.connectedAt) {
    await prisma.callLog.update({ where: { id: openLog.id }, data: { connectedAt: new Date() } });
  }

  return { success: true };
}

export interface EndCallResult {
  success?: boolean;
  error?: string;
}

/**
 * Cierra el CallLog más reciente sin terminar de esta reserva -- llamado
 * por el cliente web/móvil al colgar o desconectarse (ver CallRoom.tsx /
 * CallScreen.tsx). No toca getCallAccess ni la lógica de habilitación;
 * solo deja constancia de que la llamada terminó.
 */
export async function endCall(bookingId: string, currentUser?: CurrentUser | null): Promise<EndCallResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { tarotista: true } });
  if (!booking) return { error: "Reserva no encontrada." };

  const isClient = booking.userId === user.id;
  const isTarotista = booking.tarotista?.userId === user.id;
  if (!isClient && !isTarotista) return { error: "No tienes acceso a esta llamada." };

  const openLog = await prisma.callLog.findFirst({
    where: { bookingId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (openLog) {
    await prisma.callLog.update({
      where: { id: openLog.id },
      data: { endedAt: new Date(), status: "COMPLETED" },
    });
  }

  return { success: true };
}
