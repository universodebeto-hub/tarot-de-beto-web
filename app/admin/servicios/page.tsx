import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getServices } from "@/server/services";
import { toggleServiceAvailability, deleteServiceAdmin } from "@/server/admin/services";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrashIcon } from "@/components/ui/icons";
import { SummaryBar } from "@/components/admin/SummaryBar";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import type { Service } from "@/types/content";

export const metadata: Metadata = { title: "Panel — Servicios", robots: { index: false } };

async function toggleAction(id: string) {
  "use server";
  await toggleServiceAvailability(id);
  revalidatePath("/admin/servicios");
  revalidatePath("/servicios");
  revalidatePath("/");
}

async function deleteServiceAction(id: string): Promise<{ error?: string }> {
  "use server";
  const result = await deleteServiceAdmin(id);
  if (!result.error) {
    revalidatePath("/admin/servicios");
    revalidatePath("/servicios");
    revalidatePath("/");
  }
  return result;
}

function ServiceCard({ s }: { s: Service }) {
  return (
    <GlassCard className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="mb-0 text-bone">{s.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11.5px] uppercase tracking-wide text-ash">
            {s.durationMinutes} min · {s.price} {s.currency}
          </span>
          <StatusBadge label={s.available ? "Disponible" : "Inactivo"} tone={s.available ? "success" : "neutral"} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/servicios/${s.id}`} className="btn btn-ghost">
          Editar
        </Link>
        <form action={toggleAction.bind(null, s.id)}>
          <button type="submit" className="btn btn-ghost">
            {s.available ? "Desactivar" : "Activar"}
          </button>
        </form>
        <ConfirmActionButton
          label="Eliminar"
          icon={<TrashIcon className="h-4 w-4" />}
          pendingLabel="Eliminando…"
          tone="danger"
          confirmLabel="Sí, eliminar"
          confirmMessage={`¿Eliminar por completo "${s.name}"? Solo se puede si nunca tuvo reservas -- si ya las tuvo, usá "Desactivar" en vez de esto.`}
          action={deleteServiceAction.bind(null, s.id)}
          className="btn btn-ghost flex items-center gap-2 border-ember/40 text-ember hover:border-ember hover:bg-ember/10"
        />
      </div>
    </GlassCard>
  );
}

export default async function AdminServicesPage() {
  const services = await getServices();

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const tabs: TabItem[] = categories.map((category) => ({
    id: category,
    label: category,
    badge: <span className="text-ash">({services.filter((s) => s.category === category).length})</span>,
    content: (
      <div className="flex flex-col gap-3">
        {services
          .filter((s) => s.category === category)
          .map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
      </div>
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <SummaryBar
        stats={[
          { label: "Servicios", value: services.length },
          { label: "Disponibles", value: services.filter((s) => s.available).length, tone: "success" },
          { label: "Inactivos", value: services.filter((s) => !s.available).length, tone: "neutral" },
        ]}
      />

      <Button href="/admin/servicios/nuevo" className="self-start">
        Nuevo servicio
      </Button>

      {tabs.length > 0 ? (
        <GlassCard>
          <Tabs items={tabs} />
        </GlassCard>
      ) : null}
    </div>
  );
}
