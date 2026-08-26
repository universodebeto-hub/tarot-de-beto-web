import type { TarotistaStatus } from "@prisma/client";

/**
 * Etiquetas/colores compartidos del estado de disponibilidad — un solo
 * lugar para que la ficha pública (TarotistaCard), el panel del tarotista
 * (Fase 4) y el panel admin (Fase 6) queden siempre consistentes.
 */
export const TAROTISTA_STATUS_LABEL: Record<TarotistaStatus, string> = {
  DISPONIBLE: "Disponible",
  EN_CONSULTA: "En consulta",
  EN_REPOSO: "En reposo",
  DESCONECTADO: "Desconectado",
};

export const TAROTISTA_STATUS_DESCRIPTION: Record<TarotistaStatus, string> = {
  DISPONIBLE: "Disponible para consultas ahora mismo.",
  EN_CONSULTA: "Atendiendo a otra persona en este momento.",
  EN_REPOSO: "Conectado, pero sin recibir consultas por ahora.",
  DESCONECTADO: "No disponible en este momento.",
};

/** Clase de color del punto de estado — reutiliza tokens existentes de la paleta (ver globals.css). */
export const TAROTISTA_STATUS_DOT_CLASS: Record<TarotistaStatus, string> = {
  DISPONIBLE: "bg-emerald",
  EN_CONSULTA: "bg-gold",
  EN_REPOSO: "bg-ash",
  DESCONECTADO: "bg-ember",
};
