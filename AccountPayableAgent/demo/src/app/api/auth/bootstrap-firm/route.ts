import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { bootstrapFirmForUser } from "@/lib/auth/bootstrap";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let body: { firmName?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }

  try {
    const firm = await bootstrapFirmForUser({
      userId: user.id,
      firmName: body.firmName ?? "My firm",
    });
    return NextResponse.json({ firmId: firm.id });
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 500 });
  }
}
