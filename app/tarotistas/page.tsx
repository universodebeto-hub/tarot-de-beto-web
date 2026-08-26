import type { Metadata } from "next";
import { getActiveTarotistas } from "@/server/tarotistas";
import { TarotistaCard } from "@/components/tarotistas/TarotistaCard";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/tarotistas" },
  title: "Tarotistas disponibles",
  description: "Conoce a nuestros tarotistas y consulta quién está disponible ahora mismo.",
};

/**
 * Reemplaza conceptualmente "Agenda" como punto de entrada (Fase 2 de la
 * reestructuración): en vez de elegir un día/horario, el cliente ve quién
 * está disponible ahora. El flujo de reserva en sí (/agenda) sigue siendo
 * el mismo hasta la Fase 4.
 */
export default async function TarotistasPage() {
  const tarotistas = await getActiveTarotistas();

  return (
    <section className="py-[88px]">
      <div className="container mx-auto max-w-[1180px] px-7">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow">Tarotistas</span>
          <h1 className="mt-3">
            Tarotistas <em>disponibles</em>
          </h1>
          <p className="mb-0 text-[1.05rem]">
            Conoce a nuestros tarotistas y consulta con quien esté disponible en este momento.
          </p>
        </div>

        {tarotistas.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tarotistas.map((t) => (
              <TarotistaCard key={t.id} tarotista={t} whatsappNumber={siteConfig.contact.whatsappNumber} />
            ))}
          </div>
        ) : (
          <p className="text-bone-dim">No hay tarotistas disponibles por ahora.</p>
        )}
      </div>
    </section>
  );
}
