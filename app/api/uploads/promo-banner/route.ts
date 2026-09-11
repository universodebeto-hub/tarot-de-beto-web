import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Banners promocionales -- a diferencia de los otros uploads del sitio
 * (payment-proof, payment-method-logo), este puede ser un video, que pesa
 * mucho más que una imagen. Por eso acá el archivo va DIRECTO del
 * navegador a Vercel Blob (ver components/admin/PromoBannersManager.tsx,
 * usa `upload()` de @vercel/blob/client) -- esta ruta solo emite el token
 * firmado, el archivo nunca pasa por esta función, así que no choca con el
 * límite de tamaño de body de las funciones serverless (~4.5 MB).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        try {
          await requireAdmin();
        } catch {
          throw new Error("No autorizado.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"],
          addRandomSuffix: true,
          maximumSizeInBytes: 30_000_000,
        };
      },
      // Sin onUploadCompleted: no hace falta guardar nada acá -- el cliente
      // llama a createPromoBannerAction con la URL final una vez que
      // upload() termina, en el mismo flujo (ver PromoBannersManager.tsx).
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[blob] error subiendo banner promocional:", err);
    return NextResponse.json({ error: (err as Error).message ?? "No se pudo subir el archivo." }, { status: 400 });
  }
}
