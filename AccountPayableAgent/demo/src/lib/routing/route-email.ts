// Route an inbound email to the correct business within a firm.
//
// Layered, highest-confidence first. Each layer either returns a result or
// falls through. The final fallback is "unmatched" — the message lands in
// the firm-level Unmatched inbox where the bookkeeper one-clicks to assign,
// which trains the sender_routes table for next time.
//
// Layer 1 — sender_routes lookup. ~95% confidence. If we've routed this
//   from_email before for this firm, use the same business.
// Layer 2 — AI content match. Claude reads the invoice + the firm's
//   businesses (legal_name, dba, ein, addresses) and returns the best
//   match with confidence. Threshold: 0.7 to auto-route.
// Layer 3 (future) — vendor cross-reference: if the sender's domain
//   matches exactly one business's QBO vendor list, that's the business.
//
// Returns a result regardless — `businessId: null` means "send to
// unmatched queue."

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryAiMatch } from "./ai-match";

export type RoutingMethod =
  | "sender_history"
  | "ai_content_match"
  | "vendor_cross_ref"
  | "unmatched";

export type RoutingResult = {
  businessId: string | null;
  confidence: number;
  method: RoutingMethod;
  details?: Record<string, unknown>;
};

export type RouteInput = {
  firmId: string;
  fromEmail: string;
  subject?: string | null;
  // For AI content match. PDF or image attachment.
  attachment?: {
    base64: string;
    mimeType: string;
    filename?: string;
  };
};

export async function routeEmail(input: RouteInput): Promise<RoutingResult> {
  const senderRoute = await tryRouteBySenderHistory(input.firmId, input.fromEmail);
  if (senderRoute) return senderRoute;

  if (input.attachment) {
    const aiMatch = await tryRouteByAiContentMatch(input);
    if (aiMatch) return aiMatch;
  }

  return { businessId: null, confidence: 0, method: "unmatched" };
}

// ---------------- Layer 1: sender_routes ----------------

async function tryRouteBySenderHistory(
  firmId: string,
  fromEmail: string
): Promise<RoutingResult | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("sender_routes")
    .select("business_id, hit_count")
    .eq("firm_id", firmId)
    .eq("from_email", fromEmail.toLowerCase())
    .maybeSingle();
  if (!data) return null;

  // Bump the hit count to keep it warm.
  await admin
    .from("sender_routes")
    .update({ hit_count: (data.hit_count ?? 1) + 1, updated_at: new Date().toISOString() })
    .eq("firm_id", firmId)
    .eq("from_email", fromEmail.toLowerCase());

  return {
    businessId: data.business_id,
    confidence: 0.95,
    method: "sender_history",
    details: { fromEmail },
  };
}

// Records a manual assignment so future invoices from the same sender
// auto-route. Called from the unmatched-queue UI when the bookkeeper picks
// a business for an unrouted email.
export async function rememberSenderRoute(opts: {
  firmId: string;
  fromEmail: string;
  businessId: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("sender_routes")
    .upsert(
      {
        firm_id: opts.firmId,
        from_email: opts.fromEmail.toLowerCase(),
        business_id: opts.businessId,
        hit_count: 1,
      },
      { onConflict: "firm_id,from_email" }
    );
}

// ---------------- Layer 2: AI content match ----------------

// Implementation in ./ai-match.ts. Calls Claude with the PDF + the firm's
// businesses as candidates and asks it to identify which business the
// invoice is billed to. Gated at confidence >= 0.7 to avoid bad routing.
async function tryRouteByAiContentMatch(
  input: RouteInput
): Promise<RoutingResult | null> {
  if (!input.attachment) return null;
  const match = await tryAiMatch({ firmId: input.firmId, attachment: input.attachment });
  if (!match) return null;
  return {
    businessId: match.businessId,
    confidence: match.confidence,
    method: "ai_content_match",
    details: { reasoning: match.reasoning },
  };
}
