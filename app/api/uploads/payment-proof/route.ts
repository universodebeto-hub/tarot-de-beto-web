import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Vercel corta el body de cualquier función serverless en ~4.5 MB *reales*
// (decimales, no 4.5*1024*1024) -- medido en producción, el corte ocurre
// entre 4.48 MB (pasa) y 4.495 MB (falla) de body total. Ese corte pasa a
// nivel de plataforma, ANTES de que este código llegue a correr, así que
// nuestro propio chequeo de tamaño de acá abajo NUNCA se alcanza para un
// archivo que ya disparó el corte de la plataforma -- por eso el límite
// acá es más bajo que el real: para que ALGUNOS archivos grandes (4-4.48
// MB) sí lleguen a este código y reciban este mensaje explicado en vez del
// "Request Entity Too Large" en texto plano que devuelve la plataforma
// (ver el manejo de ese caso en el fetch del cliente, que también lo
// traduce a este mismo mensaje). No hay forma de subir un archivo más
// pesado que esto a través de esta función sin importar qué límite
// pongamos acá. Se intentó una subida directa a Vercel Blob
// (@vercel/blob/client, sin este límite) pero el store la rechaza con
// "Access denied" -- muy probablemente una restricción de red del plan
// actual, no algo resoluble desde el código. Mientras tanto, esta es la vía
// simple y confiable, usada por web y app por igual. Nunca se comprime la
// imagen -- si pesa de más, se avisa con un mensaje claro.
const MAX_BYTES = 4_000_000;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Sube la captura del comprobante de un pago manual (Pago Móvil/Zelle/
 * Bancolombia/etc.) a Vercel Blob. Solo acepta el archivo si la reserva
 * existe y sigue PENDING_PAYMENT — evita que se puedan subir archivos
 * sueltos sin relación a ninguna reserva real.
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
    return NextResponse.json(
      {
        error:
          "Esta captura pesa demasiado para subirla (máximo ~4 MB). Recortá la imagen a solo la parte del comprobante, o mandala directo a Beto por WhatsApp.",
      },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "Reserva no encontrada o ya no está pendiente de pago." },
      { status: 404 },
    );
  }

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
