import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { TarotistaStatus, AttentionRequestStatus } from "@prisma/client";

const VALID_STATUSES: TarotistaStatus[] = ["DISPONIBLE", "EN_CONSULTA", "EN_REPOSO", "DESCONECTADO"];
const VALID_REQUEST_STATUSES: AttentionRequestStatus[] = ["PENDING", "CONTACTED", "DISMISSED"];

/**
 * Perfil de tarotista vinculado a la cuenta actualmente logueada — null si
 * no hay sesión, o si la cuenta no tiene ningún perfil vinculado (ver
 * server/admin/tarotistas.ts, que es donde el admin hace ese vínculo).
 * Genérico a propósito: no depende de saber quién es Alberto/Caína, solo
 * de si ESTA cuenta tiene una fila de Tarotista con userId = su id.
 */
export async function getOwnTarotista() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.tarotista.findUnique({ where: { userId: user.id } });
}

export interface SetOwnStatusResult {
  error?: string;
}

/** Cambia el estado del tarotista vinculado a la cuenta actual — nunca el de otra persona. */
export async function setOwnTarotistaStatus(status: TarotistaStatus): Promise<SetOwnStatusResult> {
  if (!VALID_STATUSES.includes(status)) return { error: "Estado inválido." };

  const tarotista = await getOwnTarotista();
  if (!tarotista) return { error: "Tu cuenta no tiene un perfil de tarotista vinculado." };

  await prisma.tarotista.update({
    where: { id: tarotista.id },
    data: { status, statusChangedAt: new Date() },
  });

  return {};
}

/** Solicitudes pendientes/recientes del tarotista vinculado a la cuenta actual (Fase 5). */
export async function getOwnAttentionRequests() {
  const tarotista = await getOwnTarotista();
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
): Promise<SetRequestStatusResult> {
  if (!VALID_REQUEST_STATUSES.includes(status)) return { error: "Estado inválido." };

  const tarotista = await getOwnTarotista();
  if (!tarotista) return { error: "Tu cuenta no tiene un perfil de tarotista vinculado." };

  const request = await prisma.attentionRequest.findUnique({ where: { id: requestId } });
  if (!request || request.tarotistaId !== tarotista.id) {
    return { error: "Solicitud no encontrada." };
  }

  await prisma.attentionRequest.update({ where: { id: requestId }, data: { status } });
  return {};
}
