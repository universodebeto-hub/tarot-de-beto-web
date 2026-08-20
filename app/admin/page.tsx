import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { getDashboardStats } from "@/server/admin/dashboard";
import { sendDueReminders } from "@/server/notifications/reminders";
import { expireAndNotify } from "@/server/notifications/expiry";
import { requireAdmin } from "@/lib/auth/session";
import { GlassCard } from "@/components/ui/GlassCard";

export const metadata: Metadata = { title: "Panel — Resumen", robots: { index: false } };

async function runMaintenanceAction(): Promise<void> {
  "use server";
  // requireAdmin() aquí (y no solo en la capa layout) es a propósito: una
  // Server Action es su propio endpoint de red, invocado por un click real,
  // nunca durante el build (a diferencia de leer datos en el cuerpo de la
  // página, que Next puede ejecutar en frío al analizar si la ruta es
  // dinámica — por eso estas notificaciones NO se disparan solas al
  // renderizar esta página, solo con este botón o con
  // /api/cron/maintenance).
  await requireAdmin();
  await expireAndNotify();
  await sendDueReminders();
  revalidatePath("/admin");
}

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
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <GlassCard key={c.label}>
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ash">{c.label}</span>
            <span className="text-2xl text-gold-soft">{c.value}</span>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="flex flex-wrap items-center justify-between gap-3">
        <p className="mb-0 text-sm text-bone-dim">
          Sin cron configurado, expirar reservas vencidas (con aviso) y los recordatorios de consulta
          (24h/2h antes) no ocurren solos — dispáralos manualmente aquí, o configura{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">CRON_SECRET</code> y un cron externo
          contra <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/api/cron/maintenance</code>.
        </p>
        <form action={runMaintenanceAction}>
          <button type="submit" className="btn btn-ghost">
            Ejecutar mantenimiento ahora
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
