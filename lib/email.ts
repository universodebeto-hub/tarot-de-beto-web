import "server-only";
import nodemailer from "nodemailer";

/**
 * Envío de email transaccional vía SMTP. Si no hay credenciales
 * configuradas (SMTP_HOST/SMTP_USER/SMTP_PASSWORD), no falla — registra el
 * correo en la consola del servidor, igual que el link de recuperación de
 * contraseña en la Fase 3. Así el resto del flujo (reservas, pagos) nunca
 * se rompe por falta de SMTP en desarrollo.
 */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return cachedTransporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[email] SMTP no configurado — no se envía. Para: ${input.to} — Asunto: ${input.subject}`);
    console.log(input.text);
    return;
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
  try {
    await getTransporter().sendMail({ from, to: input.to, subject: input.subject, html: input.html, text: input.text });
  } catch (err) {
    // Un email que falla no debe tumbar el flujo de reservas/pagos que lo dispara.
    console.error(`[email] Error enviando a ${input.to}:`, err);
  }
}
