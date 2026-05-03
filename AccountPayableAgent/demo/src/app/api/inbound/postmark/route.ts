// Postmark Inbound webhook.
// Configure in Postmark: Inbound stream → set webhook URL to
//   https://app.payablepilot.com/api/inbound/postmark
// and set the basic-auth user/pass to match POSTMARK_INBOUND_SECRET below.
//
// v1 routing: match by inbox alias in the To address (inbox+<alias>@…).
// v2: fall back to sender_routes (learned from past assignments) and AI
// content match against business legal_name/dba/EIN.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inboundDomain } from "@/lib/businesses/alias";

type PostmarkInbound = {
  MessageID: string;
  From: string;
  FromName?: string;
  To: string;
  ToFull?: Array<{ Email: string }>;
  Subject?: string;
  Date?: string;
  TextBody?: string;
  HtmlBody?: string;
  Attachments?: Array<{
    Name: string;
    ContentType: string;
    Content: string; // base64
    ContentLength: number;
  }>;
};

function unauthorized() {
  return new NextResponse("unauthorized", { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.POSTMARK_INBOUND_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
    const [, pass = ""] = decoded.split(":");
    return pass === expected;
  }
  // Allow `?secret=` query for ease of local testing only.
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(req.url);
    return url.searchParams.get("secret") === expected;
  }
  return false;
}

// Pulls the alias out of `inbox+<alias>@<inboundDomain>`. Returns null if the
// To address isn't in our inbound space.
function extractAlias(toAddresses: string[]): string | null {
  const domain = inboundDomain().toLowerCase();
  for (const to of toAddresses) {
    const lower = to.toLowerCase().trim();
    const match = lower.match(/^inbox\+([a-z0-9]+)@(.+)$/);
    if (!match) continue;
    if (match[2] !== domain) continue;
    return match[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let payload: PostmarkInbound;
  try {
    payload = (await req.json()) as PostmarkInbound;
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }

  const toList = payload.ToFull?.map((t) => t.Email) ?? (payload.To ? [payload.To] : []);
  const alias = extractAlias(toList);

  const admin = createSupabaseAdminClient();

  let businessId: string | null = null;
  let firmId: string | null = null;
  let routingStatus = "unmatched";

  if (alias) {
    const { data: biz } = await admin
      .from("businesses")
      .select("id, firm_id")
      .eq("inbox_alias", alias)
      .maybeSingle();
    if (biz) {
      businessId = biz.id;
      firmId = biz.firm_id;
      routingStatus = "auto_alias";
    }
  }

  // If no alias match, try sender_routes (any firm that has previously
  // mapped this sender). This is rough — multiple firms could have a row
  // for the same address — but in practice firms have disjoint vendors.
  if (!businessId) {
    const { data: route } = await admin
      .from("sender_routes")
      .select("firm_id, business_id")
      .eq("from_email", payload.From.toLowerCase())
      .order("hit_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (route) {
      businessId = route.business_id;
      firmId = route.firm_id;
      routingStatus = "auto_sender_history";
    }
  }

  // TODO(v2): store the raw MIME in Supabase Storage and run AI content
  // match against the firm's businesses (legal_name, dba, EIN, addresses).

  const { data: inserted, error } = await admin
    .from("inbox_messages")
    .insert({
      business_id: businessId,
      firm_id: firmId,
      source: "postmark",
      message_id: payload.MessageID,
      from_email: payload.From,
      from_name: payload.FromName ?? null,
      to_email: toList[0] ?? null,
      subject: payload.Subject ?? null,
      received_at: payload.Date ? new Date(payload.Date).toISOString() : new Date().toISOString(),
      parsed_json: {
        text: payload.TextBody ?? null,
        html: payload.HtmlBody ?? null,
        attachments: (payload.Attachments ?? []).map((a) => ({
          name: a.Name,
          contentType: a.ContentType,
          size: a.ContentLength,
        })),
      },
      routing_status: routingStatus,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[postmark] insert failed:", error);
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted?.id, routing: routingStatus });
}
