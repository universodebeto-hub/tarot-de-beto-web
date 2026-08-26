import { NextResponse } from "next/server";
import { getServices } from "@/server/services";
import { isReportOnlyService } from "@/lib/service-fulfillment";

/** Catálogo completo, con `isReportOnly` marcado para que la app sepa cuáles no pasan por un tarotista (Numerología/Carta Astral). */
export async function GET() {
  const services = await getServices();
  return NextResponse.json({
    services: services.map((s) => ({ ...s, isReportOnly: isReportOnlyService(s.slug) })),
  });
}
