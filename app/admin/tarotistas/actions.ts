"use server";

import { revalidatePath } from "next/cache";
import {
  linkTarotistaAccount,
  unlinkTarotistaAccount,
  createTarotista,
  type LinkResult,
  type CreateTarotistaResult,
} from "@/server/admin/tarotistas";

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

export async function createTarotistaAction(
  _prev: CreateTarotistaResult,
  formData: FormData,
): Promise<CreateTarotistaResult> {
  const result = await createTarotista({
    name: formData.get("name"),
    bio: formData.get("bio"),
    experience: formData.get("experience"),
    specialties: formData.get("specialties"),
  });
  revalidatePath("/admin/tarotistas");
  return result;
}
