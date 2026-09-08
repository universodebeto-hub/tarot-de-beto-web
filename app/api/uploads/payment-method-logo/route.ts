import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

// Logos son archivos chicos (íconos), muy por debajo del límite real de
// Vercel para el body de una función (ver app/api/uploads/payment-proof/route.ts
// para el detalle de ese límite) -- 2 MB es de sobra.
const MAX_BYTES = 2_000_000;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Sube el logo de un método de pago (fijo o agregado por el admin) a Vercel Blob -- solo el admin puede usar esto. */
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
    return NextResponse.json({ error: "El logo pesa demasiado (máximo 2 MB)." }, { status: 400 });
  }

  try {
    const blob = await put(`payment-method-logos/${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[blob] error subiendo logo de método de pago:", err);
    return NextResponse.json({ error: "No se pudo subir el logo. Intenta de nuevo." }, { status: 503 });
  }
}
