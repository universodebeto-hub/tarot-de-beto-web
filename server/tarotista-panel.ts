import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { TarotistaStatus } from "@prisma/client";

const VALID_STATUSES: TarotistaStatus[] = ["DISPONIBLE", "EN_CONSULTA", "EN_REPOSO", "DESCONECTADO"];

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
