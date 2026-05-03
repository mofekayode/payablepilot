// Cron endpoint: drains a batch of pending jobs.
// Triggered every minute by Vercel Cron (see vercel.json).
//
// Auth: requires the QUEUE_RUN_SECRET to be passed as either an
// `Authorization: Bearer <secret>` header or `?secret=...` query string.
// Vercel Cron sends a `Authorization: Bearer <CRON_SECRET>` header by
// default if you set CRON_SECRET; we accept that name too for convenience.

import { NextRequest, NextResponse } from "next/server";
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
    const result = await runQueueOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
