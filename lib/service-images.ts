/**
 * Imágenes personalizadas por servicio del catálogo, provistas por el
 * usuario (no generadas por IA en este proyecto — ver conversación).
 * Clave por `Service.slug` (ver prisma/seed.ts). Si un slug no aparece
 * acá, `ServiceCard` cae al ícono genérico de siempre — no todos los
 * servicios tienen imagen todavía, se van agregando de a una.
 *
 * Archivos en `public/assets/services/<slug>.jpg`.
 */
export const SERVICE_IMAGES: Record<string, string> = {
  "ritual-endulzamiento": "/assets/services/ritual-endulzamiento.jpg",
  "ritual-abre-caminos": "/assets/services/ritual-abre-caminos.jpg",
  "ritual-destrancadera": "/assets/services/ritual-destrancadera.jpg",
  "ritual-proteccion": "/assets/services/ritual-proteccion.jpg",
  "ritual-corte-de-lazos": "/assets/services/ritual-corte-de-lazos.jpg",
  "ritual-del-dinero": "/assets/services/ritual-del-dinero.jpg",
};
