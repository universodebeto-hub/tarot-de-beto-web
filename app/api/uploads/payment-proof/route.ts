import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Sube la captura del comprobante de un pago manual (Pago Móvil/Zelle/
 * Binance) a Vercel Blob. Solo acepta el archivo si la reserva existe y
 * sigue PENDING_PAYMENT — evita que se puedan subir archivos sueltos sin
 * relación a ninguna reserva real.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const bookingId = String(form.get("bookingId") ?? "");
  const file = form.get("file");

  if (!bookingId || !(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo o la reserva." }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 5 MB." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "Reserva no encontrada o ya no está pendiente de pago." },
      { status: 404 },
    );
  }

  // No se valida un token específico de antemano: Vercel Blob se puede
  // conectar por token clásico (BLOB_READ_WRITE_TOKEN) o por OIDC (sin esa
  // variable, ver conexión del Store en el dashboard) — @vercel/blob
  // resuelve solo cuál usar. Si el Store no está conectado en este
  // entorno, put() lanza y el catch de abajo responde igual de claro.
  try {
    const blob = await put(`comprobantes/${bookingId}-${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[blob] error subiendo comprobante:", err);
    return NextResponse.json(
      { error: "La subida de comprobantes todavía no está configurada en este entorno." },
      { status: 503 },
    );
  }
}
