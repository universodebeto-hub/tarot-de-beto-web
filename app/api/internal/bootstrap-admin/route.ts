import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * TEMPORAL, protegido por BOOTSTRAP_SECRET (mismo patrón que CRON_SECRET
 * en app/api/cron/maintenance/route.ts) -- eleva a universodebeto@gmail.com
 * a ADMIN y lo vincula al perfil de tarotista "Alberto Arango". Solo actúa
 * sobre ese correo exacto. Borrar esta ruta y la variable BOOTSTRAP_SECRET
 * después de usarla una vez.
 */
export async function POST(request: Request) {
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "BOOTSTRAP_SECRET no configurado." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const email = "universodebeto@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Cuenta no encontrada. Creala primero desde la app." }, { status: 404 });
  }
  if (user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  const linked = await prisma.tarotista.updateMany({
    where: { name: "Alberto Arango" },
    data: { userId: user.id },
  });

  return NextResponse.json({ success: true, userId: user.id, tarotistasLinked: linked.count });
}
