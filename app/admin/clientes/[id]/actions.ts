"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setUserCreditApproval, updateClientInfo, promoteToAdmin, deleteClientAdmin } from "@/server/admin/clients";
import { grantComplimentaryConsultation } from "@/server/admin/gifts";
import type { AdminFormState } from "@/server/admin/services";

export async function setUserCreditApprovalFormAction(userId: string, approved: boolean): Promise<void> {
  await setUserCreditApproval(userId, approved);
  revalidatePath(`/admin/clientes/${userId}`);
}

/** Después de promover, esta cuenta ya no es un "cliente" -- getClientAdminById filtra por role CLIENT, así que quedarse en esta misma página mostraría un 404. Se manda de vuelta a la lista. */
export async function promoteToAdminAction(userId: string): Promise<{ error?: string } | void> {
  const result = await promoteToAdmin(userId);
  if (result.error) return result;
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function updateClientInfoAction(
  userId: string,
  prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const result = await updateClientInfo(userId, prev, formData);
  revalidatePath(`/admin/clientes/${userId}`);
  return result;
}

/** Elimina la cuenta desde su propio detalle -- si funciona, ya no hay página que mostrar, se manda de vuelta a la lista. */
export async function deleteClientAction(userId: string): Promise<AdminFormState> {
  const result = await deleteClientAdmin(userId);
  if (result.error) return result;
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

/** Misma acción, pero desde una fila de la lista -- solo refresca la lista, sin redirigir. */
export async function deleteClientFromListAction(userId: string): Promise<AdminFormState> {
  const result = await deleteClientAdmin(userId);
  if (!result.error) revalidatePath("/admin/clientes");
  return result;
}

export async function grantComplimentaryConsultationAction(
  clientId: string,
  serviceId: string,
  tarotistaId: string | null,
): Promise<{ error?: string; bookingId?: string }> {
  const result = await grantComplimentaryConsultation(clientId, serviceId, tarotistaId);
  if (!result.error) {
    revalidatePath(`/admin/clientes/${clientId}`);
    revalidatePath("/admin/reservas");
  }
  return result;
}
