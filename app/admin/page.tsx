import type { Metadata } from "next";
import { getDashboardStats } from "@/server/admin/dashboard";
import { GlassCard } from "@/components/ui/GlassCard";

export const metadata: Metadata = { title: "Panel — Resumen" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Reservas de hoy", value: stats.todayCount },
    { label: "Pendientes de pago", value: stats.pendingCount },
    { label: "Pagos recibidos", value: stats.paidCount },
    { label: "Próximas consultas confirmadas", value: stats.upcomingCount },
    { label: "Clientes registrados", value: stats.clientsCount },
    { label: "Ingresos totales", value: `$${stats.revenue.toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <GlassCard key={c.label}>
          <span className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ash">{c.label}</span>
          <span className="text-2xl text-gold-soft">{c.value}</span>
        </GlassCard>
      ))}
    </div>
  );
}
