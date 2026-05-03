// GET /api/inbox?status=open|all&limit=N
//
// Returns inbox_messages for the user's currently active business. RLS
// gates this — only members of the business (or members of its firm)
// can read its rows.
//
// Used by the per-business Inbox view to show "invoices routed to this
// business." The unmatched queue (firm-level) reads via /api/firm/unmatched
// instead.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireActiveBusinessId } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let businessId: string;
  try {
    businessId = await requireActiveBusinessId();
  } catch {
    return new NextResponse("no_active_business", { status: 400 });
  }

  const url = new URL(req.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("id, from_email, from_name, subject, received_at, routing_status, routing_confidence, parsed_json, source")
    .eq("business_id", businessId)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) return new NextResponse(error.message, { status: 500 });

  const messages = (data ?? []).map((row) => {
    const parsed = (row.parsed_json ?? {}) as { snippet?: string; attachments?: Array<{ filename?: string; mimeType?: string; size?: number }> };
    return {
      id: row.id,
      fromEmail: row.from_email,
      fromName: row.from_name,
      subject: row.subject,
      receivedAt: row.received_at,
      routingStatus: row.routing_status,
      routingConfidence: row.routing_confidence,
      source: row.source,
      snippet: parsed.snippet ?? null,
      attachments: (parsed.attachments ?? []).map((a) => ({
        filename: a.filename ?? "attachment",
        mimeType: a.mimeType ?? "application/octet-stream",
        size: a.size ?? 0,
      })),
    };
  });

  return NextResponse.json({ messages });
}
