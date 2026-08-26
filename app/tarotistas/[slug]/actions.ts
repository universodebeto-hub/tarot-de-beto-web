"use server";

import { createInstantConsultation, type CreateConsultationResult } from "@/server/consultations";
import { createAttentionRequest, type CreateAttentionRequestResult } from "@/server/attention-requests";

export async function createInstantConsultationAction(
  tarotistaId: string,
  serviceId: string,
  guestName: string,
  guestEmail: string,
  guestPhone: string,
): Promise<CreateConsultationResult> {
  return createInstantConsultation({
    tarotistaId,
    serviceId,
    guestName: guestName || undefined,
    guestEmail: guestEmail || undefined,
    guestPhone: guestPhone || undefined,
  });
}

export async function createAttentionRequestAction(
  tarotistaId: string,
  _prev: CreateAttentionRequestResult,
  formData: FormData,
): Promise<CreateAttentionRequestResult> {
  return createAttentionRequest({
    tarotistaId,
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    preferredTime: String(formData.get("preferredTime") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
}
