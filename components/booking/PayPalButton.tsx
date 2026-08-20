"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => { render: (container: HTMLElement) => void };
    };
  }
}

interface PayPalButtonProps {
  clientId: string;
  currency: string;
  bookingId: string;
}

/**
 * Botón oficial de PayPal. `createOrder`/`onApprove` llaman a NUESTRO
 * backend (nunca a PayPal directamente desde el cliente) — la orden se
 * crea y se captura del lado del servidor, así que el navegador nunca es
 * la autoridad sobre si el pago fue exitoso.
 */
export function PayPalButton({ clientId, currency, bookingId }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Estado inicial calculado en el propio useState (no con un setState
  // síncrono dentro del efecto) para cumplir react-hooks/set-state-in-effect.
  const [scriptReady, setScriptReady] = useState(
    () => typeof document !== "undefined" && Boolean(document.querySelector("script[data-paypal-sdk]") && window.paypal),
  );

  useEffect(() => {
    if (scriptReady) return;
    if (document.querySelector<HTMLScriptElement>("script[data-paypal-sdk]")) {
      // Ya hay un script cargando (otra instancia lo agregó); esperamos su evento load.
      document.querySelector<HTMLScriptElement>("script[data-paypal-sdk]")?.addEventListener("load", () =>
        setScriptReady(true),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    script.dataset.paypalSdk = "true";
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError("No se pudo cargar PayPal. Intenta de nuevo o usa WhatsApp.");
    document.body.appendChild(script);
  }, [clientId, currency, scriptReady]);

  useEffect(() => {
    if (!scriptReady || !window.paypal || !containerRef.current) return;
    containerRef.current.innerHTML = "";

    window.paypal.Buttons({
      createOrder: async () => {
        setError(null);
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const data = await res.json();
        if (!res.ok || !data.orderId) {
          setError(data.error ?? "No se pudo iniciar el pago.");
          throw new Error(data.error ?? "create-order failed");
        }
        return data.orderId as string;
      },
      onApprove: async (data) => {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          setError(result.error ?? "No se pudo confirmar el pago.");
          return;
        }
        router.refresh();
      },
      onError: () => {
        setError("Ocurrió un problema con PayPal. Intenta de nuevo o usa WhatsApp.");
      },
    }).render(containerRef.current);
  }, [scriptReady, bookingId, router]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} />
      {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
    </div>
  );
}
