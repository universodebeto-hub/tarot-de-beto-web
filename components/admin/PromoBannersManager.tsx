"use client";

import { useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import {
  createPromoBannerAction,
  updatePromoBannerAction,
  togglePromoBannerActiveAction,
  deletePromoBannerAction,
} from "@/app/admin/configuracion/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrashIcon } from "@/components/ui/icons";
import type { PromoBannerPosition, PromoBannerMediaType } from "@prisma/client";

export interface PromoBannerItem {
  id: string;
  imageUrl: string;
  mediaType: PromoBannerMediaType;
  linkUrl: string;
  position: PromoBannerPosition;
  active: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/webm";

/** Sube directo del navegador a Vercel Blob (no pasa por nuestro servidor) -- necesario para que un video de varios MB no choque con el límite de tamaño de body de las funciones serverless. Ver app/api/uploads/promo-banner/route.ts. */
async function uploadBannerFile(file: File): Promise<{ url?: string; mediaType?: PromoBannerMediaType; error?: string }> {
  const mediaType: PromoBannerMediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
  try {
    const blob = await upload(`promo-banners/${Date.now()}-${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/uploads/promo-banner",
    });
    return { url: blob.url, mediaType };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo subir el archivo." };
  }
}

function BannerPreview({ url, mediaType, className }: { url: string; mediaType: PromoBannerMediaType; className: string }) {
  if (mediaType === "VIDEO") {
    return <video src={url} className={`absolute inset-0 ${className}`} muted autoPlay loop playsInline />;
  }
  return <Image src={url} alt="" fill sizes="40px" className={className} />;
}

function AddBannerForm() {
  const [linkUrl, setLinkUrl] = useState("");
  const [position, setPosition] = useState<PromoBannerPosition>("LEFT");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!linkUrl.trim() || !file) {
      setMessage("Elegí una imagen o video y escribí a dónde va a llevar el link.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const uploaded = await uploadBannerFile(file);
      if (!uploaded.url || !uploaded.mediaType) {
        setMessage(uploaded.error ?? "No se pudo subir el archivo.");
        return;
      }
      const result = await createPromoBannerAction({ imageUrl: uploaded.url, mediaType: uploaded.mediaType, linkUrl, position });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setLinkUrl("");
      setFile(null);
      setMessage("Banner agregado.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
      <span className="eyebrow">Agregar banner</span>
      <label className="flex flex-col gap-1 text-sm">
        Lado
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as PromoBannerPosition)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        >
          <option value="LEFT">Izquierda</option>
          <option value="RIGHT">Derecha</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Link (a dónde va cuando lo tocan)
        <input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Ej. https://wa.me/573001234567 o /servicios/ritual-de-amarre"
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Imagen o video del banner (video: corto, mudo, en loop -- hasta 30 MB)
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-obsidian"
        />
      </label>
      <button type="button" onClick={handleSubmit} disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
        {pending ? "Subiendo…" : "Agregar banner"}
      </button>
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}

function BannerRow({ banner }: { banner: PromoBannerItem }) {
  const [linkUrl, setLinkUrl] = useState(banner.linkUrl);
  const [position, setPosition] = useState<PromoBannerPosition>(banner.position);
  const [imageUrl, setImageUrl] = useState(banner.imageUrl);
  const [mediaType, setMediaType] = useState<PromoBannerMediaType>(banner.mediaType);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const uploaded = await uploadBannerFile(file);
      if (uploaded.url && uploaded.mediaType) {
        setImageUrl(uploaded.url);
        setMediaType(uploaded.mediaType);
      } else {
        setMessage(uploaded.error ?? "No se pudo subir el archivo.");
      }
    });
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updatePromoBannerAction(banner.id, { linkUrl, position, imageUrl, mediaType });
      setMessage(result.error ?? "Guardado.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-10 overflow-hidden rounded-lg bg-white">
            <BannerPreview url={imageUrl} mediaType={mediaType} className="h-full w-full object-cover" />
          </div>
          <StatusBadge label={banner.active ? "Activo" : "Inactivo"} tone={banner.active ? "success" : "neutral"} />
          <span className="font-mono text-[10px] uppercase tracking-wide text-ash">{mediaType === "VIDEO" ? "Video" : "Imagen"}</span>
        </div>
        <div className="flex items-center gap-2">
          <ConfirmActionButton
            label={banner.active ? "Desactivar" : "Activar"}
            confirmLabel="Sí"
            confirmMessage={banner.active ? "¿Desactivar este banner? Deja de mostrarse en el sitio." : "¿Activar este banner?"}
            action={() => togglePromoBannerActiveAction(banner.id)}
            className="btn btn-ghost"
          />
          <ConfirmActionButton
            label=""
            icon={<TrashIcon className="h-4 w-4" />}
            title="Eliminar"
            tone="danger"
            confirmLabel="Sí, eliminar"
            confirmMessage="¿Eliminar este banner? No se puede deshacer."
            action={() => deletePromoBannerAction(banner.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ember/30 text-ember hover:border-ember hover:bg-ember/10"
          />
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Lado
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as PromoBannerPosition)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        >
          <option value="LEFT">Izquierda</option>
          <option value="RIGHT">Derecha</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Link
        <input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Cambiar imagen o video
        <input
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-obsidian"
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={pending} className="btn btn-ghost self-start disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
      </div>
    </div>
  );
}

/** Banners promocionales de las barras laterales del sitio (solo pantallas anchas) -- Beto los sube/edita solo, sin tocar código. Pueden ser imagen o video corto en loop. */
export function PromoBannersManager({ banners }: { banners: PromoBannerItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="mb-0 text-sm text-bone-dim">
        Se muestran a los costados de la página en pantallas anchas (compu/monitor grande) -- en celular y tablet no
        hay espacio, así que no aparecen ahí.
      </p>
      {banners.map((b) => (
        <BannerRow key={b.id} banner={b} />
      ))}
      <AddBannerForm />
    </div>
  );
}
