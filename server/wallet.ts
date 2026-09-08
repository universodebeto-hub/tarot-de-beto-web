import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createCallToken, isLiveKitConfigured } from "@/server/livekit";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";
import type { PaymentMethod } from "@prisma/client";

/**
 * Suma minutos a la bolsa compartida del cliente (User.minutesBalance) --
 * se llama al confirmar el pago de una consulta en vivo (con tarotista
 * asignado, no un informe ni un ritual). Nunca para CREDITO_BETO (tiene su
 * propio control de 300 min) ni CORTESIA (queda atada solo al tarotista
 * que la regaló, por decisión explícita). Reservas de invitado (sin
 * cuenta) no tienen bolsa -- no hay a quién sumarle el saldo.
 */
export async function fundMinutesWalletIfApplicable(booking: {
  userId: string | null;
  tarotistaId: string | null;
  paymentMethod: PaymentMethod | null;
  service: { durationMinutes: number };
}): Promise<void> {
  if (!booking.userId || !booking.tarotistaId) return;
  if (booking.paymentMethod === "CREDITO_BETO" || booking.paymentMethod === "CORTESIA") return;

  await prisma.user.update({
    where: { id: booking.userId },
    data: { minutesBalance: { increment: booking.service.durationMinutes } },
  });
}

export interface WalletCallAccessResult {
  token?: string;
  url?: string;
  roomName?: string;
  otherPartyName?: string;
  minutesBalance?: number;
  error?: string;
}

/**
 * Habilita una llamada de la bolsa de minutos -- a diferencia de
 * getCallAccess (server/calls.ts), no está atada a ninguna reserva ni a un
 * tarotista en particular: cualquier cliente con saldo puede llamar a
 * cualquier tarotista. Sala nueva por llamada (nunca se reutiliza, a
 * diferencia de las internas admin↔tarotista).
 */
export async function getWalletCallAccess(
  tarotistaId: string,
  currentUser?: CurrentUser | null,
): Promise<WalletCallAccessResult> {
  if (!isLiveKitConfigured()) {
    return { error: "Las llamadas todavía no están configuradas en este entorno." };
  }

  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión para llamar." };
  if (user.role !== "CLIENT") return { error: "Solo un cliente puede usar minutos de la bolsa." };

  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!freshUser || freshUser.minutesBalance <= 0) {
    return { error: "No tenés minutos disponibles todavía -- comprá una consulta para cargar tu saldo." };
  }

  const tarotista = await prisma.tarotista.findUnique({ where: { id: tarotistaId } });
  if (!tarotista) return { error: "Tarotista no encontrado." };
  if (!tarotista.userId) return { error: "Este tarotista todavía no tiene una cuenta vinculada para recibir la llamada." };

  const roomName = `wallet-${user.id}-${Date.now()}`;
  const identity = `cliente-${user.id}`;

  const token = await createCallToken(roomName, identity, user.firstName);

  await prisma.callLog.create({
    data: { bookingId: null, roomName, walletClientId: user.id, walletTarotistaId: tarotistaId },
  });

  await sendExpoPushToUser(tarotista.userId, {
    title: "Llamada entrante",
    body: `${user.firstName} te está llamando (con sus minutos disponibles).`,
    data: { type: "wallet_call", roomName },
    priority: "high",
    sound: "default",
    channelId: "incoming_calls",
    categoryId: "incoming_call",
  }).catch((err) => console.error("[expo-push] wallet_call:", err));

  return { token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, roomName, otherPartyName: tarotista.name, minutesBalance: freshUser.minutesBalance };
}

export interface WalletActionResult {
  success?: boolean;
  error?: string;
}

/** Marca la llamada como realmente contestada -- mismo criterio que markCallConnected (server/calls.ts), para no descontar tiempo de timbrado sin respuesta. */
export async function markWalletCallConnected(roomName: string, currentUser?: CurrentUser | null): Promise<WalletActionResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };

  const openLog = await prisma.callLog.findFirst({ where: { roomName, endedAt: null } });
  if (openLog && !openLog.connectedAt) {
    await prisma.callLog.update({ where: { id: openLog.id }, data: { connectedAt: new Date() } });
  }
  return { success: true };
}

/** Cierra la llamada y descuenta el tiempo REAL (connectedAt -> ahora) del saldo del cliente -- nunca deja el saldo en negativo. */
export async function endWalletCall(roomName: string, currentUser?: CurrentUser | null): Promise<WalletActionResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };

  const openLog = await prisma.callLog.findFirst({ where: { roomName, endedAt: null } });
  if (!openLog) return { success: true };

  const endedAt = new Date();
  const minutesUsed = openLog.connectedAt
    ? Math.max(0, Math.round((endedAt.getTime() - openLog.connectedAt.getTime()) / 60000))
    : 0;

  await prisma.$transaction([
    prisma.callLog.update({ where: { id: openLog.id }, data: { endedAt, status: "COMPLETED" } }),
    ...(openLog.walletClientId && minutesUsed > 0
      ? [
          prisma.user.update({
            where: { id: openLog.walletClientId },
            data: { minutesBalance: { decrement: minutesUsed } },
          }),
        ]
      : []),
  ]);

  // Nunca queda en negativo -- si el descuento de arriba lo hizo caer por
  // debajo de cero (llamada más larga que el saldo real al momento de
  // cerrar), se pisa a 0 en una segunda pasada en vez de un chequeo
  // condicional complejo dentro de la misma transacción.
  if (openLog.walletClientId) {
    const client = await prisma.user.findUnique({ where: { id: openLog.walletClientId } });
    if (client && client.minutesBalance < 0) {
      await prisma.user.update({ where: { id: openLog.walletClientId }, data: { minutesBalance: 0 } });
    }
  }

  return { success: true };
}
