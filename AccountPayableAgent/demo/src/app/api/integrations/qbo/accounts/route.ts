import { NextResponse } from "next/server";
import { listAccounts } from "@/lib/integrations/qbo";

export async function GET() {
  try {
    const accounts = await listAccounts(100);
    return NextResponse.json({ accounts, count: accounts.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
