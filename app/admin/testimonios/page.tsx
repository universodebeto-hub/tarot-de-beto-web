import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { listTestimonialsAdmin, setTestimonialStatus } from "@/server/admin/testimonials";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryBar } from "@/components/admin/SummaryBar";
import type { Tone } from "@/lib/status-tone";
import type { TestimonialStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Panel — Testimonios", robots: { index: false } };

const STATUS_LABEL: Record<TestimonialStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  PUBLISHED: "Publicado",
};

const STATUS_TONE: Record<TestimonialStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PUBLISHED: "success",
};

async function changeStatus(id: string, status: TestimonialStatus) {
  "use server";
  await setTestimonialStatus(id, status);
  revalidatePath("/admin/testimonios");
  revalidatePath("/");
}

export default async function AdminTestimonialsPage() {
  const testimonials = await listTestimonialsAdmin();

  if (testimonials.length === 0) {
    return <EmptyState title="Todavía no hay testimonios" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryBar
        stats={[
          { label: "Testimonios", value: testimonials.length },
          { label: "Pendientes", value: testimonials.filter((t) => t.status === "PENDING").length, tone: "warning" },
          { label: "Publicados", value: testimonials.filter((t) => t.status === "PUBLISHED").length, tone: "success" },
        ]}
      />

      <div className="flex flex-col gap-4">
      {testimonials.map((t) => (
        <GlassCard key={t.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-gold">{t.name}</span>
            <StatusBadge label={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} />
          </div>
          <p className="mb-0 text-sm italic text-bone">&ldquo;{t.text}&rdquo;</p>
          <div className="flex flex-wrap gap-2">
            <form action={changeStatus.bind(null, t.id, "PUBLISHED")}>
              <button type="submit" disabled={t.status === "PUBLISHED"} className="btn btn-gold disabled:opacity-40">
                Publicar
              </button>
            </form>
            <form action={changeStatus.bind(null, t.id, "APPROVED")}>
              <button type="submit" disabled={t.status === "APPROVED"} className="btn btn-ghost disabled:opacity-40">
                Aprobar
              </button>
            </form>
            <form action={changeStatus.bind(null, t.id, "REJECTED")}>
              <button type="submit" disabled={t.status === "REJECTED"} className="btn btn-ghost disabled:opacity-40">
                Rechazar
              </button>
            </form>
          </div>
        </GlassCard>
      ))}
      </div>
    </div>
  );
}
