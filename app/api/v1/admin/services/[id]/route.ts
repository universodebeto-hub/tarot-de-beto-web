import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { updateServiceAdmin, toggleServiceAvailability } from "@/server/admin/services";
import { prisma } from "@/lib/prisma";

function toFormData(body: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    form.set(key, typeof value === "boolean" ? (value ? "on" : "") : String(value));
  }
  return form;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminFromRequest(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body?.toggleAvailability) {
      await toggleServiceAvailability(id, user);
      return NextResponse.json({ success: true });
    }

    // El formulario de edición reutiliza el mismo esquema completo que la
    // web (server/admin/services.ts) -- se completan los campos que la app
    // no mande con los valores actuales, para poder editar solo el precio,
    // por ejemplo, sin tener que reenviar todo el servicio.
    const current = await prisma.service.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Servicio no encontrado." }, { status: 404 });

    const merged = {
      name: body.name ?? current.name,
      slug: body.slug ?? current.slug,
      description: body.description ?? current.description,
      durationMinutes: body.durationMinutes ?? current.durationMinutes,
      price: body.price ?? current.price.toString(),
      currency: body.currency ?? current.currency,
      modality: body.modality ?? current.modality,
      category: body.category ?? current.category,
      sortOrder: body.sortOrder ?? current.sortOrder,
      available: body.available ?? current.available,
    };

    const result = await updateServiceAdmin(id, {}, toFormData(merged), user);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
