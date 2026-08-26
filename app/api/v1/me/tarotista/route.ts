import { NextResponse } from "next/server";
import { requireAuthFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getOwnTarotista, setOwnTarotistaStatus } from "@/server/tarotista-panel";
import type { TarotistaStatus } from "@prisma/client";

const VALID_STATUSES: TarotistaStatus[] = ["DISPONIBLE", "EN_CONSULTA", "EN_REPOSO", "DESCONECTADO"];

/** Perfil de tarotista de la cuenta logueada (null si no tiene uno vinculado) — pantalla principal del panel en la app. */
export async function GET(request: Request) {
  try {
    const user = await requireAuthFromRequest(request);
    const tarotista = await getOwnTarotista(user);
    return NextResponse.json({ tarotista });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

/** Cambia el estado del tarotista de la cuenta logueada — mismos 4 botones grandes del panel web. */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuthFromRequest(request);
    const body = await request.json().catch(() => null);
    const status = body?.status as TarotistaStatus;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    const result = await setOwnTarotistaStatus(status, user);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
