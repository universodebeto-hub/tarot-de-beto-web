import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTarotistaBySlug } from "@/server/tarotistas";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/GlassCard";
import { CallRoom } from "@/components/call/CallRoom";

export const metadata: Metadata = { title: "Llamada con tus minutos", robots: { index: false } };

/**
 * Llamar a CUALQUIER tarotista gastando la bolsa de minutos del cliente
 * (server/wallet.ts) -- a diferencia de /reservas/[id]/llamada, no hay
 * ninguna reserva puntual detrás: la autorización real pasa por
 * /api/wallet/[tarotistaId]/token en cada carga.
 */
export default async function WalletCallPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tarotista = await getTarotistaBySlug(slug);
  if (!tarotista) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/tarotistas/${slug}/llamada-minutos`);

  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { minutesBalance: true } });
  const minutesBalance = fresh?.minutesBalance ?? 0;

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[560px] px-7">
        <div className="mb-8 text-center">
          <span className="eyebrow justify-center">Llamada con tus minutos</span>
          <h1 className="mt-3">{tarotista.name}</h1>
          <p className="mb-0 font-mono text-sm text-gold">{minutesBalance} min disponibles</p>
        </div>

        <GlassCard>
          {minutesBalance > 0 ? (
            <CallRoom
              walletTarotistaId={tarotista.id}
              durationMinutes={minutesBalance}
              creditExempt={false}
              videoRequested={false}
            />
          ) : (
            <p className="mb-0 text-center text-sm text-bone-dim">
              No tenés minutos disponibles todavía -- comprá una consulta para cargar tu saldo.
            </p>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
