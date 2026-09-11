"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { TikTokIcon, InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/ui/social-icons";
import type { PromoBanner } from "@prisma/client";

const ICONS = { TikTok: TikTokIcon, Instagram: InstagramIcon, Facebook: FacebookIcon, WhatsApp: WhatsAppIcon } as const;

export interface SocialLink {
  href: string;
  label: keyof typeof ICONS;
}

/** Rutas "de aplicación" (paneles con su propio menú lateral) donde estas barras no deben mostrarse -- se superponen con el menú del panel, no con contenido de la página pública. */
const HIDDEN_PREFIXES = ["/admin", "/panel-tarotista", "/dashboard"];

function Rail({ side, banners, socials }: { side: "left" | "right"; banners: PromoBanner[]; socials: SocialLink[] }) {
  return (
    <aside
      className={`no-print fixed top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 2xl:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {socials.length > 0 ? (
        <div className="glass flex flex-col items-center gap-2.5 rounded-xl px-2 py-3">
          {socials.map(({ href, label }) => {
            const Icon = ICONS[label];
            return (
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
            );
          })}
        </div>
      ) : null}

      {banners.slice(0, 1).map((b) => (
        <a
          key={b.id}
          href={b.linkUrl}
          target={b.linkUrl.startsWith("/") ? undefined : "_blank"}
          rel={b.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
          className="glass block h-[600px] w-[160px] overflow-hidden rounded-xl transition-opacity hover:opacity-90"
        >
          {b.mediaType === "VIDEO" ? (
            <video src={b.imageUrl} className="h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : (
            <Image src={b.imageUrl} alt="" width={160} height={600} className="h-full w-full object-cover" />
          )}
        </a>
      ))}
    </aside>
  );
}

/** Oculta las barras enteras en rutas de panel (ver HIDDEN_PREFIXES) -- ahí ya hay un menú lateral propio y se superponía con él. */
export function SideBannersClient({
  left,
  right,
  socials,
}: {
  left: PromoBanner[];
  right: PromoBanner[];
  socials: SocialLink[];
}) {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      <Rail side="left" banners={left} socials={socials} />
      <Rail side="right" banners={right} socials={socials} />
    </>
  );
}
