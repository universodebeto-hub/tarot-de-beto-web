import { siteConfig, buildWhatsAppLink } from "@/config/site";
import { listActivePromoBanners } from "@/server/promo-banners";
import { SideBannersClient, type SocialLink } from "@/components/layout/SideBannersClient";

const SOCIAL_LINKS: SocialLink[] = (
  [
    { href: siteConfig.social.tiktok, label: "TikTok" },
    { href: siteConfig.social.instagram, label: "Instagram" },
    { href: siteConfig.social.facebook, label: "Facebook" },
    { href: siteConfig.contact.whatsappNumber ? buildWhatsAppLink(siteConfig.contact.whatsappNumber) : "", label: "WhatsApp" },
  ] as const
).filter((s) => s.href);

/** Barras laterales fijas (perfiles de redes + un banner promocional por lado, el que Beto suba desde /admin/configuracion) -- solo en pantallas muy anchas (2xl+) y solo en páginas públicas (ver SideBannersClient::HIDDEN_PREFIXES para los paneles donde se ocultan). Ver PromoBannerStrip para el equivalente en celular/tablet. */
export async function SideBanners() {
  const { left, right } = await listActivePromoBanners();
  return <SideBannersClient left={left} right={right} socials={SOCIAL_LINKS} />;
}
