import { NextResponse } from "next/server";
import { listInvoiceMessages } from "@/lib/integrations/gmail";

export async function GET() {
  try {
    const messages = await listInvoiceMessages(25);
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
