import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getServices } from "@/server/services";
import { toggleServiceAvailability } from "@/server/admin/services";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Panel — Servicios", robots: { index: false } };

async function toggleAction(id: string) {
  "use server";
  await toggleServiceAvailability(id);
  revalidatePath("/admin/servicios");
  revalidatePath("/servicios");
  revalidatePath("/");
}

export default async function AdminServicesPage() {
  const services = await getServices();

  return (
    <div className="flex flex-col gap-6">
      <Button href="/admin/servicios/nuevo" className="self-start">
        Nuevo servicio
      </Button>

      <div className="flex flex-col gap-3">
        {services.map((s) => (
          <GlassCard key={s.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-0.5 text-bone">{s.name}</p>
              <p className="mb-0 font-mono text-[11.5px] uppercase tracking-wide text-ash">
                {s.durationMinutes} min · {s.price} {s.currency} · {s.available ? "Disponible" : "Inactivo"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/servicios/${s.id}`} className="btn btn-ghost">
                Editar
              </Link>
              <form action={toggleAction.bind(null, s.id)}>
                <button type="submit" className="btn btn-ghost">
                  {s.available ? "Desactivar" : "Activar"}
                </button>
              </form>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
