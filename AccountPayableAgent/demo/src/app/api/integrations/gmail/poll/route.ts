// Cron endpoint: polls every firm-level Gmail mailbox for new invoices,
// inserts them into inbox_messages, and enqueues routing jobs.
// Triggered every 5 minutes by Vercel Cron (see vercel.json).

import { NextRequest, NextResponse } from "next/server";
import { pollAllFirmMailboxes } from "@/lib/integrations/gmail-poll";
import { runQueueOnce } from "@/lib/queue/worker";

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
    const polled = await pollAllFirmMailboxes();
    // Drain whatever the poll just enqueued (and any older retries) in
    // the same request, so the cron is also the worker tick.
    let queue = { processed: 0, succeeded: 0, failed: 0 };
    if (polled.newMessages > 0) {
      queue = await runQueueOnce({ batchSize: Math.max(polled.newMessages, 5) });
    } else {
      // Even if no new mail, drain any stuck jobs.
      queue = await runQueueOnce({ batchSize: 10 });
    }
    return NextResponse.json({ ok: true, ...polled, queue });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
