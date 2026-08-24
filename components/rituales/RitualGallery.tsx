"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface RitualGalleryProps {
  ritualName: string;
  photos: string[];
}

/** Galería de fotos reales del ritual, con vista ampliada (lightbox) simple
 * sin librería externa — miniaturas en franja, clic abre overlay con
 * navegación siguiente/anterior y cierre por Escape o clic fuera. */
export function RitualGallery({ ritualName, photos }: RitualGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, photos.length]);

  if (photos.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`Ver foto ${i + 1} de ${ritualName} en tamaño completo`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-gold/20 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-0.5 hover:border-gold/40"
          >
            <Image
              src={src}
              alt={`${ritualName} — evidencia visual`}
              fill
              sizes="(min-width: 640px) 200px, 45vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {openIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${ritualName} — foto ampliada`}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-obsidian/90 p-6 backdrop-blur-sm"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Cerrar"
            className="absolute right-5 top-5 font-mono text-xs uppercase tracking-wide text-ash hover:text-gold-soft"
          >
            Cerrar ✕
          </button>

          <div
            className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-xl border border-gold/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[openIndex]}
              alt={`${ritualName} — evidencia visual ampliada`}
              fill
              sizes="480px"
              className="object-cover"
            />
          </div>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex - 1 + photos.length) % photos.length);
                }}
                aria-label="Foto anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-gold-soft hover:border-gold/40"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex + 1) % photos.length);
                }}
                aria-label="Foto siguiente"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-gold-soft hover:border-gold/40"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
