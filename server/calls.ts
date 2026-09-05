import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createCallToken, isLiveKitConfigured } from "@/server/livekit";
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

  return { token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, roomName: bookingId, otherPartyName };
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
