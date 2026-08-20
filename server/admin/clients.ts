import "server-only";
import { prisma } from "@/lib/prisma";

export async function listClientsAdmin(q?: string) {
  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      bookings: { include: { service: true }, orderBy: { startsAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt,
    bookingsCount: u.bookings.length,
    lastBookingAt: u.bookings[0]?.startsAt ?? null,
    totalSpent: u.bookings
      .filter((b) => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + Number(b.service.price), 0),
  }));
}

export async function getClientAdminById(id: string) {
  return prisma.user.findUnique({
    where: { id, role: "CLIENT" },
    include: {
      bookings: { include: { service: true }, orderBy: { startsAt: "desc" } },
    },
  });
}
