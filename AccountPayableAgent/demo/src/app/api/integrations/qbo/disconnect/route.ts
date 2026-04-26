import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/integrations/tokens";

export async function POST() {
  await clearTokens("qbo");
  return NextResponse.json({ ok: true });
}
