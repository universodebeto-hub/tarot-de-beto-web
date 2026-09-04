import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createCallToken, isLiveKitConfigured } from "@/server/livekit";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";

export interface InternalCallAccessResult {
  token?: string;
  url?: string;
  roomName?: string;
  /** Nombre de la otra persona en la llamada, para mostrar en la UI. */
  otherPartyName?: string;
  error?: string;
}

/**
 * Llamada interna (no ligada a una reserva) entre el administrador y un
 * tarotista de su equipo -- para coordinar sin depender de WhatsApp. Sala
 * fija por tarotista (roomName = internal-<tarotistaId>), reutilizable en
 * cada llamada. Solo dos cuentas pueden entrar: cualquier ADMIN, o el
 * usuario vinculado a ese tarotista.
 */
export async function getInternalCallAccess(
  tarotistaId: string,
  currentUser?: CurrentUser | null,
): Promise<InternalCallAccessResult> {
  if (!isLiveKitConfigured()) {
    return { error: "Las llamadas todavía no están configuradas en este entorno." };
  }

  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión para entrar a la llamada." };

  const tarotista = await prisma.tarotista.findUnique({ where: { id: tarotistaId } });
  if (!tarotista) return { error: "Tarotista no encontrado." };

  const isAdmin = user.role === "ADMIN";
  const isThisTarotista = tarotista.userId === user.id;
  if (!isAdmin && !isThisTarotista) {
    return { error: "No tienes acceso a esta llamada." };
  }
  if (isAdmin && !tarotista.userId) {
    return { error: "Este tarotista todavía no tiene una cuenta vinculada para recibir la llamada." };
  }

  const roomName = `internal-${tarotistaId}`;
  const identity = `usuario-${user.id}`;

  if (isAdmin) {
    await sendExpoPushToUser(tarotista.userId!, {
      title: "Llamada interna",
      body: `${user.firstName} te está llamando.`,
      data: { type: "internal_call", tarotistaId },
    });
  } else {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        sendExpoPushToUser(admin.id, {
          title: "Llamada interna",
          body: `${tarotista.name} te está llamando.`,
          data: { type: "internal_call", tarotistaId },
        }),
      ),
    );
  }

  const otherPartyName = isAdmin ? tarotista.name : "Administración";

  const token = await createCallToken(roomName, identity, user.firstName);
  return { token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, roomName, otherPartyName };
}
