"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import type { PromoBanner } from "@prisma/client";
import type { TikTokVideo } from "@/server/tiktok";
import { TikTokLogoMark } from "@/components/ui/social-icons";

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
    <div className="glass arcana flex w-[160px] flex-col items-center gap-3 rounded-xl border border-gold/20 p-3.5 shadow-[0_0_24px_rgba(232,163,61,0.12)]">
      <span className="flex items-center gap-1.5">
        <TikTokLogoMark className="h-5 w-5 shrink-0" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-bone">TikTok</span>
      </span>

      <a href={tiktok.profileDeepLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
        <div className="relative">
          <div className="rounded-full bg-gradient-to-br from-gold-soft via-gold to-ember p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto externa de TikTok. */}
            <img
              src={tiktok.avatarUrl}
              alt={tiktok.displayName}
              className="h-14 w-14 rounded-full border-2 border-obsidian object-cover"
            />
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-obsidian bg-black">
            <TikTokLogoMark className="h-4 w-4" />
          </span>
        </div>
        <span className="mt-1 max-w-[130px] truncate text-[12px] text-bone">{tiktok.displayName}</span>
        <span className="font-display text-lg font-semibold leading-none text-gold-soft">
          {tiktok.followerCount.toLocaleString("es")}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ash">Seguidores</span>
      </a>

      {tiktok.videos.length > 0 ? (
        <div className="grid w-full grid-cols-2 gap-1.5">
          {tiktok.videos.map((v) => (
            <a
              key={v.id}
              href={v.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block aspect-9/16 overflow-hidden rounded-lg border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de TikTok. */}
              <img
                src={v.coverImageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </a>
          ))}
        </div>
      ) : null}

      <a
        href={tiktok.profileDeepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full rounded-lg border border-gold/30 py-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-gold-soft transition-colors hover:border-gold hover:bg-gold/10"
      >
        Ver perfil
      </a>
    </div>
  );
}

function Rail({
  side,
  banners,
  tiktok,
  reserveTikTokSpace,
}: {
  side: "left" | "right";
  banners: PromoBanner[];
  tiktok: TikTokWidgetData | null;
  /** Solo en el lado derecho, cuando el widget de TikTok existe pero se muestra únicamente a la izquierda: reserva el mismo alto que ocuparía acá (invisible, mismo contenido real -- así el alto es siempre exacto, sin un número mágico que se desactualice si el widget cambia de tamaño), para que el primer banner de la derecha arranque a la misma altura que el de la izquierda. COMANDO real ("quiero que este al mismo nivel de los otros banner de la izquierda"). */
  reserveTikTokSpace?: boolean;
}) {
  return (
    <aside
      className={`no-print fixed top-[calc(var(--header-h)+16px)] z-20 hidden max-h-[calc(100vh-var(--header-h)-32px)] flex-col items-center gap-3 overflow-y-auto 2xl:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {tiktok && !reserveTikTokSpace ? <TikTokWidget tiktok={tiktok} /> : null}
      {tiktok && reserveTikTokSpace ? (
        <div className="invisible" aria-hidden="true">
          <TikTokWidget tiktok={tiktok} />
        </div>
      ) : null}

      {/* COMANDO real ("pondré más banner"): antes solo se mostraba el primero de cada lado (banners.slice(0, 1)) -- ahora se muestran todos los activos, apilados, uno por fila. */}
      {banners.map((b) => (
        <a
          key={b.id}
          href={b.linkUrl}
          target={b.linkUrl.startsWith("/") ? undefined : "_blank"}
          rel={b.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
          className="glass block h-[600px] w-[160px] overflow-hidden rounded-xl transition-opacity hover:opacity-90"
        >
          {/* object-contain, no object-cover: un banner tipo "afiche" (más ancho en proporción que este recuadro angosto y alto) se recortaba de los COSTADOS con object-cover -- object-top solo ajusta el recorte vertical, no ayuda cuando lo que sobra es ancho. object-contain nunca corta nada (deja ver la imagen completa, con el fondo "glass" de sobra arriba/abajo si la proporción no calza exacto) -- para que ningún diseño futuro pierda texto sin importar su forma. */}
          {b.mediaType === "VIDEO" ? (
            <video src={b.imageUrl} className="h-full w-full object-contain" muted autoPlay loop playsInline />
          ) : (
            <Image src={b.imageUrl} alt="" width={160} height={600} className="h-full w-full object-contain" />
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
      {/* Solo la izquierda MUESTRA el widget de TikTok -- mostrarlo en los dos era repetir la misma info dos veces. La derecha igual recibe los mismos datos para reservar el mismo espacio en blanco (invisible) y que sus banners arranquen a la misma altura que los de la izquierda. */}
      <Rail side="right" banners={right} tiktok={tiktok} reserveTikTokSpace />
    </>
  );
}
