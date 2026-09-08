import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientNotes } from "@/server/client-notes";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/GlassCard";
import { ClientNotesPanel } from "@/components/ClientNotesPanel";

export const metadata: Metadata = { title: "Panel — Cliente", robots: { index: false } };

/** getClientNotes ya valida que este tarotista haya atendido a este cliente antes -- si no, devuelve error y esta página lo muestra en vez de las notas. */
export default async function TarotistaClientNotesPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const [client, result] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { firstName: true, lastName: true } }),
    getClientNotes(clientId),
  ]);
  if (!client) notFound();

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[560px] px-7">
        <div className="mb-8">
          <span className="eyebrow">Notas de seguimiento</span>
          <h1 className="mt-3">
            {client.firstName} {client.lastName ?? ""}
          </h1>
        </div>

        <GlassCard>
          {result.error ? (
            <p className="mb-0 text-sm text-ember">{result.error}</p>
          ) : (
            <ClientNotesPanel
              clientId={clientId}
              notes={result.notes ?? null}
              revalidatePaths={[`/panel-tarotista/clientes/${clientId}`]}
            />
          )}
        </GlassCard>
      </div>
    </section>
  );
}
