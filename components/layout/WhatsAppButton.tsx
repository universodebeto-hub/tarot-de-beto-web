import { buildWhatsAppLink } from "@/config/site";

interface WhatsAppButtonProps {
  whatsappNumber: string;
  message?: string;
}

/** Botón flotante permanente — abajo a la derecha en desktop, accesible en móvil. */
export function WhatsAppButton({ whatsappNumber, message }: WhatsAppButtonProps) {
  if (!whatsappNumber) return null;

  return (
    <a
      href={buildWhatsAppLink(
        whatsappNumber,
        message ?? "Hola Beto, estoy interesado en reservar una consulta.",
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="¿Necesitas ayuda? Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-[150] flex items-center gap-2.5 rounded-full border border-gold/30 bg-gradient-to-br from-gold-soft to-ember px-5 py-3.5 text-[#1a0f05] shadow-[0_10px_30px_-8px_rgba(232,163,61,0.45)] transition-transform hover:-translate-y-0.5 sm:bottom-7 sm:right-7"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .78.8-2.93-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.78.96-.14.16-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z" />
      </svg>
      <span className="hidden font-mono text-xs uppercase tracking-[0.1em] sm:inline">
        ¿Necesitas ayuda?
      </span>
    </a>
  );
}
