"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import type { PromoBanner } from "@prisma/client";
import type { TikTokVideo } from "@/server/tiktok";
import { TikTokIcon } from "@/components/ui/social-icons";

/** Rutas "de aplicación" (paneles con su propio menú lateral) donde estas barras no deben mostrarse -- se superponen con el menú del panel, no con contenido de la página pública. */
const HIDDEN_PREFIXES = ["/admin", "/panel-tarotista", "/dashboard"];

export interface TikTokWidgetData {
  displayName: string;
  avatarUrl: string;
  followerCount: number;
  profileDeepLink: string;
  videos: TikTokVideo[];
}

function TikTokWidget({ tiktok }: { tiktok: TikTokWidgetData }) {
  return (
    <div className="glass flex w-[160px] flex-col items-center gap-2.5 rounded-xl p-3">
      <a href={tiktok.profileDeepLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
        <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.15em] text-ash">
          <TikTokIcon className="h-2.5 w-2.5 shrink-0" />
          TikTok
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto externa de TikTok. */}
        <img src={tiktok.avatarUrl} alt={tiktok.displayName} className="h-11 w-11 rounded-full object-cover" />
        <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-gold-soft">
          <TikTokIcon className="h-3 w-3 shrink-0" />
          {tiktok.followerCount.toLocaleString("es")} seguidores
        </span>
      </a>
      {tiktok.videos.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {tiktok.videos.map((v) => (
            <a key={v.id} href={v.shareUrl} target="_blank" rel="noopener noreferrer" className="block aspect-9/16 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de TikTok. */}
              <img src={v.coverImageUrl} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Rail({
  side,
  banners,
  tiktok,
}: {
  side: "left" | "right";
  banners: PromoBanner[];
  tiktok: TikTokWidgetData | null;
}) {
  return (
    <aside
      className={`no-print fixed top-[calc(var(--header-h)+16px)] z-20 hidden max-h-[calc(100vh-var(--header-h)-32px)] flex-col items-center gap-3 overflow-hidden 2xl:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {tiktok ? <TikTokWidget tiktok={tiktok} /> : null}

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
  tiktok,
}: {
  left: PromoBanner[];
  right: PromoBanner[];
  tiktok: TikTokWidgetData | null;
}) {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      <Rail side="left" banners={left} tiktok={tiktok} />
      {/* Solo un lado muestra el widget de TikTok -- mostrarlo en los dos era repetir la misma info dos veces. */}
      <Rail side="right" banners={right} tiktok={null} />
    </>
  );
}
