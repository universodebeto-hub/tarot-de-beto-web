import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { savePushSubscription } from "@/server/push-notifications";
import type { TarotistaStatus, AttentionRequestStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

const VALID_STATUSES: TarotistaStatus[] = ["DISPONIBLE", "EN_CONSULTA", "EN_REPOSO", "DESCONECTADO"];
const VALID_REQUEST_STATUSES: AttentionRequestStatus[] = ["PENDING", "CONTACTED", "DISMISSED"];

/**
 * Perfil de tarotista vinculado a la cuenta actualmente logueada — null si
 * no hay sesión, o si la cuenta no tiene ningún perfil vinculado (ver
 * server/admin/tarotistas.ts, que es donde el admin hace ese vínculo).
 * Genérico a propósito: no depende de saber quién es Alberto/Kaina, solo
 * de si ESTA cuenta tiene una fila de Tarotista con userId = su id.
 *
 * `currentUser` es opcional: la web (Server Actions) no lo pasa y esta
 * función resuelve la sesión sola por la cookie httpOnly; la API móvil
 * (app/api/v1/...) lo pasa explícito, ya resuelto desde el Bearer token
 * (ver lib/auth/api-auth.ts) — mismo patrón en todas las funciones de este
 * archivo, para no duplicar la lógica entre web y app.
 */
export async function getOwnTarotista(currentUser?: CurrentUser | null) {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return null;
  return prisma.tarotista.findUnique({ where: { userId: user.id } });
}

export interface SetOwnStatusResult {
  error?: string;
}

/** Cambia el estado del tarotista vinculado a la cuenta actual — nunca el de otra persona. */
export async function setOwnTarotistaStatus(
  status: TarotistaStatus,
  currentUser?: CurrentUser | null,
): Promise<SetOwnStatusResult> {
  if (!VALID_STATUSES.includes(status)) return { error: "Estado inválido." };

  const tarotista = await getOwnTarotista(currentUser);
  if (!tarotista) return { error: "Tu cuenta no tiene un perfil de tarotista vinculado." };

  await prisma.tarotista.update({
    where: { id: tarotista.id },
    data: { status, statusChangedAt: new Date() },
  });

  return {};
}

/** Solicitudes pendientes/recientes del tarotista vinculado a la cuenta actual (Fase 5). */
export async function getOwnAttentionRequests(currentUser?: CurrentUser | null) {
  const tarotista = await getOwnTarotista(currentUser);
  if (!tarotista) return [];

  return prisma.attentionRequest.findMany({
    where: { tarotistaId: tarotista.id },
    include: { service: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export interface SetRequestStatusResult {
  error?: string;
}

/** Marca una solicitud como contactada/descartada — solo si pertenece al tarotista de la cuenta actual. */
export async function setOwnAttentionRequestStatus(
  requestId: string,
  status: AttentionRequestStatus,
  currentUser?: CurrentUser | null,
): Promise<SetRequestStatusResult> {
  if (!VALID_REQUEST_STATUSES.includes(status)) return { error: "Estado inválido." };

  const tarotista = await getOwnTarotista(currentUser);
  if (!tarotista) return { error: "Tu cuenta no tiene un perfil de tarotista vinculado." };

  const request = await prisma.attentionRequest.findUnique({ where: { id: requestId } });
  if (!request || request.tarotistaId !== tarotista.id) {
    return { error: "Solicitud no encontrada." };
  }

  await prisma.attentionRequest.update({ where: { id: requestId }, data: { status } });
  return {};
}

/**
 * Consultas confirmadas y pagadas del tarotista vinculado a la cuenta
 * actual — de acá se entra a la llamada (Fase 11) y al chat (Módulo B de
 * la app). Cada consulta trae `unreadCount`: mensajes del cliente sin leer
 * por este tarotista.
 */
export async function getOwnConfirmedConsultations(currentUser?: CurrentUser | null) {
  const tarotista = await getOwnTarotista(currentUser);
  if (!tarotista) return [];

  const bookings = await prisma.booking.findMany({
    where: { tarotistaId: tarotista.id, status: "CONFIRMED", paymentStatus: "PAID" },
    include: { service: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (bookings.length === 0) return [];

  const unread = await prisma.message.groupBy({
    by: ["bookingId"],
    where: { bookingId: { in: bookings.map((b) => b.id) }, senderRole: "CLIENT", readAt: null },
    _count: { _all: true },
  });
  const unreadByBooking = new Map(unread.map((row) => [row.bookingId, row._count._all]));

  return bookings.map((booking) => ({ ...booking, unreadCount: unreadByBooking.get(booking.id) ?? 0 }));
}

export interface SubscribePushResult {
  error?: string;
}

/** Registra la suscripción push del navegador/dispositivo actual para el tarotista de la cuenta logueada (Fase 9). */
export async function subscribeOwnPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  currentUser?: CurrentUser | null,
): Promise<SubscribePushResult> {
  const tarotista = await getOwnTarotista(currentUser);
  if (!tarotista) return { error: "Tu cuenta no tiene un perfil de tarotista vinculado." };
  if (!endpoint || !p256dh || !auth) return { error: "Suscripción inválida." };

  await savePushSubscription({ tarotistaId: tarotista.id, endpoint, p256dh, auth });
  return {};
}
