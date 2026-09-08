import "server-only";
import { prisma } from "@/lib/prisma";

/** Tope de minutos acumulados en "Créditos Beto" antes de pausar la cuenta sola -- ver setBookingStatus (server/admin/bookings.ts) y requestCreditBooking (server/credit.ts). */
export const CREDIT_MINUTES_CAP = 300;

/** A partir de qué minuto total de UNA consulta empieza a regir la tarifa más cara. */
export const OVERAGE_HOUR_THRESHOLD_MINUTES = 60;

export const OVERAGE_SLUG_TIER1 = "minuto-adicional-credito-hasta-1h";
export const OVERAGE_SLUG_TIER2 = "minuto-adicional-credito-mas-1h";

/**
 * Crea (una sola vez, si faltan) las dos filas de Service que fijan la
 * tarifa por minuto excedente de una consulta a crédito -- se editan como
 * cualquier otro servicio desde /admin/servicios (precio ahí = $/minuto),
 * pero `available: false` para que nunca aparezcan en la reserva pública.
 * Mismo patrón que ensureInitialTarotistas (server/admin/tarotistas.ts).
 */
export async function ensureOverageServices(): Promise<void> {
  await prisma.service.upsert({
    where: { slug: OVERAGE_SLUG_TIER1 },
    update: {},
    create: {
      slug: OVERAGE_SLUG_TIER1,
      name: "Minuto adicional a crédito (hasta 1h)",
      description: "Tarifa interna por minuto excedente de una consulta a crédito, mientras la llamada no pase de 1 hora en total. No es un servicio reservable.",
      category: "Otros",
      durationMinutes: 1,
      price: 0.6,
      currency: "USD",
      modality: "LLAMADA",
      available: false,
      sortOrder: 900,
    },
  });

  await prisma.service.upsert({
    where: { slug: OVERAGE_SLUG_TIER2 },
    update: {},
    create: {
      slug: OVERAGE_SLUG_TIER2,
      name: "Minuto adicional a crédito (más de 1h)",
      description: "Tarifa interna por minuto excedente de una consulta a crédito, una vez que la llamada ya pasó de 1 hora en total. No es un servicio reservable.",
      category: "Otros",
      durationMinutes: 1,
      price: 0.68,
      currency: "USD",
      modality: "LLAMADA",
      available: false,
      sortOrder: 901,
    },
  });
}

export interface OverageCalculation {
  /** Minutos totales realmente usados en la consulta (paquete + excedente). */
  totalMinutes: number;
  /** Minutos por encima de lo pagado. */
  overageMinutes: number;
  /** Costo del excedente, en dólares, ya aplicando el tramo de $0.60/$0.68 que corresponda. */
  overageCost: number;
}

/**
 * Calcula el excedente de UNA consulta a crédito ya terminada -- se llama
 * al marcarla COMPLETED (ver setBookingStatus). El tramo de $0.60 cubre los
 * minutos entre lo pagado y la hora; el de $0.68, todo lo que pase de la
 * hora. Las tarifas se leen de los Service (ensureOverageServices) para que
 * Beto pueda ajustarlas él mismo desde /admin/servicios sin redeploy.
 */
export async function calculateOverage(paidMinutes: number, totalMinutes: number): Promise<OverageCalculation> {
  await ensureOverageServices();

  const overageMinutes = Math.max(0, totalMinutes - paidMinutes);
  if (overageMinutes === 0) return { totalMinutes, overageMinutes: 0, overageCost: 0 };

  const [tier1, tier2] = await Promise.all([
    prisma.service.findUniqueOrThrow({ where: { slug: OVERAGE_SLUG_TIER1 } }),
    prisma.service.findUniqueOrThrow({ where: { slug: OVERAGE_SLUG_TIER2 } }),
  ]);

  const tier1Minutes = Math.min(overageMinutes, Math.max(0, OVERAGE_HOUR_THRESHOLD_MINUTES - paidMinutes));
  const tier2Minutes = overageMinutes - tier1Minutes;

  const overageCost = tier1Minutes * Number(tier1.price) + tier2Minutes * Number(tier2.price);

  return { totalMinutes, overageMinutes, overageCost: Math.round(overageCost * 100) / 100 };
}
