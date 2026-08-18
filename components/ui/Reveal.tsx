"use client";

import { useEffect, useRef } from "react";
import type { ElementType, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delayMs?: number;
}

/** Revelado suave al hacer scroll (equivalente al [data-reveal] + IntersectionObserver del mockup). */
export function Reveal({ children, as: Tag = "div", className, delayMs = 0 }: RevealProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal
      className={className}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
