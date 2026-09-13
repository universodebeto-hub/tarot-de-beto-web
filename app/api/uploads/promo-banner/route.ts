import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

// Mismo límite y mismo motivo exacto que app/api/uploads/payment-proof/route.ts:
// se había armado esta ruta para subir DIRECTO del navegador a Vercel Blob
// (handleUpload()/@vercel/blob/client, sin este límite) porque un video
// pesa más que el tope real de ~4 MB de las funciones serverless de
// Vercel -- pero ese store rechaza la subida directa con "Access denied"
// (muy probablemente una restricción de red del plan actual, no algo
// resoluble desde el código), y eso dejaba el botón trabado en "Subiendo…"
// para siempre, sin ni siquiera mostrar un error. COMANDO real ("trato de
// subirlo y se queda colgado dice subiendo"). Mientras tanto, esta es la
// vía simple y confiable ya usada en el resto del sitio: el archivo pasa
// por esta función. Un video de varios MB va a superar este tope y avisar
// con un mensaje claro, en vez de colgarse en silencio.
const MAX_BYTES = 4_000_000;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

/** Sube un banner promocional (imagen o video corto) a Vercel Blob -- solo el admin puede usar esto. */
export async function POST(req: NextRequest): Promise<NextResponse> {
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
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG, WEBP, MP4 o WEBM." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "Este archivo pesa demasiado para subirlo (máximo ~4 MB). Si es un video, recortalo o comprimilo antes de subirlo.",
      },
      { status: 400 },
    );
  }

  try {
    const blob = await put(`promo-banners/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[blob] error subiendo banner promocional:", err);
    return NextResponse.json({ error: "No se pudo subir el archivo. Intenta de nuevo." }, { status: 503 });
  }
}
