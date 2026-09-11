import Image from "next/image";
import { listActivePromoBanners } from "@/server/promo-banners";

/** Equivalente móvil de components/layout/SideBanners.tsx -- en celular/tablet no hay margen a los costados, así que los mismos banners se muestran acá como una franja horizontal, metida entre dos secciones de la home. Oculto en 2xl+ (ahí ya se ven las barras laterales). */
export async function PromoBannerStrip() {
  const { all } = await listActivePromoBanners();
  if (all.length === 0) return null;

  return (
    <div className="2xl:hidden">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {all.map((b) => (
            <a
              key={b.id}
              href={b.linkUrl}
              target={b.linkUrl.startsWith("/") ? undefined : "_blank"}
              rel={b.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
              className="glass block h-[525px] w-[140px] shrink-0 overflow-hidden rounded-xl"
            >
              {b.mediaType === "VIDEO" ? (
                <video src={b.imageUrl} className="h-full w-full object-cover" muted autoPlay loop playsInline />
              ) : (
                <Image src={b.imageUrl} alt="" width={140} height={525} className="h-full w-full object-cover" />
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
