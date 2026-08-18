import { buildWhatsAppLink } from "@/config/site";
import type { Service } from "@/types/content";

export interface ServiceWithCta extends Service {
  reserveHref: string | null;
}

/**
 * Adjunta el link de WhatsApp de reserva a cada servicio, calculado en el
 * servidor. Se pasa como prop simple a los componentes cliente en vez de
 * leerse desde config/site en el cliente: en esta versión de Next.js
 * (16.3.1 + Turbopack) los componentes cliente anidados dentro de otro
 * componente cliente pueden hidratar con un valor de contexto/env
 * desactualizado — precomputar en el servidor y pasar por props evita el
 * problema por completo.
 */
export function withReserveHref(services: Service[], whatsappNumber: string): ServiceWithCta[] {
  return services.map((service) => ({
    ...service,
    reserveHref:
      service.available && whatsappNumber
        ? buildWhatsAppLink(
            whatsappNumber,
            `Hola Beto, estoy interesado en la ${service.name} (${service.durationMinutes} min).`,
          )
        : null,
  }));
}
