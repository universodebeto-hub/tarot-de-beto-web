import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  numeral?: string;
}

/** Panel de vidrio con esquinas de naipe — firma visual del sitio. */
export function GlassCard({ children, className, numeral }: GlassCardProps) {
  return (
    <div className={`glass arcana ${className ?? ""}`.trim()}>
      {numeral ? <span className="arcana-num block mb-3.5">{numeral}</span> : null}
      {children}
    </div>
  );
}
