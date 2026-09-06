"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setUserCreditApproval, updateClientInfo, promoteToAdmin } from "@/server/admin/clients";
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
