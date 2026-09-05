import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
