/** Íconos de marca (relleno, currentColor) para los links de redes -- barras laterales y footer. Trazos simplificados, sin depender de una librería externa. */

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.5 3c.4 2 2 3.5 4 3.9v2.6a7 7 0 0 1-4-1.2v6.4a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.03v2.7a2.7 2.7 0 1 0 2.1 2.63V3h2.7Z" />
    </svg>
  );
}

const TIKTOK_MARK_PATH = "M16.5 3c.4 2 2 3.5 4 3.9v2.6a7 7 0 0 1-4-1.2v6.4a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.03v2.7a2.7 2.7 0 1 0 2.1 2.63V3h2.7Z";

/** Versión "a color" del logo -- las tres copias del trazo, apenas corridas en cian/magenta detrás del trazo negro de arriba, son el efecto que hace reconocible al logo real de TikTok (a diferencia de TikTokIcon, que es monocromo para íconos chicos de línea). Usar donde el logo necesita tener presencia propia, no solo indicar "esto es de TikTok" de pasada. */
export function TikTokLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d={TIKTOK_MARK_PATH} fill="#25F4EE" transform="translate(-0.9, 0.6)" />
      <path d={TIKTOK_MARK_PATH} fill="#FE2C55" transform="translate(0.9, -0.6)" />
      <path d={TIKTOK_MARK_PATH} fill="#0a0a0a" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.78 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.06-1.33A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.24.37.62 2.28-2.32-.6-.37.22A8.2 8.2 0 1 1 12 3.8Zm-3.1 3.9c-.19 0-.5.07-.76.36-.26.28-1 .98-1 2.4 0 1.4 1.03 2.76 1.17 2.95.14.19 2 3.15 4.9 4.3.68.28 1.22.45 1.63.58.68.21 1.31.18 1.8.11.55-.08 1.7-.7 1.94-1.36.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.33-.28-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.28-.74.93-.9 1.12-.17.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.4-1.65-1.56-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.64-1.55-.88-2.13-.23-.55-.47-.48-.64-.49h-.16Z" />
    </svg>
  );
}
