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
    // the same request. Multi-pass so routing → extraction follow-up
    // jobs also get processed in this run.
    const totals = { processed: 0, succeeded: 0, failed: 0 };
    const batchSize = polled.newMessages > 0 ? Math.max(polled.newMessages, 10) : 10;
    for (let i = 0; i < 3; i++) {
      const r = await runQueueOnce({ batchSize });
      totals.processed += r.processed;
      totals.succeeded += r.succeeded;
      totals.failed += r.failed;
      if (r.processed === 0) break;
    }
    return NextResponse.json({ ok: true, ...polled, queue: totals });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
