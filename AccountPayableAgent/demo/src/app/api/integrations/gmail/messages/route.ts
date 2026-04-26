import { NextRequest, NextResponse } from "next/server";
import { listInvoiceMessages } from "@/lib/integrations/gmail";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const days = Number(url.searchParams.get("days") ?? "30");
    const max = Number(url.searchParams.get("max") ?? "25");
    const messages = await listInvoiceMessages({ maxResults: max, days, query: q });
    return NextResponse.json({ messages, count: messages.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
