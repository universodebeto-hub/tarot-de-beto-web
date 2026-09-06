"use server";

import { revalidatePath } from "next/cache";
import { setUserCreditApproval, updateClientInfo } from "@/server/admin/clients";
import type { AdminFormState } from "@/server/admin/services";

export async function setUserCreditApprovalFormAction(userId: string, approved: boolean): Promise<void> {
  await setUserCreditApproval(userId, approved);
  revalidatePath(`/admin/clientes/${userId}`);
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
