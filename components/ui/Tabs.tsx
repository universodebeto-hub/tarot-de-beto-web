"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: ReactNode;
  content: ReactNode;
}

/** Pestañas simples (sin routing) para no apilar tantas tarjetas en una página de detalle -- mismo lenguaje visual (dorado + mono uppercase) del resto del panel. */
export function Tabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const activeItem = items.find((i) => i.id === active) ?? items[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-px">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`relative flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[11.5px] uppercase tracking-wide transition-colors ${
              item.id === activeItem?.id ? "text-gold-soft" : "text-ash hover:text-bone-dim"
            }`}
          >
            {item.label}
            {item.badge}
            {item.id === activeItem?.id ? (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-gold-soft to-ember" />
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6">{activeItem?.content}</div>
    </div>
  );
}
