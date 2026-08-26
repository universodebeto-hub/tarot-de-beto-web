import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPushToTarotista } from "@/server/push-notifications";

const createAttentionRequestSchema = z.object({
  tarotistaId: z.string().min(1),
  name: z.string().trim().min(1, "Tu nombre es obligatorio").max(120),
  email: z.string().trim().toLowerCase().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  serviceId: z.string().optional(),
  preferredTime: z.string().trim().max(200).optional(),
  message: z.string().trim().max(1000).optional(),
});

export type CreateAttentionRequestInput = z.infer<typeof createAttentionRequestSchema>;

export interface CreateAttentionRequestResult {
  success?: boolean;
  error?: string;
}

/**
 * Solicitud pendiente (Fase 5) — cuando un tarotista no está disponible, el
 * cliente deja sus datos en vez de intentar una consulta inmediata. NO
 * reserva agenda ni bloquea nada: el tarotista la revisa a su ritmo desde
 * /panel-tarotista (ver server/tarotista-panel.ts).
 */
export async function createAttentionRequest(
  input: CreateAttentionRequestInput,
): Promise<CreateAttentionRequestResult> {
  const parsed = createAttentionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { tarotistaId, name, email, phone, serviceId, preferredTime, message } = parsed.data;

  const tarotista = await prisma.tarotista.findUnique({ where: { id: tarotistaId } });
  if (!tarotista || !tarotista.active) {
    return { error: "Ese tarotista no está disponible en este momento." };
  }
  if (!email && !phone) {
    return { error: "Deja al menos un correo o un teléfono de contacto." };
  }

  await prisma.attentionRequest.create({
    data: {
      tarotistaId,
      name,
      email: email || null,
      phone: phone || null,
      serviceId: serviceId || null,
      preferredTime: preferredTime || null,
      message: message || null,
    },
  });

  await sendPushToTarotista(tarotistaId, {
    title: "Nueva solicitud de atención",
    body: `${name} quiere que la contactes.`,
    url: "/panel-tarotista",
  }).catch((err) => console.error("[push] attention_request:", err));

  return { success: true };
}
