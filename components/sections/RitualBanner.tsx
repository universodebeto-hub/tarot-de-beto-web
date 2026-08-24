"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { RitualBannerSlide } from "@/lib/ritual-gallery";

export interface RitualBannerItem extends RitualBannerSlide {
  name: string;
  tagline: string;
}

interface RitualBannerProps {
  items: RitualBannerItem[];
}

const ROTATE_MS = 6500;

/** Carrusel automático de evidencias visuales — fundido suave entre
 * diapositivas, pausa en hover/foco, respeta prefers-reduced-motion. */
export function RitualBanner({ items }: RitualBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current || items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  if (items.length === 0) return null;

  const current = items[index];

  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-gold/20 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)] sm:aspect-[21/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {items.map((item, i) => (
        <div
          key={item.slug}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <Image
            src={item.desktop}
            alt={`${item.name} — evidencia visual`}
            fill
            sizes="(min-width: 640px) 1180px, 100vw"
            className="hidden object-cover sm:block"
            priority={i === 0}
          />
          <Image
            src={item.mobile}
            alt={`${item.name} — evidencia visual`}
            fill
            sizes="100vw"
            className="block object-cover sm:hidden"
            priority={i === 0}
          />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian/90 via-obsidian/40 to-transparent p-6 sm:p-10">
        <span className="font-mono text-[11px] uppercase tracking-wide text-gold-soft">{current.name}</span>
        <p className="mb-4 mt-1.5 max-w-md text-lg text-bone sm:text-xl">{current.tagline}</p>
        <Link href={`/servicios/${current.slug}`} className="btn btn-gold">
          Conocer este ritual
        </Link>
      </div>

      {items.length > 1 ? (
        <div className="absolute right-5 top-5 flex gap-2">
          {items.map((item, i) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver ${item.name}`}
              aria-current={i === index}
              className={`h-2 w-2 rounded-full transition-colors ${i === index ? "bg-gold" : "bg-white/30 hover:bg-white/50"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
