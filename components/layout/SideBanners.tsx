import Image from "next/image";
import { siteConfig, buildWhatsAppLink } from "@/config/site";
import { listActivePromoBanners } from "@/server/promo-banners";
import { TikTokIcon, InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/ui/social-icons";
import type { PromoBanner } from "@prisma/client";

const SOCIAL_LINKS = [
  { href: siteConfig.social.tiktok, label: "TikTok", Icon: TikTokIcon },
  { href: siteConfig.social.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: siteConfig.social.facebook, label: "Facebook", Icon: FacebookIcon },
  {
    href: siteConfig.contact.whatsappNumber ? buildWhatsAppLink(siteConfig.contact.whatsappNumber) : "",
    label: "WhatsApp",
    Icon: WhatsAppIcon,
  },
].filter((s) => s.href);

function Rail({ side, banners }: { side: "left" | "right"; banners: PromoBanner[] }) {
  return (
    <aside
      className={`no-print fixed top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 2xl:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {SOCIAL_LINKS.length > 0 ? (
        <div className="glass flex flex-col items-center gap-2.5 rounded-xl px-2 py-3">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="flex h-8 w-8 items-center justify-center rounded-full text-bone-dim transition-colors hover:text-gold-soft"
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </div>
      ) : null}

      {banners.map((b) => (
        <a
          key={b.id}
          href={b.linkUrl}
          target={b.linkUrl.startsWith("/") ? undefined : "_blank"}
          rel={b.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
          className="glass block w-[84px] overflow-hidden rounded-xl transition-opacity hover:opacity-90"
        >
          <Image src={b.imageUrl} alt="" width={84} height={280} className="h-auto w-full object-cover" />
        </a>
      ))}
    </aside>
  );
}

/** Barras laterales fijas (perfiles de redes + banners promocionales que Beto sube desde /admin/configuracion) -- solo en pantallas muy anchas (2xl+), donde sobra margen a los costados del contenido. Ver PromoBannerStrip para el equivalente en celular/tablet. */
export async function SideBanners() {
  const { left, right } = await listActivePromoBanners();

  return (
    <>
      <Rail side="left" banners={left} />
      <Rail side="right" banners={right} />
    </>
  );
}
