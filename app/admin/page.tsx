import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getDashboardStats } from "@/server/admin/dashboard";
import { sendDueReminders } from "@/server/notifications/reminders";
import { expireAndNotify } from "@/server/notifications/expiry";
import { getProviderPresence, toggleProviderOnline } from "@/server/presence";
import { requireAdmin } from "@/lib/auth/session";
import { businessDateString } from "@/lib/timezone";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CleanupBookingsButton } from "@/components/admin/CleanupBookingsButton";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import { VALUE_TONE } from "@/components/admin/SummaryBar";

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

async function toggleOnlineAction(): Promise<void> {
  "use server";
  await toggleProviderOnline();
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const presence = await getProviderPresence();

  const today = businessDateString(new Date());
  const cards = [
    { label: "Reservas de hoy", value: stats.todayCount, tone: "neutral" as const, href: `/admin/reservas?from=${today}&to=${today}` },
    { label: "Pendientes de pago", value: stats.pendingCount, tone: "warning" as const, href: "/admin/reservas?status=PENDING_PAYMENT" },
    { label: "Pagos recibidos", value: stats.paidCount, tone: "success" as const, href: "/admin/reservas?paymentStatus=PAID" },
    {
      label: "Próximas consultas confirmadas",
      value: stats.upcomingCount,
      tone: "neutral" as const,
      href: `/admin/reservas?status=CONFIRMED&from=${today}`,
    },
    { label: "Clientes registrados", value: stats.clientsCount, tone: "neutral" as const, href: "/admin/clientes" },
    { label: "Ingresos totales", value: `$${stats.revenue.toFixed(2)}`, tone: "success" as const, href: "/admin/reservas?paymentStatus=PAID" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block">
            <GlassCard className="transition-colors hover:border-gold/30">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ash">{c.label}</span>
              <span className={`text-2xl font-semibold ${VALUE_TONE[c.tone]}`}>{c.value}</span>
            </GlassCard>
          </Link>
        ))}
      </div>

      <GlassCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StatusBadge label={presence.isOnline ? "En línea" : "Desconectado"} tone={presence.isOnline ? "success" : "neutral"} />
          <p className="mb-0 text-sm text-bone-dim">
            los visitantes {presence.isOnline ? "ven" : "no ven"} el botón &quot;Contactar ahora&quot;.
          </p>
        </div>
        <form action={toggleOnlineAction}>
          <button type="submit" className="btn btn-ghost">
            {presence.isOnline ? "Marcarme desconectado" : "Marcarme en línea"}
          </button>
        </form>
      </GlassCard>

      <CollapsibleSection label="Herramientas avanzadas">
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

        <GlassCard className="flex flex-wrap items-center justify-between gap-3">
          <p className="mb-0 text-sm text-bone-dim">
            Borra de una vez las reservas que nunca se concretaron (expiradas, vencidas sin pagar, o canceladas sin
            pago) — útil para limpiar datos de prueba. En producción esto ya queda al día solo: cualquier reserva sin
            pagar se borra sola a los 30 minutos.
          </p>
          <CleanupBookingsButton />
        </GlassCard>
      </CollapsibleSection>
    </div>
  );
}
