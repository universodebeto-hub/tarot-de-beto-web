import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

/**
 * Sube una nota de voz del chat a Vercel Blob -- mismo mecanismo que
 * app/api/uploads/payment-proof/route.ts (misma plantilla). Solo verifica
 * que la reserva exista y esté CONFIRMED + PAID (el chat solo se habilita
 * ahí, ver server/messages.ts::resolveChatAccess) -- la pertenencia real
 * (cliente dueño o tarotista vinculado) la valida sendAudioMessage al
 * registrar el mensaje, no esta subida.
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
    return NextResponse.json({ error: "Formato de audio no soportado." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La nota de voz no puede pesar más de 2 MB." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "CONFIRMED" || booking.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "El chat todavía no está habilitado para esta consulta." }, { status: 404 });
  }

  try {
    const blob = await put(`audios/${bookingId}-${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[blob] error subiendo nota de voz:", err);
    return NextResponse.json(
      { error: "La subida de audio todavía no está configurada en este entorno." },
      { status: 503 },
    );
  }
}
