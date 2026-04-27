import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { downloadAttachment } from "@/lib/integrations/gmail";

// Streaming variant of /api/extract/invoice. Same input shape; response is
// Server-Sent Events. Each `text` event carries the running raw text from
// Claude; the client tolerantly parses partial JSON to populate fields as
// they arrive. A final `done` event carries the fully parsed object.

const SYSTEM_PROMPT = `Extract invoice fields from the PDF. Return only this JSON, no prose, no code fences:
{"vendor_name":string|null,"vendor_email":string|null,"invoice_number":string|null,"issue_date":"YYYY-MM-DD"|null,"due_date":"YYYY-MM-DD"|null,"po_number":string|null,"project_ref":string|null,"subtotal":number|null,"tax":number|null,"total":number|null,"currency":string|null,"line_items":[{"description":string,"quantity":number|null,"unit_price":number|null,"amount":number|null,"project_ref":string|null}],"raw_text_snippet":string|null}
Rules: null for missing fields, never invent. project_ref = any job number, project, customer reference, property/unit/work order id (critical for construction/HVAC). Money as plain numbers. Dates as YYYY-MM-DD.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

  let body: { source?: "gmail" | "upload"; messageId?: string; attachmentId?: string; base64?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let pdfBase64: string;
  try {
    if (body.source === "gmail") {
      if (!body.messageId || !body.attachmentId) {
        throw new Error("messageId and attachmentId required for source=gmail");
      }
      const dl = await downloadAttachment(body.messageId, body.attachmentId);
      pdfBase64 = dl.base64;
    } else if (body.source === "upload") {
      if (typeof body.base64 !== "string" || body.base64.length === 0) {
        throw new Error("base64 PDF required for source=upload");
      }
      pdfBase64 = body.base64;
    } else {
      throw new Error("source must be 'gmail' or 'upload'");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send("start", { model });

      try {
        const messageStream = await client.messages.stream({
          model,
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
                },
                { type: "text", text: "Extract fields. JSON only." },
              ],
            },
          ],
        });

        let raw = "";
        for await (const chunk of messageStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            raw += chunk.delta.text;
            send("text", { raw });
          }
        }
        // Final assemble + parse.
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        try {
          const parsed = JSON.parse(cleaned);
          send("done", { extracted: parsed });
        } catch (e) {
          send("error", { error: `Failed to parse Claude response as JSON: ${(e as Error).message}` });
        }
      } catch (e) {
        send("error", { error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
