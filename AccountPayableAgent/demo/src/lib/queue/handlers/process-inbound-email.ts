// Handler: process_inbound_email
//
// Picks up an inbox_messages row that the Gmail poller (or Push webhook)
// just inserted, runs the routing pipeline to figure out which business
// it belongs to, and updates the row.
//
// Future extension: also kicks off field extraction (vendor, amount, line
// items, project) after routing. For now we just route — extraction stays
// in the existing on-demand path.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { routeEmail, rememberSenderRoute } from "@/lib/routing/route-email";
import type { HandlerCtx, HandlerResult } from "./index";
import type { JobPayloads } from "../types";

export async function processInboundEmail(
  payload: JobPayloads["process_inbound_email"],
  ctx: HandlerCtx
): Promise<HandlerResult> {
  const admin = createSupabaseAdminClient();

  const { data: msg, error: fetchErr } = await admin
    .from("inbox_messages")
    .select("id, firm_id, from_email, subject, parsed_json, business_id, routing_status")
    .eq("id", payload.inboxMessageId)
    .maybeSingle();

  if (fetchErr) return { status: "failed", error: fetchErr.message };
  if (!msg) return { status: "failed", error: "inbox_message not found" };

  // Idempotency: if already routed by an earlier run (or manual assign),
  // mark the job done and move on.
  if (msg.business_id || msg.routing_status === "manual_assigned") {
    return { status: "done", result: { skipped: "already_routed" } };
  }

  if (!msg.from_email) {
    await markUnmatched(admin, msg.id, "missing from_email");
    return { status: "done", result: { routing: "unmatched", reason: "missing_from" } };
  }

  // The poller stored the first attachment (if any) inline in parsed_json
  // for routing. Heavy fetches stay in the worker, not the poller.
  const attachment = pickAttachmentForRouting(msg.parsed_json);

  const result = await routeEmail({
    firmId: ctx.firmId,
    fromEmail: msg.from_email,
    subject: msg.subject ?? null,
    attachment,
  });

  if (result.businessId) {
    await admin
      .from("inbox_messages")
      .update({
        business_id: result.businessId,
        routing_status: result.method === "sender_history" ? "auto_sender_history" : "auto_content_match",
        routing_confidence: result.confidence,
      })
      .eq("id", msg.id);

    // Self-training: if AI made the match, persist the (sender → business)
    // mapping in sender_routes so the next email from this vendor takes
    // the cheap Layer 1 path instead of paying for another Claude call.
    if (result.method === "ai_content_match" && msg.from_email) {
      try {
        await rememberSenderRoute({
          firmId: ctx.firmId,
          fromEmail: msg.from_email,
          businessId: result.businessId,
        });
      } catch (e) {
        console.error("[process_inbound_email] rememberSenderRoute failed:", (e as Error).message);
      }
    }
  } else {
    await markUnmatched(admin, msg.id, "no_match");
  }

  return {
    status: "done",
    result: {
      routing: result.method,
      businessId: result.businessId,
      confidence: result.confidence,
    },
  };
}

function pickAttachmentForRouting(
  parsedJson: unknown
): { base64: string; mimeType: string; filename?: string } | undefined {
  if (!parsedJson || typeof parsedJson !== "object") return undefined;
  const attachments = (parsedJson as { attachments?: Array<{ base64?: string; mimeType?: string; filename?: string }> })
    .attachments;
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
  const candidate = attachments.find((a) => a.base64 && (a.mimeType?.startsWith("application/pdf") || a.mimeType?.startsWith("image/")));
  if (!candidate?.base64 || !candidate.mimeType) return undefined;
  return { base64: candidate.base64, mimeType: candidate.mimeType, filename: candidate.filename };
}

async function markUnmatched(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  inboxMessageId: string,
  reason: string
) {
  await admin
    .from("inbox_messages")
    .update({
      business_id: null,
      routing_status: "unmatched",
      routing_confidence: 0,
    })
    .eq("id", inboxMessageId);
  // (Reason is captured by the audit log on the worker level, plus
  // logged via the job's last_error/result if it was a hard failure.)
  void reason;
}
