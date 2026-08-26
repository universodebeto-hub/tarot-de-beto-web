"use client";

import { useRef, useState } from "react";
import { setOwnStatusFormAction } from "@/app/panel-tarotista/actions";
import type { TarotistaStatus } from "@prisma/client";

interface PanelClientToolsProps {
  vapidPublicKey: string | null;
}

// Web Speech API no tiene tipos oficiales en TS/DOM lib todavía.
interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
  resultIndex: number;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

/**
 * Fase 9 (notificaciones push) + Fase 10 (comandos de voz), ambas sin
 * proveedor externo -- Web Push estándar (VAPID propio, ver
 * server/push-notifications.ts) y Web Speech API nativa del navegador
 * (gratis, sin servidor de reconocimiento; Chrome/Android la soportan
 * bien, Safari/iOS todavía no -- el botón desaparece solo si el navegador
 * no la trae, nunca rompe nada).
 *
 * Los comandos de voz reutilizan el MISMO server action que ya usan los
 * botones grandes del panel (setOwnStatusFormAction) -- ninguna lógica
 * nueva de cambio de estado, solo un disparador más.
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer;
}

const VOICE_COMMANDS: { phrase: string; status: TarotistaStatus }[] = [
  { phrase: "estoy disponible", status: "DISPONIBLE" },
  { phrase: "estoy en consulta", status: "EN_CONSULTA" },
  { phrase: "estoy en reposo", status: "EN_REPOSO" },
  { phrase: "me desconecto", status: "DESCONECTADO" },
];

function detectSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }
  ).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
}

export function PanelClientTools({ vapidPublicKey }: PanelClientToolsProps) {
  const [pushSupported] = useState(
    () => typeof window !== "undefined" && Boolean(vapidPublicKey) && "serviceWorker" in navigator && "PushManager" in window,
  );
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const [voiceSupported] = useState(() => Boolean(detectSpeechRecognition()));
  const [voiceListening, setVoiceListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  async function enablePush() {
    if (!vapidPublicKey) return;
    setPushError(null);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError("Necesitas permitir notificaciones para activarlas.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      if (!res.ok) {
        setPushError("No se pudo activar la notificación en el servidor.");
        return;
      }
      setPushEnabled(true);
    } catch {
      setPushError("No se pudo activar las notificaciones en este dispositivo.");
    }
  }

  function toggleVoice() {
    if (voiceListening) {
      recognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }

    const SpeechRecognitionCtor = detectSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "es-ES";
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim().toLowerCase();
      if (!transcript) return;
      setLastCommand(transcript);
      const match = VOICE_COMMANDS.find((c) => transcript.includes(c.phrase));
      if (match) {
        void setOwnStatusFormAction(match.status);
      }
    };
    recognition.onerror = () => setVoiceListening(false);
    recognition.onend = () => setVoiceListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setVoiceListening(true);
  }

  if (!pushSupported && !voiceSupported) return null;

  return (
    <div className="mb-8 flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {pushSupported ? (
          <button
            type="button"
            onClick={enablePush}
            disabled={pushEnabled}
            className="btn btn-ghost disabled:opacity-60"
          >
            {pushEnabled ? "Notificaciones activadas" : "Activar notificaciones"}
          </button>
        ) : null}
        {voiceSupported ? (
          <button type="button" onClick={toggleVoice} className="btn btn-ghost">
            {voiceListening ? "Detener comandos de voz" : "Activar comandos de voz"}
          </button>
        ) : null}
      </div>
      {pushError ? <p className="mb-0 text-xs text-ember">{pushError}</p> : null}
      {voiceListening ? (
        <p className="mb-0 text-xs text-gold-soft">
          Escuchando — di &quot;estoy disponible&quot;, &quot;estoy en consulta&quot;, &quot;estoy en
          reposo&quot; o &quot;me desconecto&quot;.
        </p>
      ) : null}
      {lastCommand ? <p className="mb-0 text-xs text-ash">Último escuchado: &quot;{lastCommand}&quot;</p> : null}
    </div>
  );
}
