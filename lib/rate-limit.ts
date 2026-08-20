import "server-only";

/**
 * Rate limiting de ventana fija, en memoria del proceso. Protege endpoints
 * sensibles (login, registro, recuperación de contraseña) contra fuerza
 * bruta y abuso básico.
 *
 * Limitación importante para producción: en un despliegue serverless
 * (Vercel) cada instancia de función tiene su propia memoria — un atacante
 * distribuido entre varias instancias no comparte el contador. Esto sigue
 * siendo una defensa real (limita el abuso desde una misma instancia/IP en
 * ráfaga, que es el caso más común) pero no es una garantía dura a escala.
 * Si el abuso real se vuelve un problema, reemplazar este módulo por un
 * store compartido (ej. Upstash Redis) manteniendo la misma firma de
 * `checkRateLimit` para no tocar los call sites.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Evita que el Map crezca sin límite en un proceso de larga duración.
const MAX_BUCKETS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos hasta que se pueda reintentar, solo si `allowed` es false. */
  retryAfterSeconds?: number;
}

/**
 * `key` debe combinar la acción y el identificador (ej. `login:203.0.113.4`)
 * para que límites de distintos endpoints no se pisen entre sí.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}
