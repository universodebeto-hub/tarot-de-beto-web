import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getClientAdminById, setUserCreditApproval, updateClientInfoFromJson } from "@/server/admin/clients";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminFromRequest(request);
    const { id } = await params;
    const client = await getClientAdminById(id);
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminFromRequest(request);
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (typeof body?.canUseCredit === "boolean") {
      const result = await setUserCreditApproval(id, body.canUseCredit, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (typeof body?.firstName === "string" && typeof body?.email === "string") {
      const result = await updateClientInfoFromJson(
        id,
        { firstName: body.firstName, lastName: body.lastName, email: body.email, phone: body.phone, country: body.country },
        user,
      );
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
