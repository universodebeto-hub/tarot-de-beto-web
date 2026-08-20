import "server-only";

/**
 * Arquitectura preparada para WhatsApp Business API (Cloud API de Meta) —
 * NO implementada todavía. Hoy todo el contacto por WhatsApp es manual
 * (enlaces `wa.me` con mensaje prellenado, ver `config/site.ts` →
 * `buildWhatsAppLink`). Esta función queda como el punto de extensión
 * futuro para enviar mensajes de forma automática (confirmaciones,
 * recordatorios) sin que el usuario tenga que abrir WhatsApp manualmente.
 *
 * Para implementarla de verdad hace falta:
 * 1. Una cuenta de WhatsApp Business verificada y un número en la Cloud API
 *    de Meta (https://developers.facebook.com/docs/whatsapp/cloud-api).
 * 2. Variables de entorno: WHATSAPP_BUSINESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
 * 3. Plantillas de mensaje pre-aprobadas por Meta (no se puede mandar texto
 *    libre fuera de una ventana de 24h de conversación activa).
 * 4. Reemplazar esta función por una llamada real a
 *    `POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`.
 */
export function isWhatsAppBusinessConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export interface SendWhatsAppTemplateInput {
  to: string;
  templateName: string;
  params: string[];
}

export async function sendWhatsAppTemplate(input: SendWhatsAppTemplateInput): Promise<void> {
  if (!isWhatsAppBusinessConfigured()) {
    console.log(
      `[whatsapp-business] No configurado — no se envía. Para: ${input.to} — Plantilla: ${input.templateName} — Params: ${input.params.join(", ")}`,
    );
    return;
  }

  throw new Error(
    "WhatsApp Business API no está implementada todavía — ver el comentario de este archivo para la guía de integración.",
  );
}
