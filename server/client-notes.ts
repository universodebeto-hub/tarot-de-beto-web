import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Un tarotista solo puede ver/anotar sobre un cliente que YA lo contrató
 * al menos una vez -- nunca sobre cualquier cliente al azar. El admin
 * siempre puede.
 */
async function canAccessClientNotes(clientId: string, user: CurrentUser): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const tarotista = await prisma.tarotista.findUnique({ where: { userId: user.id } });
  if (!tarotista) return false;

  const hasBooking = await prisma.booking.findFirst({
    where: { userId: clientId, tarotistaId: tarotista.id },
    select: { id: true },
  });
  return Boolean(hasBooking);
}

export interface ClientNotesResult {
  notes?: string | null;
  error?: string;
}

export async function getClientNotes(
  clientId: string,
  currentUser?: CurrentUser | null,
): Promise<ClientNotesResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };
  if (!(await canAccessClientNotes(clientId, user))) return { error: "No tienes acceso a las notas de este cliente." };

  const client = await prisma.user.findUnique({ where: { id: clientId }, select: { clientNotes: true } });
  if (!client) return { error: "Cliente no encontrado." };

  return { notes: client.clientNotes };
}

/** Agrega una entrada a la bitácora del cliente -- mismo formato "[fecha] autor: texto" que ya usa Booking.notes (addBookingNote). */
export async function addClientNote(
  clientId: string,
  note: string,
  currentUser?: CurrentUser | null,
): Promise<ClientNotesResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };
  if (!note.trim()) return { error: "La nota no puede estar vacía." };
  if (!(await canAccessClientNotes(clientId, user))) return { error: "No tienes acceso a las notas de este cliente." };

  const client = await prisma.user.findUnique({ where: { id: clientId }, select: { clientNotes: true } });
  if (!client) return { error: "Cliente no encontrado." };

  const stamp = `[${new Date().toISOString()}] ${user.firstName}: ${note.trim()}`;
  const notes = client.clientNotes ? `${client.clientNotes}\n${stamp}` : stamp;

  await prisma.user.update({ where: { id: clientId }, data: { clientNotes: notes } });

  return { notes };
}
