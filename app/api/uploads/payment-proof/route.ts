import { NextResponse } from "next/server";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Devuelve una URL firmada para que el cliente (web o app) suba la captura
 * del comprobante DIRECTO a Vercel Blob con un PUT simple, sin pasar el
 * archivo por esta función -- las funciones serverless de Vercel cortan el
 * body de la petición en ~4.5 MB, algo que antes rechazaba comprobantes de
 * cámara pesados con un error genérico (ver historial de este archivo).
 * El archivo nunca se comprime -- solo se valida tipo/tamaño (hasta 20 MB)
 * y que la reserva exista y siga PENDING_PAYMENT, igual que antes.
 *
 * `@vercel/blob/client` (el helper de subida directa "de fábrica") no es
 * compatible con el motor de la app móvil (depende de `undici`/`crypto` de
 * Node), así que se usa el mismo mecanismo pero de la forma más portable:
 * este endpoint arma la URL firmada con el SDK completo (que sí corre acá,
 * en Node.js) y el cliente solo hace un `fetch` con PUT -- funciona igual
 * en el navegador y en React Native.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const bookingId = String(body?.bookingId ?? "");
  const contentType = String(body?.contentType ?? "");
  const ext = ALLOWED_TYPES[contentType];

  if (!bookingId || !ext) {
    return NextResponse.json({ error: "Falta el archivo o la reserva." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Reserva no encontrada o ya no está pendiente de pago." }, { status: 404 });
  }

  const pathname = `comprobantes/${bookingId}-${Date.now()}.${ext}`;
  const allowedContentTypes = Object.keys(ALLOWED_TYPES);

  try {
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil: Date.now() + 10 * 60_000,
      allowedContentTypes,
      maximumSizeInBytes: MAX_BYTES,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "put",
      pathname,
      access: "public",
      allowedContentTypes,
      maximumSizeInBytes: MAX_BYTES,
      addRandomSuffix: true,
    });
    return NextResponse.json({ uploadUrl: presignedUrl });
  } catch (err) {
    console.error("[blob] error generando URL de subida de comprobante:", err);
    return NextResponse.json(
      { error: "La subida de comprobantes todavía no está configurada en este entorno." },
      { status: 503 },
    );
  }
}
