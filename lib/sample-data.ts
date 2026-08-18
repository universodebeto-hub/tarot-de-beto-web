/**
 * Datos de ejemplo para la Fase 1 (diseño visual).
 * A partir de la Fase 2 estos vienen de PostgreSQL vía Prisma
 * (tablas `services` y `testimonials`) y el admin los edita sin tocar código.
 */
import type { FaqItem, Service, Testimonial } from "@/types/content";

export const sampleServices: Service[] = [
  {
    id: "consulta-15",
    slug: "consulta-15-minutos",
    name: "Consulta express",
    description:
      "Una pregunta puntual, una tirada corta, una respuesta directa. Ideal cuando necesitas claridad rápida sobre algo concreto.",
    durationMinutes: 15,
    price: 10,
    currency: "USD",
    available: true,
    modality: "Videollamada",
    category: "Express",
  },
  {
    id: "consulta-30",
    slug: "consulta-30-minutos",
    name: "Lectura general",
    description:
      "Una mirada completa a tu presente: amor, trabajo y camino de vida. Qué energías están en juego y hacia dónde se inclina el camino.",
    durationMinutes: 30,
    price: 20,
    currency: "USD",
    available: true,
    modality: "Videollamada",
    category: "General",
  },
  {
    id: "consulta-60",
    slug: "consulta-60-minutos",
    name: "Consulta extendida",
    description:
      "Sesión pausada para acompañar procesos más grandes: decisiones importantes, ciclos que cierran o varias preguntas en una sola consulta.",
    durationMinutes: 60,
    price: 35,
    currency: "USD",
    available: true,
    modality: "Videollamada",
    category: "Extendida",
  },
];

/** Testimonios de ejemplo — se reemplazan por reseñas reales moderadas desde el panel admin (Fase 7). */
export const sampleTestimonials: Testimonial[] = [
  {
    id: "t1",
    name: "María C.",
    text: "Sentí una consulta honesta, sin miedo y sin vueltas. Beto me ayudó a ver una decisión de trabajo con mucha más claridad.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Andrés R.",
    text: "Me gustó que no fue un show, fue una conversación real. Las cartas abrieron preguntas que yo ya traía pero no sabía nombrar.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Paula G.",
    text: "Cercano y directo. Justo lo que necesitaba para tomar una decisión que llevaba meses posponiendo.",
    rating: 5,
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "¿Qué necesito para una consulta?",
    answer:
      "Solo tu pregunta o el tema que quieres consultar, y un lugar tranquilo para la videollamada o llamada en el horario que reserves.",
  },
  {
    question: "¿Cómo se realiza la consulta?",
    answer:
      "Por videollamada o llamada, según la modalidad del servicio elegido. Recibirás el enlace o los datos de contacto tras confirmar tu reserva.",
  },
  {
    question: "¿Cómo puedo pagar?",
    answer:
      "El pago se realiza en línea de forma segura con PayPal al momento de reservar. Próximamente se sumarán más métodos de pago.",
  },
  {
    question: "¿Puedo cancelar?",
    answer:
      "Sí, según la política de cancelación vigente (visible antes de confirmar tu reserva). Escríbenos por WhatsApp si necesitas ayuda con un caso puntual.",
  },
  {
    question: "¿Puedo reprogramar?",
    answer:
      "Sí, puedes solicitar una reprogramación desde tu cuenta hasta el límite de tiempo establecido antes de tu consulta.",
  },
  {
    question: "¿Qué sucede si no puedo asistir?",
    answer:
      "Contáctanos lo antes posible por WhatsApp. Si no se avisa y no se reprograma a tiempo, la consulta se considera completada.",
  },
  {
    question: "¿Cuánto tiempo tengo para pagar?",
    answer:
      "Tu horario queda reservado temporalmente por un tiempo limitado (normalmente 15 minutos) para completar el pago antes de liberarse.",
  },
  {
    question: "¿La consulta es privada?",
    answer:
      "Totalmente. Tu historia y tu consulta se quedan entre las cartas y nosotros, sin juicios ni terceros.",
  },
  {
    question: "¿Cómo recibiré el enlace/información?",
    answer:
      "Por correo electrónico y, si lo prefieres, por WhatsApp, apenas tu pago quede confirmado.",
  },
];
