import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-7 py-24 text-center">
      <div className="relative mb-10 flex justify-center">
        <div className="tarot-card behind" aria-hidden="true" />
        <div className="tarot-card">
          <span className="mark tl">?</span>
          <div className="glyph">
            <svg viewBox="0 0 100 100" fill="none" stroke="var(--color-gold)" strokeWidth={1.3} className="opacity-70">
              <path d="M35 38a15 15 0 1 1 22 13c-4 2.5-7 5-7 12" strokeLinecap="round" />
              <circle cx="50" cy="78" r="2.6" fill="var(--color-gold)" stroke="none" />
            </svg>
          </div>
          <span className="mark br">?</span>
        </div>
      </div>

      <span className="eyebrow">Error 404</span>
      <h1 className="mt-3 max-w-lg">
        Esta página se ha <em>perdido entre las cartas</em>
      </h1>
      <p className="mb-8 max-w-[46ch]">
        Puede que el enlace haya cambiado o que la carta simplemente no quisiera revelarse hoy.
      </p>
      <Button href="/">Volver al inicio</Button>
    </section>
  );
}
