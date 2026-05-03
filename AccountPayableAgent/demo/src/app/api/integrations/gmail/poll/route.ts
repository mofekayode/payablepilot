// Cron endpoint: polls every firm-level Gmail mailbox for new invoices,
// inserts them into inbox_messages, and enqueues routing jobs.
// Triggered every 5 minutes by Vercel Cron (see vercel.json).

import { NextRequest, NextResponse } from "next/server";
import { pollAllFirmMailboxes } from "@/lib/integrations/gmail-poll";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.QUEUE_RUN_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) return new NextResponse("unauthorized", { status: 401 });
  try {
    const result = await pollAllFirmMailboxes();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
