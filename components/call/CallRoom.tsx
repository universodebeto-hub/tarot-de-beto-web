"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication } from "livekit-client";

interface CallRoomProps {
  bookingId: string;
  /** Minutos pagados del servicio -- una vez transcurridos, la llamada se corta sola (salvo creditExempt). */
  durationMinutes: number;
  /** true solo para reservas pagadas con "Créditos Beto" (ver server/credit.ts) -- a esas cuentas no se les corta la llamada por tiempo. */
  creditExempt: boolean;
  /** true si el cliente pagó el recargo de videollamada (Booking.videoRequested) -- la cámara se prende sola al conectar en vez de esperar a que alguien toque el botón. */
  videoRequested: boolean;
}

type CallState = "connecting" | "waiting" | "connected" | "ended" | "error";

function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Verde/dorado con tiempo de sobra, ámbar bajo 5 min, rojo bajo 1 min o en tiempo extra. */
function timerColorClass(durationMinutes: number, elapsedSeconds: number): string {
  const remaining = durationMinutes * 60 - elapsedSeconds;
  if (remaining <= 60) return "text-ember";
  if (remaining <= 300) return "text-gold";
  return "text-gold-soft";
}

/**
 * Llamada en vivo (Fase 11) — audio siempre activo; el video es opcional,
 * cada persona lo prende cuando quiere con el botón de cámara (algunos
 * clientes prefieren atenderse por video, ver pedido del usuario). Un
 * token nuevo por sesión (fetch a /api/calls/[bookingId]/token, que valida
 * del lado del servidor que esta cuenta puede entrar a ESTA reserva antes
 * de emitirlo — ver server/calls.ts). Sala = bookingId, siempre 2
 * participantes esperados (cliente y tarotista).
 */
export function CallRoom({ bookingId, durationMinutes, creditExempt, videoRequested }: CallRoomProps) {
  const [state, setState] = useState<CallState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [otherPartyName, setOtherPartyName] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraWarning, setCameraWarning] = useState<string | null>(null);
  const [remoteVideoOn, setRemoteVideoOn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  /** Segundos ya contados en tramos "connected" previos -- para que el reloj no salte hacia atrás si hay un corte y reconexión breve. */
  const accumulatedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.ParticipantConnected, () => {
      setState("connected");
      // Recién ahora la otra persona realmente entró -- antes de esto no
      // cuenta como minutos consumidos (ver server/calls.ts::markCallConnected).
      fetch(`/api/calls/${bookingId}/connected`, { method: "POST" }).catch(() => {});
    });
    room.on(RoomEvent.ParticipantDisconnected, () => setState("waiting"));
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setState("ended");
    });
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio && audioContainerRef.current) {
        const el = track.attach();
        audioContainerRef.current.appendChild(el);
      }
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        remoteVideoRef.current.innerHTML = "";
        const el = track.attach();
        el.className = "h-full w-full rounded-xl object-cover";
        remoteVideoRef.current.appendChild(el);
        setRemoteVideoOn(true);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub: RemoteTrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        track.detach().forEach((el) => el.remove());
        setRemoteVideoOn(false);
      }
    });

    async function join() {
      let data: { token?: string; url?: string; otherPartyName?: string; error?: string };
      try {
        const res = await fetch(`/api/calls/${bookingId}/token`);
        data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.token) {
          setError(data.error ?? "No se pudo iniciar la llamada.");
          setState("error");
          return;
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo iniciar la llamada. Revisa tu conexión.");
          setState("error");
        }
        return;
      }

      setOtherPartyName(data.otherPartyName ?? null);

      try {
        await room.connect(data.url!, data.token!);
      } catch {
        if (!cancelled) {
          setError("No se pudo conectar a la sala de la llamada.");
          setState("error");
        }
        return;
      }
      if (cancelled) return;

      // El micrófono se activa aparte: si el navegador niega el permiso, la
      // persona igual queda conectada y puede escuchar (y reintentar con el
      // botón de silenciar/activar) en vez de que toda la llamada se caiga
      // por un permiso, que es un fallo distinto a no poder conectar.
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        if (!cancelled) {
          setMuted(true);
          setMicWarning("No pudimos activar tu micrófono — revisa los permisos del navegador.");
        }
      }

      if (videoRequested) {
        try {
          await room.localParticipant.setCameraEnabled(true);
          if (!cancelled) setCameraOn(true);
        } catch {
          if (!cancelled) {
            setCameraWarning("No pudimos activar tu cámara automáticamente — revisa los permisos del navegador.");
          }
        }
      }

      if (!cancelled) {
        const alreadyThere = room.remoteParticipants.size > 0;
        setState(alreadyThere ? "connected" : "waiting");
        // La otra persona ya estaba en la sala antes de que nos uniéramos --
        // el evento ParticipantConnected no dispara para alguien que ya
        // estaba ahí, así que hay que marcarlo acá también.
        if (alreadyThere) fetch(`/api/calls/${bookingId}/connected`, { method: "POST" }).catch(() => {});
      }
    }
    void join();

    return () => {
      cancelled = true;
      room.disconnect();
      // keepalive: el fetch debe salir aunque el componente ya se esté desmontando (navegación fuera de la página).
      fetch(`/api/calls/${bookingId}/end`, { method: "POST", keepalive: true }).catch(() => {});
    };
  }, [bookingId, videoRequested]);

  useEffect(() => {
    if (state !== "connected") return;
    const segmentStart = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(accumulatedRef.current + Math.floor((Date.now() - segmentStart) / 1000));
    }, 1000);
    return () => {
      clearInterval(interval);
      accumulatedRef.current += Math.floor((Date.now() - segmentStart) / 1000);
    };
  }, [state]);

  // Corte automático al llegar al tiempo pagado -- salvo Créditos Beto (ver
  // creditExempt). Del lado del cliente, igual que el resto del contador --
  // no reemplaza una validación de servidor, pero cubre el caso real pedido.
  useEffect(() => {
    if (creditExempt || state !== "connected") return;
    if (elapsedSeconds >= durationMinutes * 60) hangUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hangUp se redefine cada render (usa roomRef/fetch, no estado), agregarlo re-dispararía el efecto sin cambiar el comportamiento.
  }, [creditExempt, state, elapsedSeconds, durationMinutes]);

  function toggleMute() {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    void room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room) return;
    const next = !cameraOn;
    setCameraWarning(null);
    try {
      await room.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
    } catch {
      setCameraWarning("No pudimos activar tu cámara — revisa los permisos del navegador.");
    }
  }

  // Adjunta el video local al <div> recién montado -- separado de
  // toggleCamera/el auto-encendido de más arriba porque el <div> (dentro de
  // showVideoArea) todavía no existe en el DOM en el mismo tick en que se
  // pide la cámara, solo después de que este efecto corre tras el render.
  useEffect(() => {
    const room = roomRef.current;
    if (!cameraOn || !room || !localVideoRef.current) return;
    localVideoRef.current.innerHTML = "";
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = pub?.videoTrack;
    if (track) {
      const el = track.attach();
      el.className = "h-full w-full rounded-xl object-cover";
      el.muted = true;
      localVideoRef.current.appendChild(el);
    }
    return () => {
      if (localVideoRef.current) localVideoRef.current.innerHTML = "";
    };
  }, [cameraOn]);

  function hangUp() {
    roomRef.current?.disconnect();
    setState("ended");
    fetch(`/api/calls/${bookingId}/end`, { method: "POST", keepalive: true }).catch(() => {});
  }

  const showVideoArea = cameraOn || remoteVideoOn;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />

      {showVideoArea ? (
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-carbon-2">
            <div ref={remoteVideoRef} className="h-full w-full" />
            {!remoteVideoOn ? (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-bone-dim">
                {otherPartyName ?? "La otra persona"} sin cámara
              </span>
            ) : null}
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-carbon-2">
            <div ref={localVideoRef} className="h-full w-full" />
            {!cameraOn ? (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-bone-dim">Tu cámara</span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-br from-carbon-2 to-obsidian shadow-[0_0_30px_rgba(232,163,61,0.15)]">
          <span className="font-display text-2xl text-gold-soft">
            {otherPartyName ? otherPartyName[0]?.toUpperCase() : "…"}
          </span>
        </div>
      )}

      {state === "connecting" ? <p className="mb-0 text-bone-dim">Conectando...</p> : null}
      {state === "waiting" ? (
        <p className="mb-0 text-bone-dim">
          {otherPartyName ? `Esperando a que ${otherPartyName} se una...` : "Esperando a la otra persona..."}
        </p>
      ) : null}
      {state === "connected" ? (
        <p className="mb-0 text-gold-soft">En llamada con {otherPartyName ?? "la otra persona"}</p>
      ) : null}

      {state === "connected" ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className={`font-display text-3xl font-bold tabular-nums ${timerColorClass(durationMinutes, elapsedSeconds)}`}>
            {formatClock(elapsedSeconds)}
          </span>
          <span className="text-xs text-bone-dim">
            {creditExempt
              ? "Consulta a crédito -- sin corte por tiempo"
              : durationMinutes * 60 - elapsedSeconds >= 0
                ? `Quedan ${formatClock(durationMinutes * 60 - elapsedSeconds)} de ${durationMinutes} min`
                : `${formatClock(elapsedSeconds - durationMinutes * 60)} fuera de tiempo`}
          </span>
        </div>
      ) : null}
      {state === "ended" ? <p className="mb-0 text-bone-dim">Llamada finalizada.</p> : null}
      {state === "error" ? <p className="mb-0 text-ember">{error}</p> : null}
      {micWarning ? <p className="mb-0 text-xs text-ember">{micWarning}</p> : null}
      {cameraWarning ? <p className="mb-0 text-xs text-ember">{cameraWarning}</p> : null}

      {state === "connecting" || state === "waiting" || state === "connected" ? (
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={toggleMute} className="btn btn-ghost">
            {muted ? "Activar micrófono" : "Silenciar"}
          </button>
          <button type="button" onClick={toggleCamera} className="btn btn-ghost">
            {cameraOn ? "Apagar cámara" : "Activar cámara"}
          </button>
          <button type="button" onClick={hangUp} className="btn btn-gold">
            Colgar
          </button>
        </div>
      ) : null}
    </div>
  );
}
