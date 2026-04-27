import { NextResponse } from "next/server";

// Lightweight probe used by the diagnostics page. Does NOT call Anthropic —
// real verification happens when the user actually runs an extraction.
export async function GET() {
  const configured = !!process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
  if (!configured) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured." }, { status: 500 });
  }
  return NextResponse.json({ configured: true, model });
}
