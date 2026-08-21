/**
 * Imágenes personalizadas por servicio del catálogo, provistas por el
 * usuario (no generadas por IA en este proyecto — ver conversación).
 * Clave por `Service.slug` (ver prisma/seed.ts). Catálogo completo: los 14
 * servicios ya tienen imagen propia.
 *
 * Archivos en `public/assets/services/<slug>.jpg`.
 */
export const SERVICE_IMAGES: Record<string, string> = {
  "consulta-pregunta-tarot": "/assets/services/consulta-pregunta-tarot.jpg",
  "consulta-15-minutos": "/assets/services/consulta-15-minutos.jpg",
  "consulta-30-minutos": "/assets/services/consulta-30-minutos.jpg",
  "consulta-60-minutos": "/assets/services/consulta-60-minutos.jpg",
  "ritual-endulzamiento": "/assets/services/ritual-endulzamiento.jpg",
  "ritual-abre-caminos": "/assets/services/ritual-abre-caminos.jpg",
  "ritual-destrancadera": "/assets/services/ritual-destrancadera.jpg",
  "ritual-proteccion": "/assets/services/ritual-proteccion.jpg",
  "ritual-corte-de-lazos": "/assets/services/ritual-corte-de-lazos.jpg",
  "ritual-del-dinero": "/assets/services/ritual-del-dinero.jpg",
  "ritual-de-amarre": "/assets/services/ritual-de-amarre.jpg",
  "informe-numerologico": "/assets/services/informe-numerologico.jpg",
  "carta-astral": "/assets/services/carta-astral.jpg",
  "tabacos": "/assets/services/tabacos.jpg",
};
