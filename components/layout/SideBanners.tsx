import { listActivePromoBanners } from "@/server/promo-banners";
import { getTikTokSectionData } from "@/server/tiktok";
import { SideBannersClient } from "@/components/layout/SideBannersClient";

/** Barras laterales fijas (widget de TikTok -- foto, seguidores, últimos videos -- + un banner promocional por lado, el que Beto suba desde /admin/configuracion) -- solo en pantallas muy anchas (2xl+) y solo en páginas públicas (ver SideBannersClient::HIDDEN_PREFIXES para los paneles donde se ocultan). Ver PromoBannerStrip para el equivalente en celular/tablet. */
export async function SideBanners() {
  const [{ left, right }, tiktokData] = await Promise.all([listActivePromoBanners(), getTikTokSectionData()]);

  const tiktok = tiktokData
    ? {
        displayName: tiktokData.profile.displayName,
        avatarUrl: tiktokData.profile.avatarUrl,
        followerCount: tiktokData.profile.followerCount,
        profileDeepLink: tiktokData.profile.profileDeepLink,
        videos: tiktokData.videos.slice(0, 2),
      }
    : null;

  return <SideBannersClient left={left} right={right} tiktok={tiktok} />;
}
