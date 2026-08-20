import "server-only";
import { prisma } from "@/lib/prisma";
import { expireStaleBookings } from "@/server/availability";

export interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  pendingPaymentsCount: number;
  paidCount: number;
  upcomingCount: number;
  clientsCount: number;
  revenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await expireStaleBookings();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    todayCount,
    pendingCount,
    paidCount,
    upcomingCount,
    clientsCount,
    confirmedBookings,
  ] = await Promise.all([
    prisma.booking.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd }, status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } },
    }),
    prisma.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.booking.count({ where: { paymentStatus: "PAID" } }),
    prisma.booking.count({ where: { startsAt: { gte: now }, status: "CONFIRMED" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.booking.findMany({
      where: { paymentStatus: "PAID" },
      include: { service: true },
    }),
  ]);

  const revenue = confirmedBookings.reduce((sum, b) => sum + Number(b.service.price), 0);

  return {
    todayCount,
    pendingCount,
    pendingPaymentsCount: pendingCount,
    paidCount,
    upcomingCount,
    clientsCount,
    revenue,
  };
}
