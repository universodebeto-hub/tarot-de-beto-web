import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** `hash` es null en cuentas "sin reclamar" (creadas por el admin sin contraseña) -- nunca válidas para iniciar sesión. */
export function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}
