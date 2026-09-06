import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Ruta temporal de un solo uso -- borra a mano las cuentas de prueba
 * confirmadas con el usuario (ver conversación del 2026-09-06) y sus
 * reservas. Lista fija hardcodeada a propósito (nunca un heurístico
 * "borra lo que parezca de prueba") para no arriesgar una cuenta real.
 * Protegida con TEST_CLEANUP_SECRET -- borrar este archivo (y la env var)
 * después de usarla una vez. Mismo patrón que /api/cron/maintenance.
 */
const TEST_EMAILS = [
  "prueba1v2@example.com",
  "prueba1@example.com",
  "cleanup.temp.fase8@example.com",
  "cliente.prueba.modc@example.com",
  "cliente@tarotdebeto.local",
  "prueba.cliente.claude@tarotdebeto.local",
];

export async function GET(request: NextRequest) {
  const secret = process.env.TEST_CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "TEST_CLEANUP_SECRET no configurado." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    include: { bookings: { select: { id: true, bookingNumber: true } } },
  });

  const confirm = request.nextUrl.searchParams.get("confirm") === "true";
  if (!confirm) {
    return NextResponse.json({
      dryRun: true,
      willDelete: users.map((u) => ({
        email: u.email,
        name: `${u.firstName} ${u.lastName ?? ""}`.trim(),
        bookings: u.bookings.map((b) => b.bookingNumber),
      })),
    });
  }

  const userIds = users.map((u) => u.id);
  const bookingIds = users.flatMap((u) => u.bookings.map((b) => b.id));

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.callLog.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.paypalTransaction.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.booking.deleteMany({ where: { id: { in: bookingIds } } }),
    prisma.expoPushToken.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);

  return NextResponse.json({
    deleted: {
      users: users.map((u) => u.email),
      bookings: bookingIds.length,
    },
  });
}
