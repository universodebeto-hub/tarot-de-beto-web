"use server";

import { getMessages, sendMessage, sendAudioMessage } from "@/server/messages";

/** Server Actions del chat web -- se resuelven por cookie (currentUser se omite), mismo patrón que el resto de la web. */
export async function fetchMessagesAction(bookingId: string) {
  return getMessages(bookingId);
}

export async function sendTextMessageAction(bookingId: string, text: string) {
  return sendMessage(bookingId, text);
}

export async function sendAudioMessageAction(bookingId: string, audioUrl: string, audioDurationSeconds: number) {
  return sendAudioMessage(bookingId, audioUrl, audioDurationSeconds);
}
