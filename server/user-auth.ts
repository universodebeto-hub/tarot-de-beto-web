import "server-only";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { notifyPasswordReset } from "@/server/notifications/send";
import { sendExpoPushToUser } from "@/server/expo-push";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Role } from "@prisma/client";

/**
 * Lógica de negocio de cuentas de usuario (registro, login, recuperación de
 * contraseña) — funciones puras sin atarse a Server Actions ni a Route
 * Handlers, para que tanto `server/auth.ts` (formularios web, cookie de
 * sesión) como la futura API para app móvil (`app/api/v1/auth/*`, JWT por
 * header) llamen exactamente a la misma implementación. Nunca duplicar esta
 * lógica en otro lugar — si hace falta un canal nuevo (ej. la app móvil),
 * agregar un wrapper delgado encima de estas funciones, no reescribirlas.
 */

export interface AccountResult {
  error?: string;
  user?: { id: string; role: Role };
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(24, "El usuario debe tener como máximo 24 caracteres")
    .regex(/^[a-z0-9_.]+$/, "El usuario solo puede tener letras, números, punto y guion bajo"),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(80).optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function registerAccount(input: unknown, ip: string): Promise<AccountResult> {
  const rate = checkRateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rate.allowed) {
    return { error: "Demasiados intentos de registro. Espera unos minutos y vuelve a intentarlo." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { firstName, lastName, email, username, phone, country, password } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    return {
      error:
        existing.email === email
          ? "Ya existe una cuenta con ese correo. Intenta iniciar sesión."
          : "Ese nombre de usuario ya está en uso. Elige otro.",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, username, phone, country, passwordHash },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      sendExpoPushToUser(admin.id, {
        title: "Nuevo cliente registrado",
        body: `${firstName} — ${email}`,
        data: { type: "new_client" },
      }).catch((err) => console.error("[expo-push] new_client:", err)),
    ),
  );

  return { user: { id: user.id, role: user.role } };
}

const loginSchema = z.object({
  /** Correo o nombre de usuario — se acepta cualquiera de los dos (ver loginAccount). */
  email: z.string().trim().toLowerCase().min(1, "Ingresa tu correo o usuario"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export async function loginAccount(input: unknown, ip: string): Promise<AccountResult> {
  const rate = checkRateLimit(`login:${ip}`, 10, 15 * 60_000);
  if (!rate.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email: identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });

  // Mensaje genérico para no revelar si la cuenta existe o no.
  const invalidCredentials = { error: "Correo/usuario o contraseña incorrectos." };
  if (!user) return invalidCredentials;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalidCredentials;

  return { user: { id: user.id, role: user.role } };
}

export type PasswordResetResult = { success: true } | { error: string };

const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
});

const RESET_TOKEN_TTL_MINUTES = 30;

export async function requestPasswordResetCore(input: unknown, ip: string): Promise<PasswordResetResult> {
  // Límite generoso pero real: evita que alguien bombardee de emails a una
  // dirección ajena reenviando el formulario. La respuesta sigue siendo
  // "éxito" genérico para no revelar si el límite se alcanzó por existir o
  // no la cuenta.
  const rate = checkRateLimit(`reset-request:${ip}`, 5, 60 * 60_000);
  if (!rate.allowed) {
    return { success: true };
  }

  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Correo inválido" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Siempre respondemos "éxito" exista o no la cuenta, para no filtrar qué
  // correos están registrados (enumeración de usuarios).
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);
    await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/restablecer-password?token=${token}`;
    await notifyPasswordReset(user.email, user.firstName, resetLink).catch((err) =>
      console.error("[notify] password_reset:", err),
    );
  }

  return { success: true };
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function resetPasswordCore(input: unknown, ip: string): Promise<PasswordResetResult> {
  // Defensa en profundidad: el token de 32 bytes aleatorios ya hace
  // impracticable adivinarlo, pero igual se limita el ritmo de intentos.
  const rate = checkRateLimit(`reset-confirm:${ip}`, 20, 15 * 60_000);
  if (!rate.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
  }

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { token, password } = parsed.data;
  const reset = await prisma.passwordReset.findUnique({ where: { token } });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { error: "El enlace de restablecimiento no es válido o expiró. Solicita uno nuevo." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
