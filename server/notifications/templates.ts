import "server-only";
import { minutesInBusinessDay, formatMinutes, businessDateString } from "@/lib/timezone";
import { fullDateLabel } from "@/lib/date-labels";
import { siteConfig } from "@/config/site";
import { REPORT_DELIVERY_TEXT } from "@/lib/service-fulfillment";

export interface BookingEmailContext {
  recipientName: string;
  bookingNumber: string;
  serviceName: string;
  durationMinutes: number;
  startsAt: Date;
  /** true para Informe Numerológico/Carta Astral — sin horario, con entrega
   * en días en vez de una hora de llamada. */
  isReportOnly: boolean;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function wrap(title: string, bodyLines: string[]): { html: string; text: string } {
  const text = [title, "", ...bodyLines, "", `— ${siteConfig.siteName}`].join("\n");
  const html = `
    <div style="font-family: Georgia, serif; background:#0b0a0c; color:#f3efe8; padding:32px;">
      <h1 style="color:#e8a33d; font-size:22px; margin:0 0 16px;">${title}</h1>
      ${bodyLines.map((line) => `<p style="margin:0 0 12px; color:#cfc9c2;">${line}</p>`).join("")}
      <p style="margin-top:24px; color:#8a8590; font-size:12px;">— ${siteConfig.siteName}</p>
    </div>
  `;
  return { html, text };
}

function scheduleLine(ctx: BookingEmailContext): string {
  if (ctx.isReportOnly) {
    return `${ctx.serviceName} — informe personalizado, sin horario ni llamada. Reserva #${ctx.bookingNumber}.`;
  }
  const date = fullDateLabel(businessDateString(ctx.startsAt));
  const time = formatMinutes(minutesInBusinessDay(ctx.startsAt));
  return `${ctx.serviceName} (${ctx.durationMinutes} min) — ${date} a las ${time} (hora Colombia). Reserva #${ctx.bookingNumber}.`;
}

export function bookingReceivedEmail(ctx: BookingEmailContext): EmailContent {
  const { html, text } = wrap(
    ctx.isReportOnly ? `Hola ${ctx.recipientName}, recibimos tu solicitud` : `Hola ${ctx.recipientName}, recibimos tu reserva`,
    [
      scheduleLine(ctx),
      "Tienes un tiempo limitado para completar el pago antes de que se libere de nuevo — revisa tu reserva para ver cuánto tiempo queda.",
    ],
  );
  return { subject: `Reserva recibida — #${ctx.bookingNumber}`, html, text };
}

export function paymentConfirmedEmail(ctx: BookingEmailContext): EmailContent {
  const { html, text } = wrap(`¡Pago confirmado, ${ctx.recipientName}!`, [
    scheduleLine(ctx),
    ctx.isReportOnly
      ? `Tu solicitud ya está confirmada. Lo elaboraremos y te lo enviaremos dentro de un plazo de ${REPORT_DELIVERY_TEXT}.`
      : "Tu consulta ya está confirmada. Te esperamos en el horario acordado.",
  ]);
  return { subject: `Pago confirmado — #${ctx.bookingNumber}`, html, text };
}

export function reminderEmail(ctx: BookingEmailContext, hoursBefore: number): EmailContent {
  const { html, text } = wrap(`Recordatorio: tu consulta es pronto`, [
    scheduleLine(ctx),
    `Faltan aproximadamente ${hoursBefore} horas para tu consulta.`,
  ]);
  return { subject: `Recordatorio de tu consulta — #${ctx.bookingNumber}`, html, text };
}

export function cancelledEmail(ctx: BookingEmailContext): EmailContent {
  const { html, text } = wrap(`Tu reserva fue cancelada`, [
    scheduleLine(ctx),
    "Si fue un error o quieres reprogramar, escríbenos por WhatsApp.",
  ]);
  return { subject: `Reserva cancelada — #${ctx.bookingNumber}`, html, text };
}

export function expiredEmail(ctx: BookingEmailContext): EmailContent {
  const { html, text } = wrap(`Tu reserva expiró`, [
    scheduleLine(ctx),
    "El pago no se completó a tiempo y volvió a quedar disponible. Puedes solicitarlo de nuevo cuando quieras.",
  ]);
  return { subject: `Reserva expirada — #${ctx.bookingNumber}`, html, text };
}

export function passwordResetEmail(firstName: string, resetLink: string): EmailContent {
  const title = `Hola ${firstName}, restablece tu contraseña`;
  const intro = "Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, entra al siguiente enlace (válido por 30 minutos):";
  const outro = "Si no fuiste tú, ignora este correo — tu contraseña actual sigue siendo válida.";

  const text = [title, "", intro, resetLink, "", outro, "", `— ${siteConfig.siteName}`].join("\n");
  const html = `
    <div style="font-family: Georgia, serif; background:#0b0a0c; color:#f3efe8; padding:32px;">
      <h1 style="color:#e8a33d; font-size:22px; margin:0 0 16px;">${title}</h1>
      <p style="margin:0 0 12px; color:#cfc9c2;">${intro}</p>
      <p style="margin:0 0 12px;"><a href="${resetLink}" style="color:#e8a33d;">${resetLink}</a></p>
      <p style="margin:0 0 12px; color:#cfc9c2;">${outro}</p>
      <p style="margin-top:24px; color:#8a8590; font-size:12px;">— ${siteConfig.siteName}</p>
    </div>
  `;
  return { subject: "Restablecer tu contraseña", html, text };
}
