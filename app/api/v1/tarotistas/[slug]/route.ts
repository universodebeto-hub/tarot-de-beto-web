import { NextResponse } from "next/server";
import { getTarotistaBySlug } from "@/server/tarotistas";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tarotista = await getTarotistaBySlug(slug);
  if (!tarotista || !tarotista.active) {
    return NextResponse.json({ error: "Tarotista no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ tarotista });
}
