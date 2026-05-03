// AI content match — Layer 2 of the routing pipeline.
//
// Given an invoice attachment + the firm's businesses, ask Claude to
// identify which business the invoice is billed to. The model sees the
// PDF directly (or an image) and a compact candidate list with the
// signals we have on file (name, legal_name, dba, ein, addresses).
//
// Returns null when there's no usable match. The worker treats null as
// "fall through to unmatched."

import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AiMatchInput = {
  firmId: string;
  attachment: { base64: string; mimeType: string; filename?: string };
};

export type AiMatchResult = {
  businessId: string;
  confidence: number;
  reasoning: string;
};

type Candidate = {
  id: string;
  name: string;
  legal_name: string | null;
  dba: string | null;
  ein: string | null;
  addresses: unknown;
};

// Confidence threshold below which we reject the model's pick and let
// the message fall through to the unmatched queue. Tuned conservatively
// — false positives (wrong client gets billed) are far worse than false
// negatives (one extra click to manually assign).
const MIN_CONFIDENCE = 0.7;

// Instruction string. Returns ONLY a JSON object the parser can rely on.
const SYSTEM_PROMPT = `You are an accounts-payable routing assistant.

You will see one invoice document and a numbered list of candidate businesses (each with name, legal_name, dba, ein, and addresses where known). Your job is to identify which candidate the invoice is *billed to* — not the vendor sending it.

Return ONLY this JSON, no prose, no code fences:
{"match_index": <0-based index of the best candidate, or null if none plausibly match>, "confidence": <number 0..1>, "reasoning": "<one short sentence>"}

Rules:
- Look at the "Bill To", "Customer", "Sold To" or equivalent block on the invoice.
- A high-confidence match = exact or near-exact name, OR matching EIN, OR matching billing address.
- A low-confidence match = partial name overlap with no other corroborating signal.
- If two candidates look equally likely, return null with confidence 0 — don't guess.
- Never invent EINs, addresses, or names not visible in the document.`;

export async function tryAiMatch(input: AiMatchInput): Promise<AiMatchResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const candidates = await loadCandidates(input.firmId);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    // With only one business in the firm, routing is trivial. Skip the
    // Claude call and return high confidence directly.
    return {
      businessId: candidates[0].id,
      confidence: 0.99,
      reasoning: "Only one business in the firm — assigned by default.",
    };
  }

  const candidatesText = renderCandidates(candidates);
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
  const client = new Anthropic({ apiKey });

  let raw: string;
  try {
    const docPart = buildDocumentPart(input.attachment);
    if (!docPart) return null;
    const message = await client.messages.create({
      model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            docPart,
            {
              type: "text",
              text: `Candidate businesses:\n${candidatesText}\n\nReturn the JSON described in the system prompt.`,
            },
          ],
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    raw = textBlock.text.trim();
  } catch (e) {
    console.error("[ai-match] Claude call failed:", (e as Error).message);
    return null;
  }

  const parsed = parseResponse(raw);
  if (!parsed) return null;

  if (
    parsed.match_index === null ||
    parsed.match_index < 0 ||
    parsed.match_index >= candidates.length
  ) {
    return null;
  }
  if (parsed.confidence < MIN_CONFIDENCE) return null;

  return {
    businessId: candidates[parsed.match_index].id,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning ?? "",
  };
}

async function loadCandidates(firmId: string): Promise<Candidate[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("id, name, legal_name, dba, ein, addresses")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Candidate[];
}

function renderCandidates(candidates: Candidate[]): string {
  return candidates
    .map((c, i) => {
      const lines: string[] = [`${i}. name=${JSON.stringify(c.name)}`];
      if (c.legal_name) lines.push(`   legal_name=${JSON.stringify(c.legal_name)}`);
      if (c.dba) lines.push(`   dba=${JSON.stringify(c.dba)}`);
      if (c.ein) lines.push(`   ein=${JSON.stringify(c.ein)}`);
      const addrs = Array.isArray(c.addresses) ? c.addresses : [];
      if (addrs.length > 0) {
        lines.push(`   addresses=${JSON.stringify(addrs)}`);
      }
      return lines.join("\n");
    })
    .join("\n");
}

function buildDocumentPart(attachment: AiMatchInput["attachment"]) {
  const mt = attachment.mimeType.toLowerCase();
  if (mt === "application/pdf") {
    return {
      type: "document" as const,
      source: { type: "base64" as const, media_type: "application/pdf" as const, data: attachment.base64 },
    };
  }
  if (mt.startsWith("image/")) {
    const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    type SupportedImage = (typeof supported)[number];
    if (!(supported as readonly string[]).includes(mt)) return null;
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: mt as SupportedImage, data: attachment.base64 },
    };
  }
  return null;
}

function parseResponse(raw: string): {
  match_index: number | null;
  confidence: number;
  reasoning: string | null;
} | null {
  // Strip code fences if Claude added them.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const idx = obj.match_index;
    const conf = obj.confidence;
    const reason = obj.reasoning;
    return {
      match_index: idx === null || idx === undefined ? null : Number(idx),
      confidence: typeof conf === "number" ? conf : Number(conf ?? 0),
      reasoning: typeof reason === "string" ? reason : null,
    };
  } catch (e) {
    console.warn("[ai-match] could not parse model output:", (e as Error).message, raw.slice(0, 200));
    return null;
  }
}
