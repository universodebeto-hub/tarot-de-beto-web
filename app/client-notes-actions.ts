"use server";

import { revalidatePath } from "next/cache";
import { addClientNote } from "@/server/client-notes";
import type { AdminFormState } from "@/server/admin/services";

/** Compartida entre /admin/clientes/[id] y /panel-tarotista -- addClientNote ya valida del lado del servidor quién puede escribir sobre cuál cliente. */
export async function addClientNoteAction(
  clientId: string,
  revalidatePaths: string[],
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const result = await addClientNote(clientId, String(formData.get("note") ?? ""));
  if (result.error) return { error: result.error };
  for (const path of revalidatePaths) revalidatePath(path);
  return { success: true };
}
