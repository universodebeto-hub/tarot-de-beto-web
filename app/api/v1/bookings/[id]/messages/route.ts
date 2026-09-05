import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { getMessages, sendMessage, sendAudioMessage } from "@/server/messages";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserFromRequest(request);
  const result = await getMessages(id, user);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ messages: result.messages });
}

/** Body: { text } para texto, o { type: "AUDIO", audioUrl, audioDurationSeconds } para una nota de voz. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserFromRequest(request);
  const body = await request.json().catch(() => null);

  const result =
    body?.type === "AUDIO"
      ? await sendAudioMessage(id, String(body?.audioUrl ?? ""), Number(body?.audioDurationSeconds ?? 0), user)
      : await sendMessage(id, String(body?.text ?? ""), user);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
