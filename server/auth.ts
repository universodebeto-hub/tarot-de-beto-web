"use server";

import { redirect } from "next/navigation";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { clientIp } from "@/lib/client-ip";
import {
  registerAccount,
  loginAccount,
  requestPasswordResetCore,
  resetPasswordCore,
} from "@/server/user-auth";

/**
 * Server Actions para los formularios web de autenticación. Solo manejan lo
 * específico de la web (leer FormData, poner la cookie de sesión, redirigir)
 * — toda la lógica de negocio (validación, límites de intentos, mensajes
 * genéricos) vive en server/user-auth.ts, compartida con la futura API para
 * la app móvil.
 */

export interface AuthFormState {
  error?: string;
  success?: boolean;
}

export async function registerUser(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await registerAccount(
    {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName") || undefined,
      email: formData.get("email"),
      username: formData.get("username"),
      phone: formData.get("phone") || undefined,
      country: formData.get("country") || undefined,
      password: formData.get("password"),
    },
    await clientIp(),
  );

  if (result.error || !result.user) {
    return { error: result.error ?? "No se pudo completar el registro." };
  }

  await createSessionCookie({ userId: result.user.id, role: result.user.role });
  redirect("/dashboard");
}

export async function loginUser(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await loginAccount(
    { email: formData.get("email"), password: formData.get("password") },
    await clientIp(),
  );

  if (result.error || !result.user) {
    return { error: result.error ?? "No se pudo iniciar sesión." };
  }

  await createSessionCookie({ userId: result.user.id, role: result.user.role });

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

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await requestPasswordResetCore({ email: formData.get("email") }, await clientIp());
  if ("error" in result) return { error: result.error };
  return { success: true };
}

export async function resetPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await resetPasswordCore(
    { token: formData.get("token"), password: formData.get("password") },
    await clientIp(),
  );
  if ("error" in result) return { error: result.error };
  return { success: true };
}
