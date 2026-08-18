interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo no salió como esperábamos",
  description = "Inténtalo de nuevo en unos segundos. Si el problema continúa, escríbenos por WhatsApp.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="glass arcana flex flex-col items-center gap-4 py-14 text-center border-ember/40">
      <h3 className="mb-0 text-bone">{title}</h3>
      <p className="max-w-sm mb-0">{description}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-ghost">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
