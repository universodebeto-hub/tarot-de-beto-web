import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { generarPdfDeInforme } from "@/server/admin/informes";

// El PDF se arma en el momento (no se guarda en ningún lado) y puede tardar unos segundos.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** PDF del informe. `?descargar=1` lo baja como archivo; sin eso se muestra dentro del navegador (vista previa). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  const resultado = await generarPdfDeInforme(id);
  if (!resultado) return NextResponse.json({ error: "El informe todavía no tiene carta." }, { status: 404 });

  const descargar = req.nextUrl.searchParams.get("descargar") === "1";
  return new NextResponse(new Uint8Array(resultado.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${resultado.nombreArchivo}"`,
      // Datos personales: nada de cachés compartidas ni del navegador.
      "Cache-Control": "private, no-store",
    },
  });
}
