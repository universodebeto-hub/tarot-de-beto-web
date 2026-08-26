"use server";

import { revalidatePath } from "next/cache";
import { setOwnTarotistaStatus, setOwnAttentionRequestStatus } from "@/server/tarotista-panel";
import type { TarotistaStatus, AttentionRequestStatus } from "@prisma/client";

/** `<form action>` plano — un botón por estado, sin JavaScript de cliente necesario. */
export async function setOwnStatusFormAction(status: TarotistaStatus): Promise<void> {
  await setOwnTarotistaStatus(status);
  revalidatePath("/panel-tarotista");
  revalidatePath("/tarotistas");
}

export async function setOwnRequestStatusFormAction(
  requestId: string,
  status: AttentionRequestStatus,
): Promise<void> {
  await setOwnAttentionRequestStatus(requestId, status);
  revalidatePath("/panel-tarotista");
}
