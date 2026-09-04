import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Ruta temporal de un solo uso -- borra exactamente el usuario de prueba
 * creado para verificar /api/v1/reports y sus reservas asociadas. Protegida
 * por un secreto embebido (no un env var) porque se elimina apenas se usa.
 * NO dejar en el repo mas de lo estrictamente necesario.
 */
const ONE_TIME_SECRET = "e3d7eb76a55a67be728aa7f65d0704b9e6fad0324a030d49";
const TARGET_EMAIL_PREFIX = "reporttest.";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${ONE_TIME_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { email: { startsWith: TARGET_EMAIL_PREFIX } },
    select: { id: true, email: true },
  });
  const userIds = users.map((u) => u.id);

  const deletedBookings = await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  return NextResponse.json({
    deletedUsers: deletedUsers.count,
    deletedBookings: deletedBookings.count,
    emails: users.map((u) => u.email),
  });
}
