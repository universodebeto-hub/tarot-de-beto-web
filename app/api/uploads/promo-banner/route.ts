import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_BYTES = 3_000_000;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Sube la imagen de un banner promocional (barras laterales) a Vercel Blob -- solo el admin puede usar esto. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen pesa demasiado (máximo 3 MB)." }, { status: 400 });
  }

  try {
    const blob = await put(`promo-banners/${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[blob] error subiendo banner promocional:", err);
    return NextResponse.json({ error: "No se pudo subir la imagen. Intenta de nuevo." }, { status: 503 });
  }
}
