import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/server/settings";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Sección "Seguinos en TikTok" (home) -- login-y-listo con Login Kit de
 * TikTok (Beto autoriza UNA vez desde /admin/configuracion, no hay flujo
 * por cliente: es siempre la misma cuenta de Tarot de Beto). Los tokens y
 * el último dato bueno traído de TikTok se guardan en la tabla `Setting`
 * (mismo patrón que manual_payment_instructions/faq_items) -- no hace
 * falta una tabla propia para un solo registro global.
 */

const TOKEN_ENDPOINT = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_ENDPOINT = "https://open.tiktokapis.com/v2/user/info/";
const VIDEO_LIST_ENDPOINT = "https://open.tiktokapis.com/v2/video/list/";
const AUTHORIZE_ENDPOINT = "https://www.tiktok.com/v2/auth/authorize/";

const TOKENS_SETTING_KEY = "tiktok_tokens";
const CACHE_SETTING_KEY = "tiktok_cache";
const OAUTH_STATE_SETTING_KEY = "tiktok_oauth_state";

/** Refrescar el token bastante antes de que venza (24h de vida real) evita que una llamada quede sin token válido a mitad de refresco. */
const TOKEN_REFRESH_MARGIN_MS = 2 * 60 * 60_000;
/** Volver a pedir perfil/videos a TikTok como mucho cada 6h -- no hace falta más seguido, y cuida la cuota de la API. */
const CACHE_MAX_AGE_MS = 6 * 60 * 60_000;

export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/api/tiktok/oauth/callback`;
}

interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  openId: string;
  /** epoch ms */
  expiresAt: number;
}

async function getStoredTokens(): Promise<TikTokTokens | null> {
  return getSetting<TikTokTokens | null>(TOKENS_SETTING_KEY, null);
}

async function saveTokens(tokens: TikTokTokens): Promise<void> {
  await prisma.setting.upsert({
    where: { key: TOKENS_SETTING_KEY },
    update: { value: JSON.stringify(tokens) },
    create: { key: TOKENS_SETTING_KEY, value: JSON.stringify(tokens) },
  });
}

export interface TikTokProfile {
  displayName: string;
  avatarUrl: string;
  followerCount: number;
  bioDescription: string;
  profileDeepLink: string;
}

export interface TikTokVideo {
  id: string;
  coverImageUrl: string;
  shareUrl: string;
  title: string;
  viewCount: number;
}

interface TikTokCache {
  profile: TikTokProfile;
  videos: TikTokVideo[];
  /** epoch ms de la última vez que esto se trajo bien de TikTok. */
  fetchedAt: number;
}

async function getCache(): Promise<TikTokCache | null> {
  return getSetting<TikTokCache | null>(CACHE_SETTING_KEY, null);
}

async function saveCache(cache: TikTokCache): Promise<void> {
  await prisma.setting.upsert({
    where: { key: CACHE_SETTING_KEY },
    update: { value: JSON.stringify(cache) },
    create: { key: CACHE_SETTING_KEY, value: JSON.stringify(cache) },
  });
}

/** true si hay una cuenta de TikTok conectada (autorizada al menos una vez). */
export async function isTikTokConnected(): Promise<boolean> {
  return Boolean(await getStoredTokens());
}

/**
 * Arranca el login de TikTok -- solo lo usa el admin, desde
 * /admin/configuracion. `state` es un token aleatorio de un solo uso
 * (guardado en Setting) para que el callback pueda confirmar que la
 * respuesta viene de un login que nosotros pedimos, no de un tercero.
 */
export async function getTikTokAuthorizeUrl(currentUser?: CurrentUser | null): Promise<{ url?: string; error?: string }> {
  await requireAdmin(currentUser);
  if (!isTikTokConfigured()) return { error: "TikTok todavía no está configurado en este entorno." };

  const state = randomBytes(16).toString("hex");
  await prisma.setting.upsert({
    where: { key: OAUTH_STATE_SETTING_KEY },
    update: { value: JSON.stringify(state) },
    create: { key: OAUTH_STATE_SETTING_KEY, value: JSON.stringify(state) },
  });

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: "user.info.basic,user.info.profile,user.info.stats,video.list",
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
  });

  return { url: `${AUTHORIZE_ENDPOINT}?${params.toString()}` };
}

/** Llamado desde el callback (app/api/tiktok/oauth/callback) -- intercambia el código por tokens y guarda todo. */
export async function completeTikTokAuthorization(code: string, state: string): Promise<{ error?: string }> {
  const expectedState = await getSetting<string | null>(OAUTH_STATE_SETTING_KEY, null);
  if (!expectedState || state !== expectedState) {
    return { error: "El enlace de autorización expiró o no es válido. Intentá conectar de nuevo." };
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    return { error: data.error_description ?? "TikTok no pudo confirmar la autorización." };
  }

  await saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    openId: data.open_id,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  // Trae perfil/videos ya de una vez -- así la sección deja de mostrar
  // "todavía no conectado" apenas Beto termina de autorizar.
  await refreshTikTokDataIfNeeded(true);

  return {};
}

async function refreshAccessTokenIfNeeded(tokens: TikTokTokens): Promise<TikTokTokens> {
  if (Date.now() < tokens.expiresAt - TOKEN_REFRESH_MARGIN_MS) return tokens;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    // No se pudo renovar (ej. Beto revocó el acceso desde TikTok) -- se
    // deja el token viejo tal cual; las llamadas siguientes van a fallar
    // igual, y refreshTikTokDataIfNeeded ya sabe quedarse con el último
    // caché bueno en vez de romper la sección pública.
    return tokens;
  }

  const fresh: TikTokTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    openId: data.open_id ?? tokens.openId,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await saveTokens(fresh);
  return fresh;
}

/**
 * Trae perfil + últimos videos de TikTok y actualiza el caché -- se llama
 * desde el cron de mantenimiento (cada tanto) y justo después de conectar.
 * Nunca tira error hacia arriba: si algo falla (token vencido sin poder
 * renovar, TikTok caído), simplemente no actualiza el caché y la sección
 * pública sigue mostrando el último dato bueno.
 */
export async function refreshTikTokDataIfNeeded(force = false): Promise<void> {
  if (!isTikTokConfigured()) return;
  const tokens = await getStoredTokens();
  if (!tokens) return;

  if (!force) {
    const cache = await getCache();
    if (cache && Date.now() - cache.fetchedAt < CACHE_MAX_AGE_MS) return;
  }

  const fresh = await refreshAccessTokenIfNeeded(tokens);

  try {
    const profileRes = await fetch(
      `${USER_INFO_ENDPOINT}?fields=display_name,avatar_url,follower_count,bio_description,profile_deep_link`,
      { headers: { Authorization: `Bearer ${fresh.accessToken}` } },
    );
    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.data?.user) return;
    const u = profileData.data.user;

    const videosRes = await fetch(`${VIDEO_LIST_ENDPOINT}?fields=id,cover_image_url,share_url,title,view_count`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fresh.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 8 }),
    });
    const videosData = await videosRes.json();
    const videos: TikTokVideo[] = videosRes.ok
      ? (videosData.data?.videos ?? []).map((v: any) => ({
          id: v.id,
          coverImageUrl: v.cover_image_url,
          shareUrl: v.share_url,
          title: v.title,
          viewCount: v.view_count,
        }))
      : [];

    await saveCache({
      profile: {
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        followerCount: u.follower_count,
        bioDescription: u.bio_description,
        profileDeepLink: u.profile_deep_link,
      },
      videos,
      fetchedAt: Date.now(),
    });
  } catch {
    // Sin conexión a TikTok en este momento -- se mantiene el caché anterior.
  }
}

/** Lo que consume la sección pública -- ya con el auto-refresco resuelto (nunca hace esperar al visitante a que responda la API de TikTok). */
export async function getTikTokSectionData(): Promise<TikTokCache | null> {
  if (!isTikTokConfigured()) return null;
  await refreshTikTokDataIfNeeded();
  return getCache();
}

/** Desconecta la cuenta -- borra tokens y caché, la sección pública vuelve a no mostrarse. */
export async function disconnectTikTok(currentUser?: CurrentUser | null): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  await prisma.setting.deleteMany({ where: { key: { in: [TOKENS_SETTING_KEY, CACHE_SETTING_KEY] } } });
  await logAdminAction({ adminId: admin.id, action: "tiktok.disconnected", targetType: "Setting", targetId: TOKENS_SETTING_KEY });
  return {};
}
