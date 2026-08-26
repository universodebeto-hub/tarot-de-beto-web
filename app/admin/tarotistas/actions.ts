"use server";

import { revalidatePath } from "next/cache";
import { linkTarotistaAccount, unlinkTarotistaAccount, type LinkResult } from "@/server/admin/tarotistas";

export async function linkTarotistaAccountAction(
  tarotistaId: string,
  _prev: LinkResult,
  formData: FormData,
): Promise<LinkResult> {
  const result = await linkTarotistaAccount(tarotistaId, String(formData.get("email") ?? ""));
  revalidatePath("/admin/tarotistas");
  return result;
}

export async function unlinkTarotistaAccountFormAction(tarotistaId: string): Promise<void> {
  await unlinkTarotistaAccount(tarotistaId);
  revalidatePath("/admin/tarotistas");
}
