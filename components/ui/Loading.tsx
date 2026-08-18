interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Cargando…" }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ash">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-gold/25 border-t-gold"
        aria-hidden="true"
      />
      <span className="font-mono text-xs uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}
