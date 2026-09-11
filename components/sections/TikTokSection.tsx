import { Reveal } from "@/components/ui/Reveal";
import type { TikTokProfile, TikTokVideo } from "@/server/tiktok";

/** "Seguinos en TikTok" -- perfil + últimos videos, traídos por server/tiktok.ts::getTikTokSectionData. No se renderiza nada si todavía no hay cuenta conectada (ver app/page.tsx). */
export function TikTokSection({ profile, videos }: { profile: TikTokProfile; videos: TikTokVideo[] }) {
  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <Reveal as="div" className="section-head mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[620px]">
            <span className="eyebrow">Seguinos</span>
            <h2>
              Lo último en <em>TikTok</em>
            </h2>
          </div>

          <a
            href={profile.profileDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="glass flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:border-gold/30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- foto externa de TikTok. */}
            <img src={profile.avatarUrl} alt={profile.displayName} className="h-12 w-12 rounded-full object-cover" />
            <div>
              <p className="mb-0 text-sm text-bone">{profile.displayName}</p>
              <p className="mb-0 font-mono text-xs uppercase tracking-wide text-gold-soft">
                {profile.followerCount.toLocaleString("es")} seguidores
              </p>
            </div>
          </a>
        </Reveal>

        {videos.length === 0 ? (
          <p className="text-ash">Todavía no hay videos públicos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-4">
            {videos.map((v) => (
              <a
                key={v.id}
                href={v.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-9/16 overflow-hidden rounded-xl border border-white/10 bg-carbon-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de TikTok. */}
                <img
                  src={v.coverImageUrl}
                  alt={v.title || "Video de TikTok"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian/90 to-transparent p-3 pt-8">
                  <p className="mb-0 line-clamp-2 text-xs text-bone">{v.title}</p>
                  <p className="mb-0 font-mono text-[10.5px] uppercase tracking-wide text-gold-soft">
                    {v.viewCount.toLocaleString("es")} vistas
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
