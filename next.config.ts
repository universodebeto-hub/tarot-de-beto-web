import type { NextConfig } from "next";

/**
 * CSP con `'unsafe-inline'` en script-src: Next.js App Router inyecta scripts
 * de bootstrap inline en cada página, y este proyecto no usa el patrón de
 * nonce por request (requeriría generarlo en `proxy.ts` y pasarlo a cada
 * render). Es una relajación real, documentada a propósito — no un CSP de
 * cartón. Si en el futuro hace falta endurecerlo, ver
 * https://nextjs.org/docs/app/guides/content-security-policy para el patrón
 * con nonce. Los dominios listados son los que la app realmente necesita:
 * PayPal (botón de pago), y Google Analytics/Meta Pixel/TikTok Pixel
 * (analítica opcional de la Fase 9, solo se cargan si su variable de
 * entorno está configurada — ver `components/analytics/Analytics.tsx`).
 */
// En desarrollo, el overlay de errores de React/Next usa eval() para
// reconstruir stack traces — sin 'unsafe-eval' el CSP lo bloquea y ensucia
// la consola con warnings que no reflejan un problema real. Producción
// nunca necesita eval(), así que ahí se mantiene fuera.
const scriptSrcExtra = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${scriptSrcExtra} https://www.paypal.com https://www.paypalobjects.com https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // *.livekit.cloud (no solo el hostname exacto del proyecto): las llamadas
  // de audio (Fase 11) a veces enrutan a un edge de región distinto dentro
  // del mismo dominio (ver "settings/regions" en las llamadas del SDK) —
  // mismo criterio que recomienda la propia documentación de LiveKit.
  "connect-src 'self' https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.google-analytics.com https://analytics.tiktok.com https://*.livekit.cloud wss://*.livekit.cloud",
  "frame-src https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // microphone=(self): las llamadas de audio (Fase 11, /reservas/[id]/llamada)
  // necesitan poder pedir permiso de micrófono en este origen — camera y
  // geolocation siguen bloqueadas del todo, la app nunca las usa.
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
