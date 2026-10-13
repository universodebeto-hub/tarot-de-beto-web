import type { Tone } from "@/lib/status-tone";

export type EstadoInformeUI = "PENDIENTE" | "CALCULADO" | "REDACTADO" | "ENTREGADO";

export const ESTADO_INFORME_ETIQUETA: Record<EstadoInformeUI, string> = {
  PENDIENTE: "Por empezar",
  CALCULADO: "Redactando",
  REDACTADO: "Listo para revisar",
  ENTREGADO: "Entregado",
};

export const ESTADO_INFORME_TONO: Record<EstadoInformeUI, Tone> = {
  PENDIENTE: "warning",
  CALCULADO: "warning",
  REDACTADO: "warning",
  ENTREGADO: "success",
};
