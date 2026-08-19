"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  deadlineIso: string;
  onExpire?: () => void;
}

function remainingSeconds(deadlineIso: string): number {
  return Math.max(0, Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000));
}

/**
 * Cuenta regresiva puramente visual. La autoridad real es el servidor
 * (`expireStaleBookings`, verificación perezosa) — este componente nunca
 * decide si la reserva sigue vigente, solo informa al usuario.
 */
export function CountdownTimer({ deadlineIso, onExpire }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(deadlineIso));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = remainingSeconds(deadlineIso);
      setSeconds(next);
      if (next === 0) onExpire?.();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineIso]);

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return (
    <span className="font-mono text-lg text-gold-soft">
      {minutes}:{secs}
    </span>
  );
}
