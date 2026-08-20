"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { notifyPasswordReset } from "@/server/notifications/send";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export interface AuthFormState {
  error?: string;
  success?: boolean;
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(80).optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function registerUser(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rate = checkRateLimit(`register:${await clientIp()}`, 5, 60 * 60_000);
  if (!rate.allowed) {
    return { error: "Demasiados intentos de registro. Espera unos minutos y vuelve a intentarlo." };
  }

  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    country: formData.get("country") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { firstName, lastName, email, phone, country, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con ese correo. Intenta iniciar sesión." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, phone, country, passwordHash },
  });

  await createSessionCookie({ userId: user.id, role: user.role });
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export async function loginUser(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rate = checkRateLimit(`login:${await clientIp()}`, 10, 15 * 60_000);
  if (!rate.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Mensaje genérico para no revelar si el correo existe o no.
  const invalidCredentials = { error: "Correo o contraseña incorrectos." };
  if (!user) return invalidCredentials;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalidCredentials;

  await createSessionCookie({ userId: user.id, role: user.role });

  const callbackUrl = formData.get("callbackUrl");
  const safeCallback =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : null;
  redirect(safeCallback ?? "/dashboard");
}

export async function logoutUser(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
});

const RESET_TOKEN_TTL_MINUTES = 30;

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Límite generoso pero real: evita que alguien bombardee de emails a una
  // dirección ajena reenviando el formulario. La respuesta sigue siendo
  // "éxito" genérico para no revelar si el límite se alcanzó por existir o
  // no la cuenta.
  const rate = checkRateLimit(`reset-request:${await clientIp()}`, 5, 60 * 60_000);
  if (!rate.allowed) {
    return { success: true };
  }

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Correo inválido" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Siempre respondemos "éxito" exista o no la cuenta, para no filtrar
  // qué correos están registrados (enumeración de usuarios).
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

export async function resetPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  // Defensa en profundidad: el token de 32 bytes aleatorios ya hace
  // impracticable adivinarlo, pero igual se limita el ritmo de intentos.
  const rate = checkRateLimit(`reset-confirm:${await clientIp()}`, 20, 15 * 60_000);
  if (!rate.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
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
