import "server-only";
import { AccessToken } from "livekit-server-sdk";

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.NEXT_PUBLIC_LIVEKIT_URL,
  );
}

/**
 * Token de acceso a una sala de audio (Fase 11) — una sala por reserva
 * (roomName = bookingId), sólo dos participantes esperados (cliente y
 * tarotista). Nunca video: grants.canPublish limitado a lo que la UI
 * ofrece (solo micrófono, ver components/call/CallRoom.tsx), acá no se
 * fuerza a nivel de token porque LiveKit no distingue audio/video en el
 * grant de publicación — el límite real es que la UI nunca pide la cámara.
 */
export async function createCallToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
): Promise<string> {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl: "2h",
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });
  return token.toJwt();
}
