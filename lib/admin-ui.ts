/** Clases compartidas para los botones de ícono compactos de las listas del panel admin -- mismo tamaño/trazo en todas las secciones. */
const ICON_BTN_BASE =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4";

export const ICON_BTN_NEUTRAL = `${ICON_BTN_BASE} border-white/15 text-bone-dim hover:border-gold/30 hover:bg-gold/[0.06] hover:text-gold-soft`;
export const ICON_BTN_GOLD = `${ICON_BTN_BASE} border-gold/40 bg-gold/[0.08] text-gold-soft hover:bg-gold/15`;
export const ICON_BTN_DANGER = `${ICON_BTN_BASE} border-ember/30 text-ember hover:border-ember hover:bg-ember/10`;
