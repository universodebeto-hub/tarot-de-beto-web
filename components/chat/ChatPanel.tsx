"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchMessagesAction, sendTextMessageAction, sendAudioMessageAction } from "@/app/reservas/[id]/chat-actions";

interface ChatMessage {
  id: string;
  senderRole: "CLIENT" | "TAROTISTA";
  senderName: string;
  type: "TEXT" | "AUDIO";
  text: string | null;
  audioUrl: string | null;
  audioDurationSeconds: number | null;
  createdAt: Date;
}

interface ChatPanelProps {
  bookingId: string;
  /** Quién de las dos partes de la reserva está viendo el chat -- para alinear sus propios mensajes a la derecha. */
  viewerRole: "CLIENT" | "TAROTISTA";
}

const POLL_MS = 3000;

/**
 * Chat de la web (nuevo) -- consume las mismas Server Actions que envuelven
 * server/messages.ts (getMessages/sendMessage/sendAudioMessage), la misma
 * lógica que ya usa la app móvil (ChatScreen.tsx). Solo se muestra cuando
 * la reserva está CONFIRMED + PAID (ver app/reservas/[id]/page.tsx), mismo
 * criterio que la llamada.
 */
export function ChatPanel({ bookingId, viewerRole }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);

  const load = useCallback(async () => {
    const result = await fetchMessagesAction(bookingId);
    if (result.messages) setMessages(result.messages as ChatMessage[]);
  }, [bookingId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    setText("");
    const result = await sendTextMessageAction(bookingId, trimmed);
    if (result.error) setError(result.error);
    await load();
    setSending(false);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setError("No pudimos acceder al micrófono -- revisa los permisos del navegador.");
    }
  }

  async function stopRecordingAndSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setRecording(false);

    const durationSeconds = Math.round((Date.now() - recordStartRef.current) / 1000);
    const blob: Blob = await new Promise((resolve) => {
      recorder.addEventListener("stop", () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType })), {
        once: true,
      });
      recorder.stop();
    });

    if (durationSeconds < 1) return;

    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("bookingId", bookingId);
      form.set("file", blob, "nota-de-voz.webm");
      const uploadRes = await fetch("/api/uploads/voice-message", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        setError(uploadData.error ?? "No se pudo subir la nota de voz.");
        return;
      }
      const result = await sendAudioMessageAction(bookingId, uploadData.url, durationSeconds);
      if (result.error) setError(result.error);
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[420px] flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ash">Chat de la consulta</span>
        <Link href={`/reservas/${bookingId}/llamada`} className="btn btn-ghost !px-3 !py-1.5 text-xs">
          Llamar
        </Link>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="mb-0 text-center text-sm text-bone-dim">Todavía no hay mensajes -- escribe el primero.</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.senderRole === viewerRole;
            return (
              <div key={m.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    isOwn ? "bg-gold/20 text-bone" : "bg-white/10 text-bone"
                  }`}
                >
                  {m.type === "AUDIO" && m.audioUrl ? (
                    <div className="flex items-center gap-2">
                      <audio controls src={m.audioUrl} className="h-8 max-w-[220px]" />
                      {m.audioDurationSeconds ? (
                        <span className="font-mono text-[11px] text-ash">
                          {Math.floor(m.audioDurationSeconds / 60)}:
                          {String(m.audioDurationSeconds % 60).padStart(2, "0")}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    m.text
                  )}
                </div>
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-ash">{m.senderName}</span>
              </div>
            );
          })
        )}
      </div>

      {error ? <p className="mb-0 text-xs text-ember">{error}</p> : null}

      <form onSubmit={handleSendText} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
          disabled={sending || recording}
        />
        <button
          type="button"
          onClick={recording ? stopRecordingAndSend : startRecording}
          disabled={sending}
          className={`btn ${recording ? "btn-gold" : "btn-ghost"}`}
          aria-label={recording ? "Detener y enviar nota de voz" : "Grabar nota de voz"}
        >
          {recording ? "Detener" : "🎤"}
        </button>
        <button type="submit" disabled={sending || recording || !text.trim()} className="btn btn-gold">
          Enviar
        </button>
      </form>
    </div>
  );
}
