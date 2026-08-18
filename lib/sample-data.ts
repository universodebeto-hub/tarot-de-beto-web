/**
 * FAQ: contenido aún estático (se vuelve editable por el admin en la Fase 7,
 * vía la tabla `settings`). Servicios y testimonios ya vienen de PostgreSQL
 * — ver server/services.ts y server/testimonials.ts.
 */
import type { FaqItem } from "@/types/content";

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
