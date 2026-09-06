import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_TYPES_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * App móvil: `@vercel/blob/client` (subida directa) depende de `undici`/
 * `crypto` de Node y no corre en el motor de React Native, así que la app
 * sigue subiendo el archivo a través de esta función -- topada por el
 * límite real de ~4.5 MB que Vercel impone al body de cualquier función
 * serverless (no hay forma de evitarlo sin la subida directa). Nunca se
 * comprime la imagen; si es más pesada que el tope, se avisa con un
 * mensaje claro en vez de fallar con un error genérico.
 */
async function handleMobileUpload(request: Request) {
  const MOBILE_MAX_BYTES = 4.5 * 1024 * 1024;
  const form = await request.formData();
  const bookingId = String(form.get("bookingId") ?? "");
  const file = form.get("file");

  if (!bookingId || !(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo o la reserva." }, { status: 400 });
  }
  const ext = ALLOWED_TYPES_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MOBILE_MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "Esta foto pesa demasiado para subirla desde la app (máximo ~4 MB). Elegí una foto más liviana, o subí este comprobante desde la web en vez de la app.",
      },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Reserva no encontrada o ya no está pendiente de pago." }, { status: 404 });
  }

  try {
    const blob = await put(`comprobantes/${bookingId}-${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[blob] error subiendo comprobante (móvil):", err);
    return NextResponse.json(
      { error: "La subida de comprobantes todavía no está configurada en este entorno." },
      { status: 503 },
    );
  }
}

/**
 * Autoriza la subida DIRECTA del comprobante de un pago manual a Vercel
 * Blob -- el archivo nunca pasa por esta función, así que no choca con el
 * límite de ~4.5 MB de body que tienen las funciones serverless de Vercel
 * (antes rechazaba fotos de cámara pesadas con un error genérico). La
 * imagen nunca se comprime, solo se valida tipo/tamaño (hasta 20 MB) y que
 * la reserva exista y siga PENDING_PAYMENT, igual que antes.
 *
 * Se usa `handleUpload`/`upload()` (el mecanismo "de fábrica" del SDK) en
 * vez de `issueSignedToken`/`presignUrl` -- ese segundo mecanismo solo
 * puede emitir blobs PRIVADOS (no tiene forma de pedir acceso público),
 * lo que rompería la vista de comprobante en el panel admin.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return handleMobileUpload(request);
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const bookingId = clientPayload ? String(JSON.parse(clientPayload).bookingId ?? "") : "";
        if (!bookingId) throw new Error("Falta la reserva.");

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.status !== "PENDING_PAYMENT") {
          throw new Error("Reserva no encontrada o ya no está pendiente de pago.");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[blob] error autorizando subida de comprobante:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo subir el comprobante." }, {
      status: 400,
    });
  }
}
